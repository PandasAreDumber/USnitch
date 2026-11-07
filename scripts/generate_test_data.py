"""
USnitch: synthetic training data generator.

Simulates hidden officer patrol SCHEDULES (3 cars, weekly routines that
change every ~semester), then generates reports from those patrols, plus
1% false reports. Uploads reports to public.ml_training_data and writes
the hidden ground truth to ground_truth.csv for model evaluation.

Usage:
  pip install supabase python-dotenv
  put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in a .env file next to this script
  python generate_training_data.py --dry-run   # generate CSVs only, no upload
  python generate_training_data.py             # generate + upload
"""

import argparse
import csv
import math
import os
import random
import uuid
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

# ---------------- config ----------------
SEED = 42
TZ = ZoneInfo("America/Denver")
START_DATE = date(2024, 11, 4)          # Monday, ~2 years back
END_DATE = date(2026, 11, 6)

N_CARS = 3
SHIFT_START = time(8, 0)
SHIFT_END = time(22, 0)
DWELL_MIN = 10                           # minutes spent at a lot
TRAVEL_MIN = (2, 6)                      # minutes driving between lots
LUNCH_LEN = 30                           # minutes, each car takes one break

PERIOD_WEEKS = (12, 20)                  # schedule changes every 12-20 weeks

TIER_COUNTS = {"hot": 20, "med": 50, "low": 62}          # = 132
TIER_VISIT_WEIGHT = {"hot": 3.0, "med": 1.5, "low": 0.6}  # officers favor hot lots
TIER_REPORT_PROB = {"hot": 0.70, "med": 0.40, "low": 0.15}
TIER_EXTRA_REPORTS = {"hot": 0.8, "med": 0.3, "low": 0.05}  # poisson mean of extra dup reports

P_SKIP_STOP = 0.05       # officer skips a scheduled stop
P_CAR_OFF = 0.02         # car not on shift that day
DAY_JITTER_SD = 5        # minutes, daily start-time wobble
REPORT_LAG_MAX = 10      # minutes after officer leaves someone may still report
FALSE_REPORT_RATE = 0.01

N_FAKE_USERS = 300
FAKE_EMAIL = "sim_user_{i}@usnitch.test"
BATCH_SIZE = 1000

UTC_ORIGIN = datetime(2000, 1, 1, tzinfo=timezone.utc)


# ---------------- helpers ----------------
def half_hour_bin(dt_utc: datetime) -> datetime:
    """Matches Postgres date_bin('30 min', ts, '2000-01-01 00:00+00')."""
    secs = (dt_utc - UTC_ORIGIN).total_seconds()
    return UTC_ORIGIN + timedelta(seconds=math.floor(secs / 1800) * 1800)


def poisson(rng, lam):
    L, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= L:
            return k
        k += 1


def weekdays_between(start, end):
    d = start
    while d <= end:
        if d.weekday() < 5:
            yield d
        d += timedelta(days=1)


# ---------------- lots ----------------
def assign_tiers(lot_ids, rng):
    ids = sorted(lot_ids)
    rng.shuffle(ids)
    total = sum(TIER_COUNTS.values())
    if len(ids) != total:
        print(f"WARNING: {len(ids)} lots found, tier split expects {total}; extras go to 'low'.")
    tiers, i = {}, 0
    for tier, n in TIER_COUNTS.items():
        for lot in ids[i:i + n]:
            tiers[lot] = tier
        i += n
    for lot in ids[i:]:
        tiers[lot] = "low"
    return tiers


# ---------------- schedules ----------------
def build_periods(rng):
    """Split the date range into schedule periods of 12-20 weeks."""
    periods, start = [], START_DATE
    while start <= END_DATE:
        end = min(start + timedelta(weeks=rng.randint(*PERIOD_WEEKS)) - timedelta(days=1), END_DATE)
        periods.append((start, end))
        start = end + timedelta(days=1)
    return periods


