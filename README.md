# WindScope — Wind Power Forecast Evaluation

WindScope is a full-stack web application designed to evaluate wind power generation forecasts against actual generation data for January 2026. It retrieves data from the Elexon BMRS API, applies a defined forecast-selection methodology, calculates evaluation metrics, and presents the results through an interactive dashboard.

## Live Application

**Live Dashboard:** https://windscope-xi.vercel.app/

## Overview

WindScope helps evaluate forecast accuracy by comparing hourly wind power forecasts with actual wind generation. The application includes forecast selection based on publication timestamps, statistical error metrics, data completeness checks, and forecast-selection audit diagnostics.

## Key Features

- Interactive wind power forecast evaluation dashboard.
- Actual wind generation and forecast data processing.
- January 2026 hourly evaluation.
- Forecast selection using a defined publication-time cutoff.
- MAE, RMSE, and forecast bias calculations.
- Actual-data completeness diagnostics.
- Forecast-selection audit.
- REST API powered by Flask.
- Responsive frontend built with React and Vite.
- Docker and Docker Compose support.
- Separate frontend and backend deployment.

## Technology Stack

### Frontend
- React
- Vite
- JavaScript
- Recharts
- Lucide React
- CSS

### Backend
- Python
- Flask
- Flask-CORS
- Requests
- Gunicorn
- ZoneInfo and tzdata

### Data Source
- Elexon BMRS API
- FUELHH — actual generation data
- WINDFOR — wind generation forecast data

### Deployment and Development
- Vercel
- Render
- Docker
- Docker Compose
- Git and GitHub

## Repository Structure

```text
q7mx2k9v/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   └── App.jsx
│   ├── package.json
│   └── ...
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Data Sources

The application uses the Elexon BMRS API to retrieve wind generation data.

- **FUELHH:** Actual half-hourly generation records, filtered for wind generation.
- **WINDFOR:** Wind generation forecast records, including publication timestamps and target periods.

The evaluation period covers **1 January 2026 through 31 January 2026**.

## Evaluation Methodology

### 1. Actual Generation

Actual wind generation is collected at half-hourly intervals. The two half-hourly values within each hour are averaged to calculate hourly actual generation.

### 2. Forecast Selection

For each evaluation hour, the forecast cutoff is defined as **12:00 noon UK local time on the previous calendar day**.

Only forecasts published on or before the applicable cutoff are eligible. Among the eligible forecast records returned by the API, the latest publication is selected for the target hour.

### 3. Hourly Evaluation

The selected hourly forecast is compared with the hourly actual generation value.

An hour is evaluated only when both required half-hourly actual intervals and an eligible forecast are available.

### 4. Evaluation Metrics

**Mean Absolute Error (MAE)**  
Measures the average absolute difference between forecast and actual generation.

**Root Mean Squared Error (RMSE)**  
Measures the square root of the average squared difference between forecast and actual generation.

**Forecast Bias**  
Measures the average difference between forecast and actual generation. A positive bias indicates that forecasts are higher than actual generation on average.

## Evaluation Results

The current evaluation results for January 2026 are:

| Metric | Result |
|---|---:|
| Evaluated hours | 744 |
| MAE | 2017.92 |
| RMSE | 2477.04 |
| Forecast bias (forecast − actual) | +1806.23 |
| Missing actual hours | 0 |
| Missing forecast hours | 0 |

### Data Completeness Diagnostics

| Diagnostic | Result |
|---|---:|
| Expected half-hourly actual intervals | 1488 |
| Unique actual intervals | 1488 |
| Missing actual intervals | 0 |
| Unexpected actual intervals | 0 |
| Expected evaluation hours | 744 |

### Forecast Selection Audit

| Audit | Result |
|---|---:|
| Evaluated hours audited | 744 |
| Cutoff violation hours | 0 |
| Latest-selection mismatch hours | 0 |
| Latest-selection audit | Passed |

The audit validates forecast selection against the eligible forecast records returned by the API. It does not independently establish that the upstream API returned every historical publication.

## Running Locally

### Prerequisites

- Python 3.12 or a compatible Python version
- Node.js and npm
- Docker Desktop (optional, for containerized execution)

### Option 1: Docker Compose

From the repository root, run:

```bash
docker compose up --build
```

When the containers are running, open:

- **Frontend:** http://localhost:5173
- **Backend health check:** http://localhost:5000/api/health
- **Evaluation data:** http://localhost:5000/api/january-evaluation

Keep the Docker Compose terminal running while using the application.

To stop the containers, press `Ctrl+C` in the terminal running Docker Compose.

### Option 2: Run the Backend Separately

Open a terminal in the `backend` directory.

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the Flask development server:

```bash
flask --app app run --host=0.0.0.0 --port=5000
```

The backend will run locally on port `5000`.

### Option 3: Run the Frontend Separately

Open another terminal in the `frontend` directory.

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open the local URL displayed by Vite, normally `http://localhost:5173`.

For local development, the frontend uses the local evaluation API when the `VITE_API_URL` environment variable is not configured.

## Environment Configuration

The frontend supports the following environment variable:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Specifies the evaluation API URL used by the frontend |

For deployment, the variable is configured in the frontend hosting environment. The backend URL is intentionally not listed in this public README.

## Deployment Architecture

The application is deployed as two services:

- **Frontend:** Hosted on Vercel.
- **Backend:** Hosted on Render.

The frontend is built using Vite, with the `frontend` directory as its project root and `dist` as the build output directory.

The backend uses Flask and is packaged using Docker. The frontend communicates with the backend through the configured API URL.

## Limitations and Assumptions

- The evaluation period is January 2026.
- Hourly actual generation is calculated as the average of two half-hourly actual intervals.
- Forecast eligibility uses the previous calendar day's 12:00 noon UK local-time cutoff.
- Forecast-selection audit results apply to the eligible records returned by the API.
- The backend hosting service may take additional time to respond after a period of inactivity.

## Future Improvements

- Add automated backend tests.
- Improve loading and error states.
- Optimize frontend bundle size through code splitting.
- Add further evaluation periods and forecast comparisons.
- Expand data-quality diagnostics.

## License

This repository was created for the WindScope forecast evaluation project. No separate open-source license is specified.
