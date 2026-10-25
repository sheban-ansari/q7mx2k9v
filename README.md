# WindScope | Wind Power Forecast Evaluation

**A full-stack application for evaluating wind power generation forecasts against actual generation data for January 2026.**

WindScope retrieves wind-generation data from the Elexon BMRS API, evaluates hourly forecast accuracy, and presents performance metrics and forecast-selection audit results through a React frontend backed by a Flask API.

## Project Overview

Wind power forecasts are important for understanding expected renewable generation and evaluating forecasting performance. WindScope provides a reproducible evaluation workflow for comparing hourly wind-generation forecasts with actual generation over a defined historical period.

The application focuses on **January 1–31, 2026**, with hourly evaluation results derived from half-hourly actual-generation records and forecast publications selected according to a predefined publication cutoff.

## Key Features

- **Full-stack architecture:** React frontend and Python Flask backend.
- **Live data retrieval:** Retrieves historical actual and forecast records from the Elexon BMRS API.
- **Hourly evaluation:** Aligns forecast and actual generation by target hour.
- **Forecast accuracy metrics:** Calculates MAE, RMSE, and forecast bias.
- **Publication cutoff:** Applies a forecast publication cutoff based on UK local time.
- **Data quality diagnostics:** Checks expected actual intervals and missing evaluation hours.
- **Forecast-selection audit:** Checks cutoff compliance and whether the selected publication is the latest eligible record available to the application.
- **Containerized execution:** Runs frontend and backend services with Docker Compose.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, Recharts, Lucide React |
| Backend | Python, Flask, Requests |
| API integration | Elexon BMRS API |
| Cross-origin requests | Flask-CORS |
| Timezone handling | Python ZoneInfo, tzdata |
| Containerization | Docker, Docker Compose |
| Version control | Git, GitHub |

## Application Architecture

```text
Elexon BMRS API
       |
       | Actual generation (FUELHH)
       | Wind forecasts (WINDFOR)
       v
Flask Backend
       |
       | Data validation
       | Timestamp alignment
       | Forecast selection
       | Error metrics and audit
       v
React Frontend
       |
       | Evaluation results
       | Forecast performance
       | Data quality diagnostics
       v
      User
```

The backend retrieves and processes the upstream data, while the frontend provides the interface for viewing the evaluation results.

## Project Structure

