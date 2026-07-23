"""
Synthetic Crime Data Generator — Karnataka Crime Intelligence Platform
=======================================================================
Generates fully synthetic, fictional data (no real incidents/people) but
deliberately injects the underlying patterns your visualizations need to
*discover*, so the platform has something real to show off:

  1. Near-repeat contagion clusters      -> ripple/diffusion map
  2. A hidden serial offender w/ aliases  -> MO fingerprint radar matching
  3. Seasonal + spatial hotspots + a few
     true anomaly spikes                 -> anomaly bloom glyphs, alerts
  4. A co-offending network that shifts
     composition over time               -> network gravity simulation
  5. District socio-economic indicators
     correlated (with noise) to crime    -> twin-district benchmarking
  6. Space-time trails for a few repeat
     offenders                           -> Hägerstrand space-time cube

Everything is written to ./data/ (next to this script) along with a
ground_truth.json describing exactly what was injected and where, so you
can validate that your analytics actually recover it.

Run:  python generate_data.py
"""

import json
import math
import random
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from faker import Faker

random.seed(42)
np.random.seed(42)
fake = Faker("en_IN")
Faker.seed(42)

import os
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
os.makedirs(OUT_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. DISTRICTS & POLICE STATIONS (with socio-economic indicators)
# ---------------------------------------------------------------------------

DISTRICTS = [
    # name, lat, lon, population(approx, scaled down for sim), base_urbanization
    ("Bengaluru Urban", 12.9716, 77.5946, 9800000, 0.91),
    ("Bengaluru Rural", 13.2846, 77.5881, 1100000, 0.42),
    ("Mysuru", 12.2958, 76.6394, 3000000, 0.55),
    ("Dakshina Kannada", 12.9141, 74.8560, 2100000, 0.48),
    ("Belagavi", 15.8497, 74.4977, 4800000, 0.35),
    ("Hubballi-Dharwad", 15.3647, 75.1240, 1850000, 0.58),
    ("Kalaburagi", 17.3297, 76.8343, 2500000, 0.32),
    ("Ballari", 15.1394, 76.9214, 2450000, 0.38),
    ("Vijayapura", 16.8302, 75.7100, 2180000, 0.29),
    ("Tumakuru", 13.3379, 77.1022, 2680000, 0.31),
    ("Shivamogga", 13.9299, 75.5681, 1750000, 0.34),
    ("Davanagere", 14.4644, 75.9218, 1950000, 0.40),
    ("Raichur", 16.2076, 77.3463, 1930000, 0.26),
    ("Bidar", 17.9133, 77.5301, 1700000, 0.27),
    ("Chikkamagaluru", 13.3161, 75.7720, 1140000, 0.24),
    ("Hassan", 13.0072, 76.1004, 1780000, 0.28),
    ("Mandya", 12.5242, 76.8958, 1810000, 0.26),
    ("Kolar", 13.1367, 78.1298, 1540000, 0.30),
    ("Chikkaballapur", 13.4351, 77.7315, 1250000, 0.29),
    ("Chitradurga", 14.2296, 76.3985, 1660000, 0.27),
    ("Koppal", 15.3547, 76.1546, 1390000, 0.24),
    ("Gadag", 15.4300, 75.6300, 1060000, 0.31),
    ("Haveri", 14.7935, 75.4040, 1600000, 0.25),
    ("Bagalkot", 16.1691, 75.6667, 1890000, 0.28),
    ("Udupi", 13.3409, 74.7421, 1180000, 0.44),
    ("Uttara Kannada", 14.7900, 74.7050, 1450000, 0.36),
    ("Chamarajanagar", 11.9236, 76.9456, 1020000, 0.22),
    ("Kodagu", 12.4244, 75.7382, 550000, 0.31),
    ("Ramanagara", 12.7217, 77.2812, 1080000, 0.33),
    ("Yadgir", 16.7700, 77.1400, 1170000, 0.21),
]

CRIME_BASE_RATE = {
    # crime_type: (base incidents/100k/year multiplier, urban_skew)
    "Theft": (180, 1.6),
    "Burglary": (60, 1.1),
    "Chain Snatching": (35, 2.0),
    "Vehicle Theft": (90, 1.8),
    "Robbery": (25, 1.4),
    "Assault": (70, 0.9),
    "Cheating/Fraud": (55, 2.2),
    "Cybercrime": (30, 2.8),
    "Narcotics": (18, 1.3),
    "Domestic Violence": (45, 0.7),
    "Kidnapping": (8, 1.0),
    "Sexual Assault": (14, 1.1),
    "Rioting": (10, 0.8),
    "Murder": (5, 0.6),
}

rows = []
for name, lat, lon, pop, urb in DISTRICTS:
    literacy = np.clip(np.random.normal(0.60 + urb * 0.25, 0.05), 0.45, 0.94)
    unemployment = np.clip(np.random.normal(0.14 - urb * 0.05, 0.03), 0.03, 0.25)
    seci = round(0.4 * urb + 0.35 * literacy + 0.25 * (1 - unemployment), 3)  # socio-econ composite index
    rows.append(dict(
        district=name, latitude=lat, longitude=lon, population=pop,
        urbanization_index=round(urb, 3), literacy_rate=round(literacy, 3),
        unemployment_rate=round(unemployment, 3), socio_econ_index=seci,
    ))
districts_df = pd.DataFrame(rows)

# Police stations: 3-6 per district, jittered around district centroid
stations = []
station_id_counter = 1
for _, d in districts_df.iterrows():
    n_stations = random.randint(3, 6)
    for i in range(n_stations):
        jitter_lat = d.latitude + np.random.normal(0, 0.12)
        jitter_lon = d.longitude + np.random.normal(0, 0.12)
        stations.append(dict(
            station_id=f"PS{station_id_counter:04d}",
            station_name=f"{d.district.split(',')[0]} {['Town','City','Rural','East','West','North','South'][i % 7]} PS",
            district=d.district,
            latitude=round(jitter_lat, 5),
            longitude=round(jitter_lon, 5),
        ))
        station_id_counter += 1
stations_df = pd.DataFrame(stations)

# ---------------------------------------------------------------------------
# 2. OFFENDERS (incl. one hidden serial offender ring with aliases)
# ---------------------------------------------------------------------------

MO_TRANSPORT = ["Two-wheeler", "On foot", "Car", "Auto-rickshaw", "None"]
MO_ENTRY = ["Forced entry", "Unlocked access", "Deception/impersonation", "Online/remote", "N/A"]
MO_WEAPON = ["None", "Knife", "Blunt object", "Firearm", "Chemical/spray"]
MO_TARGET = ["Individual - stranger", "Individual - known", "Residence", "Commercial estab.", "Vehicle", "Online account"]
MO_TIMEBAND = ["Early morning (12-6)", "Morning (6-12)", "Afternoon (12-17)", "Evening (17-21)", "Night (21-24)"]

N_OFFENDERS = 650
offenders = []
for i in range(N_OFFENDERS):
    off_id = f"OFF{i+1:05d}"
    offenders.append(dict(
        offender_id=off_id,
        name=fake.name_male() if random.random() < 0.85 else fake.name_female(),
        age=int(np.clip(np.random.normal(29, 9), 16, 65)),
        gender=random.choices(["M", "F"], weights=[0.85, 0.15])[0],
        home_district=random.choice(districts_df.district.tolist()),
        prior_convictions=np.random.poisson(0.6),
        mo_transport=random.choice(MO_TRANSPORT),
        mo_entry=random.choice(MO_ENTRY),
        mo_weapon=random.choices(MO_WEAPON, weights=[0.55, 0.15, 0.15, 0.05, 0.10])[0],
        mo_target=random.choice(MO_TARGET),
        mo_timeband=random.choice(MO_TIMEBAND),
        is_alias_record=False,
        true_identity_id=None,
    ))

# --- Inject hidden serial offender ring: 5 "core" offenders, each operating
#     under 2 additional alias records in OTHER districts, sharing a
#     near-identical MO fingerprint. This is the ground truth the MO
#     fingerprint radar / sequence-alignment viz should recover.
serial_ring = []
alias_start = N_OFFENDERS
core_indices = random.sample(range(N_OFFENDERS), 5)
for k, core_idx in enumerate(core_indices):
    core = offenders[core_idx]
    core_mo = dict(mo_transport=core["mo_transport"], mo_entry=core["mo_entry"],
                    mo_weapon=core["mo_weapon"], mo_target=core["mo_target"],
                    mo_timeband=core["mo_timeband"])
    ring_ids = [core["offender_id"]]
    for a in range(2):
        alias_id = f"OFF{alias_start+1:05d}"
        alias_start += 1
        alias_district = random.choice([d for d in districts_df.district if d != core["home_district"]])
        offenders.append(dict(
            offender_id=alias_id,
            name=fake.name_male() if core["gender"] == "M" else fake.name_female(),
            age=core["age"] + random.choice([-1, 0, 1]),
            gender=core["gender"],
            home_district=alias_district,
            prior_convictions=np.random.poisson(0.6),
            # MO fingerprint deliberately near-identical (small realistic noise)
            mo_transport=core_mo["mo_transport"],
            mo_entry=core_mo["mo_entry"],
            mo_weapon=core_mo["mo_weapon"] if random.random() < 0.85 else random.choice(MO_WEAPON),
            mo_target=core_mo["mo_target"],
            mo_timeband=core_mo["mo_timeband"] if random.random() < 0.9 else random.choice(MO_TIMEBAND),
            is_alias_record=True,
            true_identity_id=core["offender_id"],
        ))
        ring_ids.append(alias_id)
    serial_ring.append(dict(true_identity=core["offender_id"], all_records=ring_ids,
                             shared_mo=core_mo))

offenders_df = pd.DataFrame(offenders)

# ---------------------------------------------------------------------------
# 3. VICTIMS
# ---------------------------------------------------------------------------

N_VICTIMS = 2400
victims = []
for i in range(N_VICTIMS):
    victims.append(dict(
        victim_id=f"VIC{i+1:05d}",
        name=fake.name(),
        age=int(np.clip(np.random.normal(34, 14), 5, 85)),
        gender=random.choices(["M", "F"], weights=[0.52, 0.48])[0],
        relation_to_offender=random.choices(
            ["Stranger", "Acquaintance", "Family member", "Neighbor", "Colleague"],
            weights=[0.5, 0.2, 0.15, 0.1, 0.05])[0],
    ))
victims_df = pd.DataFrame(victims)

# ---------------------------------------------------------------------------
# 4. INCIDENTS (with seasonal + spatial hotspots, near-repeat contagion,
#    a handful of true anomaly spikes, and the serial ring's incidents
#    spread across jurisdictions)
# ---------------------------------------------------------------------------

START_DATE = datetime(2023, 1, 1)
END_DATE = datetime(2025, 12, 31)
N_DAYS = (END_DATE - START_DATE).days

incidents = []
incident_counter = 1

def new_incident(date, district, station_row, crime_type, seed_id=None, contagion_gen=0):
    global incident_counter
    lat = station_row.latitude + np.random.normal(0, 0.02)
    lon = station_row.longitude + np.random.normal(0, 0.02)
    hour = int(np.clip(np.random.choice(
        [1, 4, 8, 11, 14, 17, 19, 21, 23],
        p=[0.06, 0.03, 0.05, 0.07, 0.10, 0.13, 0.18, 0.22, 0.16]), 0, 23))
    inc = dict(
        incident_id=f"INC{incident_counter:06d}",
        date=date.strftime("%Y-%m-%d"),
        time=f"{hour:02d}:{random.randint(0,59):02d}",
        district=district,
        station_id=station_row.station_id,
        station_name=station_row.station_name,
        latitude=round(lat, 5),
        longitude=round(lon, 5),
        crime_type=crime_type,
        severity=random.choices([1, 2, 3, 4, 5], weights=[0.25, 0.3, 0.25, 0.15, 0.05])[0],
        mo_transport=random.choice(MO_TRANSPORT),
        mo_entry=random.choice(MO_ENTRY),
        mo_weapon=random.choices(MO_WEAPON, weights=[0.55, 0.15, 0.15, 0.05, 0.10])[0],
        mo_target=random.choice(MO_TARGET),
        mo_timeband=MO_TIMEBAND[min(hour // 5, 4)],
        offender_id=None,
        victim_id=random.choice(victims_df.victim_id.tolist()),
        status=random.choices(["Under investigation", "Chargesheeted", "Closed", "Cold case"],
                               weights=[0.35, 0.3, 0.25, 0.10])[0],
        near_repeat_seed=seed_id,          # ground truth tag
        near_repeat_generation=contagion_gen,
    )
    incident_counter += 1
    return inc

# 4a. Base seasonal + hotspot-weighted generation
station_weight = {}
for _, s in stations_df.iterrows():
    d = districts_df[districts_df.district == s.district].iloc[0]
    urb_factor = 0.5 + d.urbanization_index
    hotspot_boost = np.random.choice([1, 1, 1, 2.5, 4.0], p=[0.55, 0.2, 0.1, 0.1, 0.05])  # a few true hotspots
    station_weight[s.station_id] = urb_factor * hotspot_boost

TRUE_HOTSPOTS = [sid for sid, w in station_weight.items() if w >= 2.5]

anomaly_events = []  # ground truth: (station_id, week_start, crime_type, magnitude)

for day_offset in range(N_DAYS):
    date = START_DATE + timedelta(days=day_offset)
    month = date.month
    # mild seasonality: theft/robbery up in festival months (Oct-Nov), assault up in summer
    season_mult = 1.0
    if month in (10, 11):
        season_mult = 1.35
    elif month in (4, 5):
        season_mult = 1.15

    n_today = np.random.poisson(38 * season_mult)
    for _ in range(n_today):
        station_id = random.choices(
            list(station_weight.keys()), weights=list(station_weight.values()))[0]
        station_row = stations_df[stations_df.station_id == station_id].iloc[0]
        d_row = districts_df[districts_df.district == station_row.district].iloc[0]

        # crime type chosen with urban skew
        types, weights = zip(*[
            (ct, base * (d_row.urbanization_index * skew + (1 - d_row.urbanization_index)))
            for ct, (base, skew) in CRIME_BASE_RATE.items()
        ])
        crime_type = random.choices(types, weights=weights)[0]

        inc = new_incident(date, station_row.district, station_row, crime_type)
        incidents.append(inc)

        # 4b. Near-repeat contagion: theft/burglary/chain-snatching/vehicle-theft
        # seed a short burst of follow-on incidents nearby within ~10 days
        if crime_type in ("Theft", "Burglary", "Chain Snatching", "Vehicle Theft") and random.random() < 0.06:
            seed_id = inc["incident_id"]
            n_followups = np.random.poisson(2.5)
            for gen in range(1, n_followups + 1):
                if random.random() < (0.6 ** gen):  # decaying probability
                    followup_date = date + timedelta(days=random.randint(1, 10))
                    if followup_date <= END_DATE:
                        followup = new_incident(followup_date, station_row.district, station_row,
                                                 crime_type, seed_id=seed_id, contagion_gen=gen)
                        incidents.append(followup)

# 4c. Inject a fixed set of TRUE anomaly weeks at distinct hotspot stations.
# Deterministic count (not a lucky random run) so the anomaly-bloom module always
# has a clear, above-baseline spike to recover. Aligned to pandas W-SUN Mondays
# so week_start matches weekly_station_stats exactly.
N_ANOMALY_WEEKS = 4
all_mondays = [START_DATE + timedelta(days=o) for o in range(N_DAYS)
               if (START_DATE + timedelta(days=o)).weekday() == 0
               and (START_DATE + timedelta(days=o)) < END_DATE - timedelta(days=14)]
anomaly_slots = random.sample(all_mondays, N_ANOMALY_WEEKS)
anomaly_crime_types = ["Cybercrime", "Chain Snatching", "Narcotics", "Robbery"]
anomaly_hotspots = random.sample(TRUE_HOTSPOTS, min(N_ANOMALY_WEEKS, len(TRUE_HOTSPOTS)))
for i, wk in enumerate(sorted(anomaly_slots)):
    station_id = anomaly_hotspots[i % len(anomaly_hotspots)]
    station_row = stations_df[stations_df.station_id == station_id].iloc[0]
    crime_type = anomaly_crime_types[i % len(anomaly_crime_types)]
    magnitude = random.randint(8, 14)  # clearly above a hotspot's normal weekly range
    for _ in range(magnitude):
        inc_date = wk + timedelta(days=random.randint(0, 6))
        incidents.append(new_incident(inc_date, station_row.district, station_row, crime_type))
    anomaly_events.append(dict(station_id=station_id, week_start=wk.strftime("%Y-%m-%d"),
                                crime_type=crime_type, extra_incidents=magnitude))

# 4d. Spread the serial ring's incidents across their respective jurisdictions
for ring in serial_ring:
    for rec_id in ring["all_records"]:
        rec = offenders_df[offenders_df.offender_id == rec_id].iloc[0]
        home_stations = stations_df[stations_df.district == rec.home_district]
        n_incidents_for_rec = random.randint(4, 9)
        for _ in range(n_incidents_for_rec):
            station_row = home_stations.sample(1).iloc[0]
            date = START_DATE + timedelta(days=random.randint(0, N_DAYS))
            crime_type = "Chain Snatching" if random.random() < 0.7 else "Robbery"
            inc = new_incident(date, station_row.district, station_row, crime_type)
            inc["offender_id"] = rec_id
            inc["mo_transport"] = ring["shared_mo"]["mo_transport"]
            inc["mo_entry"] = ring["shared_mo"]["mo_entry"]
            inc["mo_weapon"] = ring["shared_mo"]["mo_weapon"]
            inc["mo_target"] = ring["shared_mo"]["mo_target"]
            inc["mo_timeband"] = ring["shared_mo"]["mo_timeband"]
            incidents.append(inc)

# 4e. Assign offenders to remaining incidents that don't have one yet
unassigned_mask_offender_pool = offenders_df[~offenders_df.is_alias_record].offender_id.tolist()
for inc in incidents:
    if inc["offender_id"] is None and random.random() < 0.72:  # ~72% cleared/attributed
        inc["offender_id"] = random.choice(unassigned_mask_offender_pool)

incidents_df = pd.DataFrame(incidents)

# ---------------------------------------------------------------------------
# 5. CO-OFFENDING / ASSOCIATION NETWORK (with time-varying membership)
# ---------------------------------------------------------------------------

edges = []
# base random gang formations: pick clusters of 3-8 offenders, active in overlapping windows
N_GANGS = 22
fragmenting_gangs = []  # ground truth: which gangs split, when, and who broke away
for g in range(N_GANGS):
    gang_id = f"GANG{g+1:03d}"
    members = random.sample(unassigned_mask_offender_pool, k=random.randint(3, 8))
    active_start = START_DATE + timedelta(days=random.randint(0, N_DAYS - 200))
    active_end = active_start + timedelta(days=random.randint(60, 300))
    # ~half of the larger gangs fragment: a subset of members splits off partway
    # through the active window. Cross-group ties are cut at fragment_event_date;
    # ties within the breakaway group and within the remaining core survive.
    split_day = None
    breakaway = set()
    if random.random() < 0.5 and len(members) >= 5:
        split_day = active_start + timedelta(
            days=random.randint(30, (active_end - active_start).days - 10))
        k = random.randint(1, max(1, len(members) // 3))
        breakaway = set(random.sample(members, k))
        fragmenting_gangs.append(dict(
            gang_id=gang_id,
            fragment_event_date=split_day.strftime("%Y-%m-%d"),
            breakaway_members=sorted(breakaway),
            stayed_members=sorted(set(members) - breakaway),
        ))
    for i in range(len(members)):
        for j in range(i + 1, len(members)):
            a, b = members[i], members[j]
            cross = split_day is not None and ((a in breakaway) != (b in breakaway))
            edges.append(dict(
                source=a, target=b,
                edge_type="co_offending",
                gang_id=gang_id,
                active_from=active_start.strftime("%Y-%m-%d"),
                # a cross-group tie ends the day the gang fragments
                active_to=(split_day if cross else active_end).strftime("%Y-%m-%d"),
                fragment_event_date=split_day.strftime("%Y-%m-%d") if cross else None,
            ))

# offender-victim edges from incidents (where offender known)
for _, inc in incidents_df[incidents_df.offender_id.notna()].iterrows():
    edges.append(dict(
        source=inc.offender_id, target=inc.victim_id, edge_type="offender_victim",
        gang_id=None, active_from=inc.date, active_to=inc.date, fragment_event_date=None,
    ))

edges_df = pd.DataFrame(edges)

# ---------------------------------------------------------------------------
# 6. WEEKLY STATION STATS (feeds anomaly-bloom glyphs)
# ---------------------------------------------------------------------------

incidents_df["date_dt"] = pd.to_datetime(incidents_df["date"])
incidents_df["week_start"] = incidents_df["date_dt"].dt.to_period("W").apply(lambda p: p.start_time)

weekly_stats = (
    incidents_df.groupby(["station_id", "week_start"])
    .agg(case_count=("incident_id", "count"),
         avg_severity=("severity", "mean"))
    .reset_index()
)
weekly_stats["avg_response_time_min"] = np.clip(
    np.random.normal(38, 12, len(weekly_stats)), 8, 120).round(1)
weekly_stats["week_start"] = weekly_stats["week_start"].dt.strftime("%Y-%m-%d")

weekly_stats_df = weekly_stats

# ---------------------------------------------------------------------------
# WRITE OUTPUTS
# ---------------------------------------------------------------------------

districts_df.to_csv(f"{OUT_DIR}/districts.csv", index=False)
stations_df.to_csv(f"{OUT_DIR}/police_stations.csv", index=False)
offenders_df.to_csv(f"{OUT_DIR}/offenders.csv", index=False)
victims_df.to_csv(f"{OUT_DIR}/victims.csv", index=False)
incidents_df.drop(columns=["date_dt", "week_start"]).to_csv(f"{OUT_DIR}/incidents.csv", index=False)
edges_df.to_csv(f"{OUT_DIR}/network_edges.csv", index=False)
weekly_stats_df.to_csv(f"{OUT_DIR}/weekly_station_stats.csv", index=False)

ground_truth = dict(
    description="Ground-truth record of every pattern deliberately injected into the "
                 "synthetic dataset, for validating that the analytics/visualizations "
                 "actually recover it.",
    serial_offender_ring=serial_ring,
    true_hotspot_stations=TRUE_HOTSPOTS,
    anomaly_weeks=anomaly_events,
    n_gangs=N_GANGS,
    fragmenting_gangs=fragmenting_gangs,
    date_range=[START_DATE.strftime("%Y-%m-%d"), END_DATE.strftime("%Y-%m-%d")],
    row_counts=dict(
        districts=len(districts_df), police_stations=len(stations_df),
        offenders=len(offenders_df), victims=len(victims_df),
        incidents=len(incidents_df), network_edges=len(edges_df),
        weekly_station_stats=len(weekly_stats_df),
    ),
)
with open(f"{OUT_DIR}/ground_truth.json", "w") as f:
    json.dump(ground_truth, f, indent=2, default=str)

print("Done.")
print(json.dumps(ground_truth["row_counts"], indent=2))
print(f"Serial ring core offenders: {[r['true_identity'] for r in serial_ring]}")
print(f"True hotspot stations ({len(TRUE_HOTSPOTS)}): {TRUE_HOTSPOTS[:8]}...")
print(f"Injected anomaly weeks: {len(anomaly_events)}")
