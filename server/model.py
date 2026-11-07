"""Predict where parking enforcement will be, from user reports stored in a SQL database.

    python model.py train                                  # load reports, train, save the model
    python model.py predict 2026-11-10T10:30               # chance of a vehicle at every lot
    python model.py predict 2026-11-10T10:30 utah-surface-002

Expects a table of reports with one row per report:
    reported_at  timestamp (campus local time)
    lot_id       the lot's node_id from data/parking/parking_nodes.csv
    present      true = "enforcement vehicle here", false = "checked, nobody here"

Several vehicles can be out at once, so the model answers, for each lot separately:
"is ANY enforcement vehicle at this lot at this time?"
"""
import os
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import brier_score_loss, roc_auc_score
from sqlalchemy import create_engine

MODEL_PATH = os.environ.get("MODEL_PATH", "model.joblib")
REPORTS_QUERY = "SELECT reported_at, lot_id, present FROM reports"

ROTATION_EPOCH = pd.Timestamp("2026-01-05")   # a Monday; weeks of the rotation are counted from here
CYCLE_CANDIDATES = [1, 2, 3, 4, 5, 6]         # schedule repeats every N weeks; 1 = no rotation
CYCLE_TOLERANCE = 0.005                       # prefer a shorter cycle unless a longer one is clearly better
BUCKET = "15min"                              # reports at the same lot within 15 minutes count once
HOLDOUT_DAYS = 14                             # most recent days, held back to test the model
HALF_LIFE_WEEKS = 12                          # recent data counts more


# ---------- 1. Get the data from SQL ----------

def load_reports():
    engine = create_engine(os.environ["DATABASE_URL"])
    df = pd.read_sql(REPORTS_QUERY, engine, parse_dates=["reported_at"])
    df["present"] = df.present.astype(bool)
    return df


def make_examples(reports):
    """One example per (lot, 15-minute window): present if anyone saw a vehicle there in that window."""
    reports = reports.assign(bucket=reports.reported_at.dt.floor(BUCKET))
    ex = reports.groupby(["lot_id", "bucket"], as_index=False).present.max()
    ex["time"] = ex.bucket + pd.Timedelta(BUCKET) / 2
    return ex


# ---------- 2. Model inputs ----------

def features(lot_ids, times, lot_codes, cycle_weeks):
    times = pd.Series(pd.to_datetime(times)).reset_index(drop=True)
    hour = times.dt.hour + times.dt.minute / 60
    dow = times.dt.dayofweek
    return pd.DataFrame({
        "lot": pd.Series(lot_ids).map(lot_codes).to_numpy(dtype=float),   # unknown lot -> missing
        "hour_sin": np.sin(2 * np.pi * hour / 24),                          # 11 PM sits next to midnight
        "hour_cos": np.cos(2 * np.pi * hour / 24),
        "dow": dow,
        "week_hour": dow * 24 + hour,
        "rotation_week": ((times - ROTATION_EPOCH).dt.days // 7) % cycle_weeks,
    })


def fit(ex, lot_codes, cycle_weeks):
    model = HistGradientBoostingClassifier(
        categorical_features=["lot", "dow", "rotation_week"],
        max_iter=600, learning_rate=0.05, max_leaf_nodes=63,
        l2_regularization=1.0, early_stopping=False, random_state=0,
    )
    age_weeks = (ex.time.max() - ex.time).dt.days / 7
    model.fit(features(ex.lot_id, ex.time, lot_codes, cycle_weeks), ex.present.astype(int),
              sample_weight=0.5 ** (age_weeks / HALF_LIFE_WEEKS))
    return model


# ---------- 3. Train ----------
# This chooses the best matching cycle
def choose_cycle(ex, lot_codes):
    """Train on older data, test on the last HOLDOUT_DAYS for each candidate cycle length,
    print the results next to a simple baseline, and return the cycle length that predicts best."""
    cutoff = ex.time.max() - pd.Timedelta(days=HOLDOUT_DAYS)
    train, test = ex[ex.time < cutoff], ex[ex.time >= cutoff]
    if train.present.nunique() < 2 or test.present.nunique() < 2:
        print("Not enough data yet to test cycle lengths; assuming no rotation.")
        return 1

    # a cycle can only be learned if the training data covers it at least twice
    train_weeks = (train.time.max() - train.time.min()).days / 7
    candidates = [c for c in CYCLE_CANDIDATES if c == 1 or train_weeks >= 2 * c]

    print(f"Test on last {HOLDOUT_DAYS} days ({len(test)} examples):")
    scores = {}
    for c in candidates:
        p = fit(train, lot_codes, c).predict_proba(features(test.lot_id, test.time, lot_codes, c))[:, 1]
        scores[c] = brier_score_loss(test.present, p)
        label = "no rotation" if c == 1 else f"{c}-week cycle"
        print(f"  {label:14s} AUC {roc_auc_score(test.present, p):.3f}   Brier {scores[c]:.4f}")

    # baseline: how often a vehicle was present at that lot in that hour of the week
    week_hour = lambda t: t.dt.dayofweek * 24 + t.dt.hour
    rate = train.groupby([train.lot_id, week_hour(train.time)]).present.mean()
    base = pd.Series(list(zip(test.lot_id, week_hour(test.time)))).map(rate) \
             .fillna(train.present.mean()).to_numpy()
    print(f"  {'baseline':14s} AUC {roc_auc_score(test.present, base):.3f}   "
          f"Brier {brier_score_loss(test.present, base):.4f}")

    # shortest cycle that is within CYCLE_TOLERANCE of the best score (guards against picking noise)
    best = min(scores.values())
    return min(c for c, s in scores.items() if s <= best * (1 + CYCLE_TOLERANCE))

# This trains the model based on the chosen cycle
def train():
    ex = make_examples(load_reports())
    if ex.present.nunique() < 2:
        raise SystemExit("Need both 'vehicle here' and 'checked, nobody here' reports to train.")
    lot_codes = {lot: i for i, lot in enumerate(sorted(ex.lot_id.unique()))}
    cycle = choose_cycle(ex, lot_codes)
    print("Chosen:", "no rotation" if cycle == 1 else f"schedule repeats every {cycle} weeks")
    bundle = {"model": fit(ex, lot_codes, cycle), "lot_codes": lot_codes, "cycle_weeks": cycle}
    joblib.dump(bundle, MODEL_PATH + ".tmp")
    os.replace(MODEL_PATH + ".tmp", MODEL_PATH)   # swap in the new model in one step
    print(f"Saved model for {len(lot_codes)} lots to {MODEL_PATH}")


# ---------- 4. Run the model ----------
# This returns a dictionary with the lot names as a key, and the likelihood of a vehicle being there as the value 
def predict(time, lot_ids=None):
    """{lot_id: chance that some enforcement vehicle is there}, most likely first."""
    bundle = joblib.load(MODEL_PATH)
    lot_codes = bundle["lot_codes"]
    lot_ids = [l for l in (lot_ids or lot_codes) if l in lot_codes]
    probs = bundle["model"].predict_proba(
        features(lot_ids, [pd.Timestamp(time)] * len(lot_ids), lot_codes, bundle["cycle_weeks"]))[:, 1]
    return dict(sorted(zip(lot_ids, probs.round(4).tolist()), key=lambda x: -x[1]))


if __name__ == "__main__":
    if sys.argv[1:2] == ["train"]:
        train()
    elif sys.argv[1:2] == ["predict"] and len(sys.argv) >= 3:
        for lot, p in predict(sys.argv[2], sys.argv[3:] or None).items():
            print(f"{lot:24s} {p:.1%}")
    else:
        print(__doc__)