def build_route(zone_lots, tiers, rng):
    """One car's route for one weekday: list of (minute_offset_from_8am, lot_id)."""
    shift_len = (SHIFT_END.hour - SHIFT_START.hour) * 60
    lunch_at = rng.randint(4 * 60, 6 * 60)  # lunch between noon and 2pm
    weights = [TIER_VISIT_WEIGHT[tiers[l]] for l in zone_lots]
    route, t, last, lunched = [], 0, None, False
    while t + DWELL_MIN <= shift_len:
        if not lunched and t >= lunch_at:
            t += LUNCH_LEN
            lunched = True
            continue
        lot = rng.choices(zone_lots, weights=weights)[0]
        if lot == last and len(zone_lots) > 1:
            continue
        route.append((t, lot))
        last = lot
        t += DWELL_MIN + rng.randint(*TRAVEL_MIN)
    return route


def build_schedule(lot_ids, tiers, rng):
    """Per period: each car gets a zone and a fixed route for each weekday (Mon-Fri)."""
    schedule = []
    for p_start, p_end in build_periods(rng):
        lots = list(lot_ids)
        rng.shuffle(lots)
        zones = [lots[i::N_CARS] for i in range(N_CARS)]
        routes = {
            (car, wd): build_route(zones[car], tiers, rng)
            for car in range(N_CARS) for wd in range(5)
        }
        schedule.append((p_start, p_end, routes))
    return schedule


# ---------------- simulation ----------------
def simulate_visits(schedule, rng):
    """Play schedules day by day with realistic noise -> ground-truth visits."""
    visits = []  # (car, lot, start_utc, end_utc)
    for p_start, p_end, routes in schedule:
        for d in weekdays_between(p_start, p_end):
            for car in range(N_CARS):
                if rng.random() < P_CAR_OFF:
                    continue
                day_shift = rng.gauss(0, DAY_JITTER_SD)
                base = datetime.combine(d, SHIFT_START, tzinfo=TZ)
                drift = 0.0
                for offset, lot in routes[(car, d.weekday())]:
                    drift += rng.gauss(0, 1.0)
                    if rng.random() < P_SKIP_STOP:
                        continue
                    start_local = base + timedelta(minutes=offset + day_shift + drift)
                    end_local = start_local + timedelta(minutes=DWELL_MIN)
                    if end_local.time() > SHIFT_END or start_local.time() < SHIFT_START:
                        continue
                    visits.append((car, lot, start_local.astimezone(timezone.utc),
                                   end_local.astimezone(timezone.utc)))
    return visits


def generate_reports(visits, lot_ids, tiers, user_ids, rng):
    user_weights = [1 / (i + 1) ** 0.8 for i in range(len(user_ids))]  # some users report a lot
    pick_user = lambda: rng.choices(user_ids, weights=user_weights)[0]

    reports, occupied_bins = [], set()
    for _, lot, start, end in visits:
        b = half_hour_bin(start)
        while b < end:
            occupied_bins.add((lot, b))
            b += timedelta(minutes=30)

        tier = tiers[lot]
        if rng.random() >= TIER_REPORT_PROB[tier]:
            continue
        n = 1 + poisson(rng, TIER_EXTRA_REPORTS[tier])
        window = (end - start).total_seconds() / 60 + REPORT_LAG_MAX
        for _ in range(n):
            ts = start + timedelta(minutes=rng.uniform(0, window))
            reports.append({"UID": pick_user(), "Lot_ID": lot,
                            "timestamp": half_hour_bin(ts), "is_false": False})

    # 1% false reports: random lot/time where no car actually was
    n_false = round(len(reports) * FALSE_REPORT_RATE / (1 - FALSE_REPORT_RATE))
    range_start = datetime.combine(START_DATE, time(0), tzinfo=TZ).astimezone(timezone.utc)
    range_secs = (datetime.combine(END_DATE, time(23, 59), tzinfo=TZ).astimezone(timezone.utc)
                  - range_start).total_seconds()
    sorted_lots = sorted(lot_ids)
    added = 0
    while added < n_false:
        lot = rng.choice(sorted_lots)
        b = half_hour_bin(range_start + timedelta(seconds=rng.uniform(0, range_secs)))
        if (lot, b) in occupied_bins:
            continue
        reports.append({"UID": pick_user(), "Lot_ID": lot, "timestamp": b, "is_false": True})
        added += 1

    reports.sort(key=lambda r: r["timestamp"])
    return reports