```text
Forecast_Project/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   └── Dockerfile
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Data Sources

WindScope uses the Elexon BMRS API to retrieve the data required for evaluation.

| Dataset | Purpose |
|---|---|
| `FUELHH` | Half-hourly actual generation records, filtered for wind generation |
| `WINDFOR` | Wind-generation forecast records and their publication timestamps |

Data source: [Elexon BMRS API](https://data.elexon.co.uk/bmrs/api/v1)

The application uses target timestamps to align forecast values with actual generation and publication timestamps to determine forecast eligibility.

## Evaluation Methodology

### 1. Evaluation period

The evaluation covers January 1 through January 31, 2026.

For a complete non-leap-year January, the expected data consists of:

- 31 calendar days
- 744 hourly evaluation periods
- 1,488 half-hourly actual-generation intervals

### 2. Actual generation

Actual wind-generation records are retrieved from `FUELHH`.

The two half-hourly actual-generation values within each evaluation hour are averaged to obtain the hourly actual-generation value.

### 3. Forecast selection

Forecast records are retrieved from `WINDFOR` and grouped by their target hour.

For each target hour, the application applies the following selection rule:

- Calculate the cutoff as **12:00 UK local time on the previous calendar day**.
- Exclude forecast publications later than that cutoff.
- Select the latest eligible publication available to the application.
- Align the selected forecast with the corresponding hourly actual-generation value.

This cutoff is designed to prevent forecasts published after the defined deadline from being used for that evaluation hour.

### 4. Forecast accuracy metrics

Let:

- \(F_t\) = forecast generation for hour \(t\)
- \(A_t\) = actual generation for hour \(t\)
- \(N\) = number of evaluated hours

**Mean Absolute Error (MAE)**

\[
MAE = \frac{1}{N}\sum_{t=1}^{N}|F_t-A_t|
\]

MAE measures the average absolute difference between forecast and actual generation.

**Root Mean Squared Error (RMSE)**

\[
RMSE = \sqrt{\frac{1}{N}\sum_{t=1}^{N}(F_t-A_t)^2}
\]

RMSE gives greater weight to larger forecast errors.

**Forecast Bias**

\[
Bias = \frac{1}{N}\sum_{t=1}^{N}(F_t-A_t)
\]

- Positive bias indicates that forecasts were higher than actual generation on average.
- Negative bias indicates that forecasts were lower than actual generation on average.
- Bias near zero indicates a smaller average signed error, although individual forecast errors may still be large.

## January 2026 Evaluation Results

The current local evaluation produced the following results:

| Metric | Result |
|---|---:|
| Evaluated hours | 744 |
| Mean Absolute Error (MAE) | 2,017.92 |
| Root Mean Squared Error (RMSE) | 2,477.04 |
| Forecast bias | +1,806.23 |
| Missing actual hours | 0 |
| Missing forecast hours | 0 |

### Actual Data Coverage

| Diagnostic | Result |
|---|---:|
| Expected half-hourly actual intervals | 1,488 |
| Unique actual intervals found | 1,488 |
| Missing actual intervals | 0 |
| Unexpected actual intervals | 0 |
| Actual interval coverage complete | Yes |

### Forecast-Selection Audit

| Audit check | Result |
|---|---:|
| Evaluated hours audited | 744 |
| Cutoff-violation hours | 0 |
| Latest-selection mismatch hours | 0 |
| Latest-selection audit passed | Yes |

The audit checks forecast selection against the eligible records available to the application. It does not independently establish that the upstream API returned every historical forecast publication.

**Results note:** These values represent the current recorded local evaluation. Results may change if the upstream data or evaluation logic changes. Metric units should be interpreted according to the units returned by the source data.

## Getting Started

### Prerequisites

Install:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### Clone the repository

```bash
git clone https://github.com/sheban-ansari/windscope-forecast-evaluation.git
cd windscope-forecast-evaluation
```

### Build and run

From the project root, run:

```bash
docker compose up --build
```

Docker Compose builds the frontend and backend images and starts both services.

### Access the application

Once both containers are running, open these addresses in your browser:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend root | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |
| January evaluation API | http://localhost:5000/api/january-evaluation |

The evaluation endpoint retrieves and processes upstream data, so its response time depends on API availability and the volume of data returned.

### Stop the application

Press `Ctrl + C` in the terminal running Docker Compose to stop the foreground process.

To stop the Compose services explicitly, run:

```bash
docker compose down
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `/` | Backend root endpoint |
| `/api/health` | Checks backend availability |
| `/api/january-evaluation` | Returns the January evaluation results, metrics, and diagnostics |

The frontend consumes the backend API to present the evaluation data.

## Validation and Limitations

- The evaluation is limited to January 2026.
- The application checks expected actual-data intervals and missing hourly evaluation values.
- Forecast selection applies the defined publication cutoff and checks the selected publication against eligible records available to the application.
- The selection audit does not independently verify the completeness of all historical publications at the upstream source.
- Evaluation results depend on the upstream API and the availability of the required historical data.
- The current Docker configuration supports local execution. Public deployment requires hosting and any necessary environment-specific configuration.

## Potential Future Improvements

- Deploy the frontend and backend to public hosting.
- Add automated unit tests for forecast selection, timestamp handling, and metric calculations.
- Introduce caching and retries for upstream API requests.
- Add configurable evaluation periods.
- Expand visualizations for hourly errors and actual-versus-forecast comparisons.
- Add continuous integration checks for code quality and application tests.

## License

No license has been specified for this repository.
