"""Predict where parking enforcement will be spotted, from user spotting reports in SQL.

    python model.py train                                  # load spottings, train, save the model
    python model.py predict 2026-11-10T17:30Z              # score for every lot
    python model.py predict 2026-11-10T10:30-07:00 utah-surface-002

Table (one row per user report of a spotted vehicle):
    UID        the user's id
    Lot_ID     the lot's node_id from data/parking/parking_nodes.csv
    timestamp  start of the 30-minute slot the vehicle was spotted in (timestamptz)

Times are handled in UTC throughout. Only the model's day-of-week and slot-of-day
inputs are taken from Utah local time, because patrols follow the local clock.

Training data: one row per lot per 30-minute slot of every date in the data, with
    spottings = 1     if anyone reported a vehicle at that lot in that slot
    spottings = 0.05  otherwise (no report doesn't prove no vehicle)
and inputs: lot, day of week, 30-minute slot of the day, and which lots had
spottings in the previous 30-minute slot.
"""
import os
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import roc_auc_score
from sqlalchemy import create_engine, text

load_dotenv()   # reads DATABASE_URL from server/.env

MODEL_PATH = os.environ.get("MODEL_PATH", "model.joblib")
LOTS_FILE = Path(__file__).resolve().parent.parent / "data/parking/parking_nodes.csv"
TABLE = "ml_training_data"                       # change to your table's name
TZ = ZoneInfo("America/Denver")           # only used for the day-of-week and slot-of-day inputs

SLOT = "30min"
SPOTTED, NOT_SPOTTED = 1.0, 0.05
NOTHING_NEARBY_M = 10_000                 # "distance to nearest spotting" when nothing was spotted
UNKNOWN_PREV_FRACTION = 0.3               # share of training rows that hide the previous-slot inputs
HOLDOUT_DAYS = 14                         # most recent days, held back to test the model
HALF_LIFE_WEEKS = 8                       # data this many weeks old counts half as much as today's

# ---------- 1. Get the data ----------

def get_engine():
    return create_engine(os.environ["DATABASE_URL"])


def load_lots():
    """All lots, from data/parking. Every lot gets training rows, even with no spottings."""
    return pd.read_csv(LOTS_FILE)[["node_id", "name", "latitude", "longitude"]]


def to_utc(t):
    """A time as a UTC timestamp. Times without a time zone are taken to be UTC."""
    t = pd.Timestamp(t)
    return t.tz_localize("UTC") if t.tzinfo is None else t.tz_convert("UTC")


