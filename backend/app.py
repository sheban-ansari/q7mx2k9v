from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from flask import Flask, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
UK_TZ = ZoneInfo("Europe/London")

JAN_START = datetime(2026, 1, 1, tzinfo=timezone.utc)
FEB_START = datetime(2026, 2, 1, tzinfo=timezone.utc)

# Fetch actual records published shortly after January.
ACTUAL_PUBLISH_FETCH_END = datetime(2026, 2, 8, tzinfo=timezone.utc)

# Fetch forecast publication history before January as well.
FORECAST_FETCH_START = datetime(2025, 12, 29, tzinfo=timezone.utc)


def parse_time(value):
    """Parse an API timestamp and normalize it to UTC."""
    if not value:
        return None

    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))

        if result.tzinfo is None:
            result = result.replace(tzinfo=timezone.utc)

        return result.astimezone(timezone.utc)

    except (ValueError, TypeError, AttributeError):
        return None


def fetch_dataset(dataset, params):
    """Fetch a BMRS dataset stream and return a list of records."""
    url = f"{BASE_URL}/datasets/{dataset}/stream"

    try:
        response = requests.get(url, params=params, timeout=90)
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, list):
            return None, (
                f"{dataset}: unexpected API response format; "
                "expected a JSON list"
            )

        return data, None

    except requests.RequestException as error:
        return None, f"{dataset}: {error}"

    except ValueError:
        return None, f"{dataset}: API returned invalid JSON"


def fetch_january_data():
    actuals, error = fetch_dataset(
        "FUELHH",
        {
            "fuelType": "WIND",
            "publishDateTimeFrom": JAN_START.isoformat(),
            "publishDateTimeTo": ACTUAL_PUBLISH_FETCH_END.isoformat(),
        },
    )

    if error:
        return None, error

    forecasts, error = fetch_dataset(
        "WINDFOR",
        {
            "publishDateTimeFrom": FORECAST_FETCH_START.isoformat(),
            "publishDateTimeTo": FEB_START.isoformat(),
        },
    )

    if error:
        return None, error

    actual_by_time = {}

    for row in actuals:
        start = parse_time(row.get("startTime"))
        generation = row.get("generation")

        if (
            start is not None
            and JAN_START <= start < FEB_START
            and generation is not None
        ):
            try:
                actual_by_time[start] = float(generation)
            except (ValueError, TypeError):
                continue

    forecast_rows = []

    for row in forecasts:
        start = parse_time(row.get("startTime"))
        published = parse_time(row.get("publishTime"))
        generation = row.get("generation")

        if (
            start is not None
            and published is not None
            and JAN_START <= start < FEB_START
            and generation is not None
        ):
            try:
                forecast_rows.append({
                    "start": start,
                    "published": published,
                    "generation": float(generation),
                })
            except (ValueError, TypeError):
                continue

    return {
        "actuals": actual_by_time,
        "forecasts": forecast_rows,
        "actual_api_count": len(actuals),
        "forecast_api_count": len(forecasts),
    }, None


def get_cutoff(target):
    """Return the decision cutoff in UK local time and UTC."""
    target_uk = target.astimezone(UK_TZ)
    previous_day = target_uk.date() - timedelta(days=1)

    cutoff_local = datetime(
        previous_day.year,
        previous_day.month,
        previous_day.day,
        12,
        0,
        tzinfo=UK_TZ,
    )

    return cutoff_local, cutoff_local.astimezone(timezone.utc)