# ---------------- supabase ----------------
def get_client():
    from dotenv import load_dotenv
    from supabase import create_client
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def fetch_lot_ids(client):
    rows = client.table("parking_lots").select("Lot_ID").execute().data
    return [r["Lot_ID"] for r in rows]


def get_or_create_fake_users(client, rng):
    """Reuses sim users from earlier runs so reruns don't make duplicates."""
    existing, page = {}, 1
    while True:
        users = client.auth.admin.list_users(page=page, per_page=1000)
        if not users:
            break
        for u in users:
            if u.email and u.email.startswith("sim_user_"):
                existing[u.email] = u.id
        if len(users) < 1000:
            break
        page += 1

    ids = []
    for i in range(N_FAKE_USERS):
        email = FAKE_EMAIL.format(i=i)
        if email in existing:
            ids.append(str(existing[email]))
            continue
        res = client.auth.admin.create_user({
            "email": email,
            "password": uuid.uuid4().hex,
            "email_confirm": True,
            "user_metadata": {"simulated": True},
        })
        ids.append(str(res.user.id))
        if (i + 1) % 50 == 0:
            print(f"  users ready: {i + 1}/{N_FAKE_USERS}")
    return ids


def upload(client, reports):
    rows = [{"UID": r["UID"], "Lot_ID": r["Lot_ID"], "timestamp": r["timestamp"].isoformat()}
            for r in reports]
    for i in range(0, len(rows), BATCH_SIZE):
        client.table("ml_training_data").insert(rows[i:i + BATCH_SIZE]).execute()
        print(f"  uploaded {min(i + BATCH_SIZE, len(rows))}/{len(rows)}")


# ---------------- output ----------------
def write_csvs(visits, reports, tiers):
    with open("ground_truth.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["car", "Lot_ID", "tier", "start_utc", "end_utc"])
        for car, lot, s, e in visits:
            w.writerow([car, lot, tiers[lot], s.isoformat(), e.isoformat()])
    with open("reports.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["UID", "Lot_ID", "timestamp", "is_false"])
        for r in reports:
            w.writerow([r["UID"], r["Lot_ID"], r["timestamp"].isoformat(), r["is_false"]])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="write CSVs only, no Supabase")
    args = ap.parse_args()
    rng = random.Random(SEED)

    if args.dry_run:
        client = None
        lot_ids = [f"LOT_{i:03d}" for i in range(132)]
        user_ids = [str(uuid.UUID(int=rng.getrandbits(128))) for _ in range(N_FAKE_USERS)]
    else:
        client = get_client()
        lot_ids = fetch_lot_ids(client)
        print(f"Fetched {len(lot_ids)} lots. Preparing fake users...")
        user_ids = get_or_create_fake_users(client, rng)

    tiers = assign_tiers(lot_ids, rng)
    schedule = build_schedule(lot_ids, tiers, rng)
    visits = simulate_visits(schedule, rng)
    reports = generate_reports(visits, lot_ids, tiers, user_ids, rng)
    write_csvs(visits, reports, tiers)

    n_false = sum(r["is_false"] for r in reports)
    print(f"{len(schedule)} schedule periods | {len(visits)} officer visits | "
          f"{len(reports)} reports ({n_false} false)")

    if client:
        upload(client, reports)
        print("Done.")


if __name__ == "__main__":
    main()