def local_time_inputs(times_utc):
    """Day of week (0 = Monday) and 30-minute slot of the day (0..47), in Utah local time."""
    local = pd.DatetimeIndex(times_utc).tz_convert(TZ)
    return local.dayofweek.to_numpy(), (local.hour * 2 + local.minute // 30).to_numpy()


def load_spottings(engine, start=None, end=None):
    """Spottings with ts in UTC. start/end (UTC) limit the time range."""
    query = f'SELECT "UID" AS uid, "Lot_ID" AS lot_id, "timestamp" AS ts FROM {TABLE}'
    params = {}
    if start is not None:
        query += ' WHERE "timestamp" >= :start AND "timestamp" < :end'
        params = {"start": start, "end": end}
    df = pd.read_sql(text(query), engine, params=params)
    df["ts"] = pd.to_datetime(df.ts, utc=True)
    return df


# ---------- 2. Build the training data ----------

def distance_matrix(lots):
    """Meters between every pair of lots."""
    lat, lon = np.radians(lots.latitude.to_numpy()), np.radians(lots.longitude.to_numpy())
    dlat, dlon = lat[:, None] - lat[None, :], lon[:, None] - lon[None, :]
    a = np.sin(dlat / 2) ** 2 + np.cos(lat[:, None]) * np.cos(lat[None, :]) * np.sin(dlon / 2) ** 2
    return 2 * 6_371_000 * np.arcsin(np.sqrt(a))


def previous_slot_inputs(prev_spotted, dist):
    """Turn "the list of lots spotted in the previous slot" into inputs for every lot.

    prev_spotted: (n_slots, n_lots) True where a lot had a spotting in the previous slot.
    Returns three (n_slots, n_lots) arrays:
        prev_here       this lot itself was spotted in the previous slot
        prev_count      how many lots were spotted in the previous slot
        prev_nearest_m  distance from this lot to the nearest lot spotted in the previous slot
    """
    n_slots, n_lots = prev_spotted.shape
    prev_here = prev_spotted.astype(float)
    prev_count = np.repeat(prev_spotted.sum(axis=1, keepdims=True), n_lots, axis=1).astype(float)
    prev_nearest = np.full((n_slots, n_lots), float(NOTHING_NEARBY_M))
    for i in np.flatnonzero(prev_spotted.any(axis=1)):
        prev_nearest[i] = dist[:, prev_spotted[i]].min(axis=1)
    return prev_here, prev_count, prev_nearest


def build_training_data(spottings, lots):
    """One row per lot per 30-minute slot (UTC) of every date from the first to the last spotting."""    lot_index = {lot: i for i, lot in enumerate(lots.node_id)}
    unknown = ~spottings.lot_id.isin(lot_index)
    if unknown.any():
        print(f"Skipping {unknown.sum()} spottings with a Lot_ID not in {LOTS_FILE.name}")
    spottings = spottings[~unknown]

    slots = pd.date_range(spottings.ts.min().normalize(),
                          spottings.ts.max().normalize() + pd.Timedelta(days=1),
                          freq=SLOT, inclusive="left")
    slot_index = {s: i for i, s in enumerate(slots)}

    # timestamps in the table are already rounded down to the start of their 30-minute slot
    slot_rows = spottings.ts.map(slot_index)
    if slot_rows.isna().any():
        bad = spottings.ts[slot_rows.isna()].iloc[0]
        raise SystemExit(f"Timestamp {bad} is not on a 30-minute slot start (:00 or :30).")

    # spotted[slot, lot] = True if anyone reported a vehicle at that lot in that slot
    spotted = np.zeros((len(slots), len(lots)), dtype=bool)
    spotted[slot_rows.astype(int).to_numpy(), spottings.lot_id.map(lot_index).to_numpy()] = True

    # the list of lots spotted in the previous slot (first slot: unknown)
    prev_spotted = np.vstack([np.zeros((1, len(lots)), dtype=bool), spotted[:-1]])
    prev_here, prev_count, prev_nearest = previous_slot_inputs(prev_spotted, distance_matrix(lots))
    prev_here[0] = prev_count[0] = prev_nearest[0] = np.nan

    n_slots, n_lots = spotted.shape
    dow, slot_of_day = local_time_inputs(slots)
    data = pd.DataFrame({
        "slot_start": np.repeat(slots, n_lots),                           # UTC
        "lot": np.tile(np.arange(n_lots), n_slots),
        "dow": np.repeat(dow, n_lots),                                    # Utah local
        "slot": np.repeat(slot_of_day, n_lots),                           # Utah local, 0..47
        "prev_here": prev_here.ravel(),
        "prev_count": prev_count.ravel(),
        "prev_nearest_m": prev_nearest.ravel(),
        "spottings": np.where(spotted, SPOTTED, NOT_SPOTTED).ravel(),
    })
    return data


FEATURES = ["lot", "dow", "slot", "prev_here", "prev_count", "prev_nearest_m"]
PREV_FEATURES = ["prev_here", "prev_count", "prev_nearest_m"]


# ---------- 3. Train ----------

def hide_some_previous_inputs(X, seed=0):
    """Blank the previous-slot inputs on some rows, so the model also learns to predict
    when they aren't known (e.g. for a time next week)."""
    X = X.copy()
    hide = np.random.default_rng(seed).random(len(X)) < UNKNOWN_PREV_FRACTION
    X.loc[hide, PREV_FEATURES] = np.nan
    return X


def fit(data):
    model = HistGradientBoostingRegressor(
        categorical_features=["lot", "dow"], max_iter=300, learning_rate=0.05,
        max_leaf_nodes=63, random_state=0,
    )
    # recent data counts more, so the model keeps up when the patrol schedule changes
    age_weeks = (data.slot_start.max() - data.slot_start).dt.days / 7
    weights = 0.5 ** (age_weeks / HALF_LIFE_WEEKS)
    model.fit(hide_some_previous_inputs(data[FEATURES]), data.spottings, sample_weight=weights)
    return model


def evaluate(data):
    """Train on older data, test on the last HOLDOUT_DAYS, and compare with a simple baseline."""
    cutoff = data.slot_start.max() - pd.Timedelta(days=HOLDOUT_DAYS)
    train, test = data[data.slot_start < cutoff], data[data.slot_start >= cutoff]
    was_spotted = test.spottings == SPOTTED
    if train.empty or was_spotted.nunique() < 2:
        print("Not enough data yet to evaluate.")
        return

    model = fit(train)
    with_prev = model.predict(test[FEATURES])
    no_prev = model.predict(test[FEATURES].assign(**{c: np.nan for c in PREV_FEATURES}))
    rate = train.groupby(["lot", "dow", "slot"]).spottings.mean()
    baseline = pd.MultiIndex.from_frame(test[["lot", "dow", "slot"]]).map(rate) \
                 .fillna(NOT_SPOTTED).to_numpy()

    print(f"Test on last {HOLDOUT_DAYS} days: {len(test):,} lot-slots, {was_spotted.sum():,} with spottings")
    print("  AUC (1.0 = perfect ranking, 0.5 = random):")
    print(f"    model, knowing previous slot's spottings  {roc_auc_score(was_spotted, with_prev):.3f}")
    print(f"    model, without previous slot             {roc_auc_score(was_spotted, no_prev):.3f}")
    print(f"    baseline (average for lot/day/slot)      {roc_auc_score(was_spotted, baseline):.3f}")


def train():
    lots = load_lots()
    spottings = load_spottings(get_engine())
    if spottings.empty:
        raise SystemExit("No spottings in the database yet.")
    data = build_training_data(spottings, lots)
    print(f"Training data: {len(data):,} rows ({len(lots)} lots, "
          f"{data.slot_start.nunique():,} slots), {(data.spottings == SPOTTED).sum():,} with spottings")
    evaluate(data)
    joblib.dump({"model": fit(data)}, MODEL_PATH + ".tmp")
    os.replace(MODEL_PATH + ".tmp", MODEL_PATH)   # swap in the new model in one step
    print(f"Saved model to {MODEL_PATH}")


# ---------- 4. Run the model ----------

def predict(time, lot_ids=None):
    """{lot_id: score from 0.05 to 1}, highest first. Higher = more likely to be spotted there.

    time: any time zone; a time without one is taken to be UTC.
    If the previous 30-minute slot has already happened, its spottings are read from the
    database and used. For a later time (e.g. next week) the model predicts without them.
    """
    model = joblib.load(MODEL_PATH)["model"]
    lots = load_lots()
    slot_start = to_utc(time).floor(SLOT)
    prev_start = slot_start - pd.Timedelta(SLOT)

    dow, slot_of_day = local_time_inputs([slot_start])
    X = pd.DataFrame({
        "lot": np.arange(len(lots)),
        "dow": dow[0],
        "slot": slot_of_day[0],
    })
    if slot_start <= pd.Timestamp.now(tz="UTC"):   # previous slot is over: use what was spotted in it
        recent = load_spottings(get_engine(), prev_start.to_pydatetime(), slot_start.to_pydatetime())
        prev_spotted = lots.node_id.isin(recent.lot_id).to_numpy()[None, :]
        here, count, nearest = previous_slot_inputs(prev_spotted, distance_matrix(lots))
        X["prev_here"], X["prev_count"], X["prev_nearest_m"] = here[0], count[0], nearest[0]
    else:
        X[PREV_FEATURES] = np.nan

    scores = np.clip(model.predict(X[FEATURES]), NOT_SPOTTED, SPOTTED)
    result = dict(zip(lots.node_id, scores.round(4).tolist()))
    if lot_ids:
        result = {l: result[l] for l in lot_ids if l in result}
    return dict(sorted(result.items(), key=lambda x: -x[1]))


if __name__ == "__main__":
    if sys.argv[1:2] == ["train"]:
        train()
    elif sys.argv[1:2] == ["predict"] and len(sys.argv) >= 3:
        for lot, score in predict(sys.argv[2], sys.argv[3:] or None).items():
            print(f"{lot:24s} {score:.3f}")
    else:
        print(__doc__)
