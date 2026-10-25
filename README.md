# WindScope — Wind Power Forecast Evaluation

WindScope is a full-stack web application for evaluating wind power generation forecasts against actual generation data for January 2026. It retrieves data from the Elexon BMRS API, applies a defined forecast-selection methodology, calculates evaluation metrics, and presents the results through an interactive dashboard.

## Live Application

- **Frontend Dashboard:** https://windscope-xi.vercel.app/
- **Backend API:** https://windscope-backend.onrender.com/
- **January Evaluation API:** https://windscope-backend.onrender.com/api/january-evaluation
- **Health Check:** https://windscope-backend.onrender.com/api/health

## Key Features

- Full-stack application using React and Flask.
- Actual wind generation and wind forecast data retrieved from the Elexon BMRS API.
- January 2026 hourly forecast evaluation.
- Forecast selection based on a defined publication-time cutoff.
- Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and forecast bias calculations.
- Data completeness diagnostics and forecast-selection audit.
- Interactive dashboard with charts and evaluation metrics.
- Docker-based local development setup.
- Separate frontend and backend deployments.

## Technology Stack

### Frontend
- React
- Vite
- Recharts
- Lucide React
- JavaScript and CSS

### Backend
- Python
- Flask
- Flask-CORS
- Requests
- Gunicorn
- ZoneInfo and tzdata

### Data Source
- Elexon BMRS API

### Deployment and Development
- Vercel — frontend hosting
- Render — backend hosting
- Docker and Docker Compose
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

The frontend and backend are deployed separately. The React application communicates with the Flask API through the `VITE_API_URL` environment variable.

## Data Sources

WindScope uses the following Elexon BMRS datasets:

- **FUELHH:** Actual half-hourly generation data, filtered for wind generation.
- **WINDFOR:** Wind generation forecast data, including publication timestamps and target periods.

Data is retrieved from the Elexon BMRS API:

https://data.elexon.co.uk/bmrs/api/v1

The evaluation covers the period from 1 January 2026 through 31 January 2026.

## Evaluation Methodology

### 1. Actual Generation

Actual wind generation is collected at half-hourly intervals.

The two half-hourly actual generation values within each hour are averaged to produce an hourly actual generation value.

### 2. Forecast Selection

For each evaluation hour, the forecast selection cutoff is defined as **12:00 noon UK local time on the previous calendar day**.

Only forecasts published on or before the applicable cutoff are eligible for selection. Among the eligible forecasts returned by the API, the latest publication is selected for that target hour.

### 3. Hourly Evaluation

The selected hourly forecast is compared with the hourly actual generation value.

An hour is evaluated only when both required half-hourly actual intervals and an eligible forecast are available.

### 4. Evaluation Metrics

**Mean Absolute Error (MAE)**

The average absolute difference between forecast and actual generation.

**Root Mean Squared Error (RMSE)**

The square root of the average squared difference between forecast and actual generation.

**Forecast Bias**

The average difference between forecast and actual generation. A positive bias indicates that forecasts are higher than actual generation on average.

## Evaluation Results

The current backend evaluation returns the following results for January 2026:

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

The audit checks forecast selection against the eligible forecast records returned by the API. It does not independently establish that the upstream API returned every historical publication.

## Running Locally

### Prerequisites

Install the following:

- Python 3.12 or a compatible Python version
- Node.js and npm
- Docker Desktop (optional, for containerized execution)

### Option 1: Run with Docker Compose

From the repository root, run:

```bash
docker compose up --build
```

Once both services are running, open:

- **Frontend:** http://localhost:5173
- **Backend health check:** http://localhost:5000/api/health
- **January evaluation API:** http://localhost:5000/api/january-evaluation

Keep the Docker Compose terminal running while using the application.

To stop the containers, press `Ctrl+C` in the terminal running Docker Compose.

### Option 2: Run the Backend Separately

Open a terminal in the `backend` directory.

Install the dependencies:

```bash
pip install -r requirements.txt
```

Start the Flask development server:

```bash
flask --app app run --host=0.0.0.0 --port=5000
```

The backend will be available at:

```text
http://127.0.0.1:5000
```

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

Open the local URL displayed by Vite, normally:

```text
http://localhost:5173
```

For local development, the frontend falls back to the local evaluation API when `VITE_API_URL` is not configured.

## API Endpoints

| Endpoint | Purpose |
|---|---|
| `/` | Backend root endpoint |
| `/api/health` | Health check |
| `/api/january-evaluation` | January 2026 evaluation results, metrics, hourly records, and diagnostics |

The evaluation endpoint returns JSON data for use by the dashboard.

## Environment Configuration

The frontend supports the following environment variable:

| Variable | Description |
|---|---|
| `VITE_API_URL` | Full URL of the January evaluation API |

For the deployed frontend, the value is:

```text
https://windscope-backend.onrender.com/api/january-evaluation
```

For local development, the frontend defaults to:

```text
http://127.0.0.1:5000/api/january-evaluation
```

## Deployment

The application is deployed as two services:

- **Frontend:** Vercel
- **Backend:** Render

The Vercel project uses the `frontend` directory as its root and the Vite build output directory `dist`.

The Render backend uses the Dockerfile in the `backend` directory.

The frontend's `VITE_API_URL` environment variable points to the deployed Render evaluation endpoint.

## Limitations and Assumptions

- The evaluation period is January 2026.
- Hourly actual generation is calculated as the mean of two half-hourly actual intervals.
- Forecast eligibility is determined using the previous calendar day's 12:00 noon UK local-time cutoff.
- Forecast-selection audit results apply to the eligible records returned by the upstream API.
- The Render free service may take additional time to respond after a period of inactivity.

## Future Improvements

- Add automated backend tests.
- Improve dashboard loading and error states.
- Optimize frontend JavaScript bundle size through code splitting.
- Add further evaluation periods and forecast comparisons.
- Expand diagnostics and data-quality reporting.

## License

This repository was created for the WindScope forecast evaluation project. No separate open-source license is specified.