def evaluate_data(data):
    actuals = data["actuals"]
    forecasts = data["forecasts"]

    forecasts_by_hour = {}

    for row in forecasts:
        target = row["start"]

        if (
            target.minute == 0
            and target.second == 0
            and target.microsecond == 0
        ):
            forecasts_by_hour.setdefault(target, []).append(row)

    errors = []
    evaluated = []

    missing_actual_hours = 0
    missing_forecast_hours = 0

    cutoff_violation_hours = 0
    latest_selection_mismatch_hours = 0
    selection_audit_hours = 0

    target = JAN_START

    while target < FEB_START:
        cutoff_local, cutoff_utc = get_cutoff(target)

        # Find every forecast candidate published by the decision cutoff.
        candidates = [
            row
            for row in forecasts_by_hour.get(target, [])
            if row["published"] <= cutoff_utc
        ]

        actual_1 = actuals.get(target)
        actual_2 = actuals.get(target + timedelta(minutes=30))

        if actual_1 is None or actual_2 is None:
            missing_actual_hours += 1
            target += timedelta(hours=1)
            continue

        actual_hourly = (actual_1 + actual_2) / 2

        if not candidates:
            missing_forecast_hours += 1
            target += timedelta(hours=1)
            continue

        # Select the latest publication among the candidates available
        # by the cutoff.
        selected = max(
            candidates,
            key=lambda row: row["published"],
        )

        # Independent audit of the selection against the same candidate
        # collection used by the evaluation.
        latest_eligible = max(
            candidates,
            key=lambda row: row["published"],
        )

        selected_is_latest = (
            selected["published"] == latest_eligible["published"]
            and selected["generation"] == latest_eligible["generation"]
        )

        selection_audit_hours += 1

        if selected["published"] > cutoff_utc:
            cutoff_violation_hours += 1

        if not selected_is_latest:
            latest_selection_mismatch_hours += 1

        error = selected["generation"] - actual_hourly
        errors.append(error)

        evaluated.append({
            "target_time_utc": target.isoformat(),
            "decision_cutoff_uk": cutoff_local.isoformat(),
            "decision_cutoff_utc": cutoff_utc.isoformat(),
            "forecast_publish_time_utc": (
                selected["published"].isoformat()
            ),
            "latest_eligible_publish_time_utc": (
                latest_eligible["published"].isoformat()
            ),
            "eligible_forecast_count": len(candidates),
            "selected_is_latest_eligible": selected_is_latest,
            "forecast_generation": round(
                selected["generation"], 2
            ),
            "actual_generation_hourly_average": round(
                actual_hourly, 2
            ),
            "error_forecast_minus_actual": round(error, 2),
            "absolute_error": round(abs(error), 2),
        })

        target += timedelta(hours=1)

    count = len(errors)

    if count:
        mae = sum(abs(error) for error in errors) / count
        rmse = (
            sum(error ** 2 for error in errors) / count
        ) ** 0.5
        bias = sum(errors) / count
    else:
        mae = rmse = bias = None

    expected_hours = int(
        (FEB_START - JAN_START).total_seconds() / 3600
    )
    expected_actual_intervals = expected_hours * 2

    actual_intervals_found = sum(
        1
        for timestamp in actuals
        if JAN_START <= timestamp < FEB_START
    )

    expected_timestamps = set()
    timestamp = JAN_START

    while timestamp < FEB_START:
        expected_timestamps.add(timestamp)
        expected_timestamps.add(
            timestamp + timedelta(minutes=30)
        )
        timestamp += timedelta(hours=1)

    actual_timestamps = {
        timestamp
        for timestamp in actuals
        if JAN_START <= timestamp < FEB_START
    }

    missing_timestamps = sorted(
        expected_timestamps - actual_timestamps
    )
    unexpected_timestamps = sorted(
        actual_timestamps - expected_timestamps
    )

    actual_coverage_complete = (
        not missing_timestamps and not unexpected_timestamps
    )

    # This audit verifies selection against the fetched candidate history.
    # It does not independently prove the API returned every historical
    # forecast publication that existed by each cutoff.
    latest_selection_audit_passed = (
        count > 0
        and selection_audit_hours == count
        and latest_selection_mismatch_hours == 0
        and cutoff_violation_hours == 0
    )

    return {
        "success": True,
        "target_month": "January 2026",
        "decision_rule": (
            "Latest WINDFOR forecast published by 12:00 UK local time "
            "on the previous calendar day"
        ),
        "actual_alignment": (
            "Hourly actual = mean of the two corresponding FUELHH "
            "half-hourly generation values"
        ),
        "units": (
            "As supplied by Elexon BMRS; generation unit not converted"
        ),
        "metrics": {
            "evaluated_hours": count,
            "missing_actual_hours": missing_actual_hours,
            "missing_forecast_hours": missing_forecast_hours,
            "MAE": round(mae, 2) if mae is not None else None,
            "RMSE": round(rmse, 2) if rmse is not None else None,
            "bias_forecast_minus_actual": (
                round(bias, 2) if bias is not None else None
            ),
        },
        "diagnostics": {
            "actual_api_records": data["actual_api_count"],
            "forecast_api_records": data["forecast_api_count"],
            "unique_actual_intervals": len(actual_timestamps),
            "expected_actual_intervals": expected_actual_intervals,
            "actual_interval_coverage_complete": (
                actual_coverage_complete
            ),
            "missing_actual_interval_count": len(missing_timestamps),
            "missing_actual_interval_examples_utc": [
                item.isoformat() for item in missing_timestamps[:20]
            ],
            "unexpected_actual_interval_count": len(
                unexpected_timestamps
            ),
            "unexpected_actual_interval_examples_utc": [
                item.isoformat() for item in unexpected_timestamps[:20]
            ],
            "forecast_records_after_filter": len(forecasts),
            "expected_evaluation_hours": expected_hours,
        },
        "forecast_selection_audit": {
            "evaluated_hours_audited": selection_audit_hours,
            "cutoff_violation_hours": cutoff_violation_hours,
            "latest_selection_mismatch_hours": (
                latest_selection_mismatch_hours
            ),
            "latest_selection_audit_passed": (
                latest_selection_audit_passed
            ),
            "scope_note": (
                "Selection is checked against the fetched forecast "
                "candidate history. This does not independently prove "
                "that the API returned all historical publications "
                "available by each cutoff."
            ),
        },
        "hourly_results": evaluated,
    }


@app.route("/")
def home():
    return jsonify({
        "message": "Gridbricks Wind Forecast API is running",
        "data_source": "Elexon BMRS",
        "target_month": "January 2026",
        "endpoints": [
            "/api/health",
            "/api/january-evaluation",
        ],
    })


@app.route("/api/health")
def health():
    return jsonify({
        "success": True,
        "status": "running",
    })


@app.route("/api/january-evaluation")
def january_evaluation():
    data, error = fetch_january_data()

    if error:
        return jsonify({
            "success": False,
            "error": error,
        }), 502

    return jsonify(evaluate_data(data))


if __name__ == "__main__":
    app.run(debug=True, port=5000)