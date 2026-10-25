import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  TrendingUp,
  Wind,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from "recharts";
import "./App.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:5000/api/january-evaluation";

function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toLocaleString("en-GB", {
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "—");

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

function MetricCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="metric-card">
      <div className="metric-top">
        <span>{title}</span>
        <span className="metric-icon">
          <Icon size={19} />
        </span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-subtitle">{subtitle}</div>
    </div>
  );
}

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const json = await response.json();

      if (json.error) {
        throw new Error(json.error);
      }

      setResult(json);
    } catch (err) {
      setError(
        `${err.message}. Check that the Flask backend is running at http://127.0.0.1:5000.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const metrics = result?.metrics ?? {};
  const rows = result?.hourly_results ?? [];

  const chartData = useMemo(
    () =>
      rows
        .map((row) => ({
          time: row.target_time_utc,
          actual: Number(row.actual_generation_hourly_average),
          forecast: Number(row.forecast_generation),
          error: Number(row.error_forecast_minus_actual),
          absoluteError: Number(row.absolute_error),
        }))
        .filter(
          (row) =>
            row.time &&
            Number.isFinite(row.actual) &&
            Number.isFinite(row.forecast)
        )
        .sort((a, b) => new Date(a.time) - new Date(b.time)),
    [rows]
  );

  const dailyData = useMemo(() => {
    const grouped = new Map();

    for (const row of chartData) {
      const day = row.time.slice(0, 10);
      if (!grouped.has(day)) {
        grouped.set(day, {
          day,
          actualTotal: 0,
          forecastTotal: 0,
          actualCount: 0,
          forecastCount: 0,
          absoluteErrorTotal: 0,
          errorCount: 0,
          overForecastHours: 0,
          underForecastHours: 0,
        });
      }

      const item = grouped.get(day);
      item.actualTotal += row.actual;
      item.forecastTotal += row.forecast;
      item.actualCount += 1;
      item.forecastCount += 1;

      if (Number.isFinite(row.absoluteError)) {
        item.absoluteErrorTotal += row.absoluteError;
        item.errorCount += 1;
      } else {
        item.absoluteErrorTotal += Math.abs(row.forecast - row.actual);
        item.errorCount += 1;
      }

      if (row.forecast > row.actual) item.overForecastHours += 1;
      if (row.forecast < row.actual) item.underForecastHours += 1;
    }

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        label: formatDate(`${item.day}T00:00:00Z`),
        actual: item.actualCount ? item.actualTotal / item.actualCount : null,
        forecast: item.forecastCount
          ? item.forecastTotal / item.forecastCount
          : null,
        dailyMae: item.errorCount
          ? item.absoluteErrorTotal / item.errorCount
          : null,
        averageBias:
          item.actualCount && item.forecastCount
            ? item.forecastTotal / item.forecastCount -
              item.actualTotal / item.actualCount
            : null,
      }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [chartData]);

  const worstDays = useMemo(
    () =>
      [...dailyData]
        .filter((day) => Number.isFinite(day.dailyMae))
        .sort((a, b) => b.dailyMae - a.dailyMae)
        .slice(0, 5),
    [dailyData]
  );

  const formatBias = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return `${number > 0 ? "+" : ""}${formatNumber(number)}`;
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Wind size={23} />
          </div>
          <div>
            <div className="brand-name">WindScope</div>
            <div className="brand-caption">ENERGY INTELLIGENCE</div>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <div className="nav-item active">
          <Activity size={18} />
          Forecast overview
        </div>

        <div className="nav-item">
          <TrendingUp size={18} />
          Model evaluation
        </div>

        <div className="nav-item">
          <Clock size={18} />
          Historical review
        </div>

        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <div className="status-title">Evaluation period</div>
            <div className="status-detail">January 2026 · UK</div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <div className="eyebrow">RENEWABLE ENERGY / WIND</div>
            <h1>Forecast performance</h1>
            <p className="page-description">
              Compare wind generation forecasts against observed output.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            {loading ? "Loading…" : "Refresh data"}
          </button>
        </header>

        {error && (
          <div className="error-banner">
            <AlertCircle size={20} />
            <div>
              <strong>Unable to load evaluation data</strong>
              <p>{error}</p>
            </div>
            <button onClick={loadData}>Retry</button>
          </div>
        )}

        <section className="summary-strip">
          <div className="summary-item">
            <span className="summary-label">ANALYSIS WINDOW</span>
            <strong>01 Jan – 31 Jan 2026</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">MARKET</span>
            <strong>Great Britain</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">DATA SOURCE</span>
            <strong>Elexon / BMRS</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">RESOLUTION</span>
            <strong>Hourly</strong>
          </div>
        </section>

        <section className="section-heading">
          <div>
            <h2>Performance indicators</h2>
            <p>Forecast accuracy across the selected evaluation window</p>
          </div>
          <span className="period-tag">JANUARY 2026</span>
        </section>

        <section className="metrics-grid">
          <MetricCard
            title="Mean absolute error"
            value={loading && !result ? "…" : formatNumber(metrics.MAE)}
            subtitle="Average absolute forecast error"
            icon={Activity}
          />
          <MetricCard
            title="Root mean square error"
            value={loading && !result ? "…" : formatNumber(metrics.RMSE)}
            subtitle="Penalises larger errors"
            icon={TrendingUp}
          />
          <MetricCard
            title="Forecast bias"
            value={
              loading && !result
                ? "…"
                : formatBias(metrics.bias_forecast_minus_actual)
            }
            subtitle="Forecast minus actual generation"
            icon={Wind}
          />
          <MetricCard
            title="Evaluated hours"
            value={
              loading && !result
                ? "…"
                : formatNumber(metrics.evaluated_hours)
            }
            subtitle="Out of 744 hours in January"
            icon={Clock}
          />
        </section>

        <section className="chart-card">
          <div className="chart-header">
            <div>
              <h2>Forecast vs actual generation</h2>
              <p>Hourly wind generation throughout January 2026</p>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-dot actual-dot" />
                Actual
              </span>
              <span>
                <i className="legend-dot forecast-dot" />
                Forecast
              </span>
            </div>
          </div>

          {loading && !result ? (
            <div className="chart-placeholder">Loading evaluation data…</div>
          ) : error ? (
            <div className="chart-placeholder">
              Chart data is unavailable until the backend responds.
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart
                data={chartData}
                margin={{ top: 12, right: 18, left: 4, bottom: 8 }}
              >
                <CartesianGrid stroke="#e9edf3" strokeDasharray="4 4" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#788397", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#dfe5ed" }}
                  minTickGap={45}
                  tickFormatter={formatDate}
                />
                <YAxis
                  tick={{ fill: "#788397", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatNumber}
                  width={68}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e4e9f0",
                    boxShadow: "0 8px 28px #17203312",
                  }}
                  labelFormatter={(value) =>
                    new Date(value).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "UTC",
                    }) + " UTC"
                  }
                  formatter={(value, name) => [
                    formatNumber(value),
                    name === "actual" ? "Actual" : "Forecast",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-placeholder">
              No hourly records were returned by the backend. Check the API
              response at http://127.0.0.1:5000/api/january-evaluation.
            </div>
          )}
        </section>

        <section className="chart-card">
          <div className="chart-header">
            <div>
              <h2>Daily average generation</h2>
              <p>
                Daily mean of hourly values, making day-to-day forecast
                differences easier to compare
              </p>
            </div>
          </div>

          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={dailyData}
                margin={{ top: 12, right: 18, left: 4, bottom: 8 }}
              >
                <CartesianGrid stroke="#e9edf3" strokeDasharray="4 4" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#788397", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "#dfe5ed" }}
                  minTickGap={12}
                />
                <YAxis
                  tick={{ fill: "#788397", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatNumber}
                  width={68}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e4e9f0",
                    boxShadow: "0 8px 28px #17203312",
                  }}
                  formatter={(value, name) => [
                    formatNumber(value),
                    name === "actual" ? "Actual daily average" : "Forecast daily average",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="forecast"
                  name="Forecast"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-placeholder">
              Daily summary will appear when evaluation records are available.
            </div>
          )}
        </section>

        <section className="chart-card">
          <div className="chart-header">
            <div>
              <h2>Days with the largest forecast errors</h2>
              <p>
                Ranked by daily MAE: average absolute error across the matched
                hourly observations for each day
              </p>
            </div>
          </div>

          {worstDays.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "14px",
                  minWidth: "560px",
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", color: "#788397" }}>
                    {[
                      "Rank",
                      "Date (UTC)",
                      "Actual average",
                      "Forecast average",
                      "Daily MAE",
                      "Average bias",
                    ].map((heading) => (
                      <th
                        key={heading}
                        style={{
                          padding: "13px 12px",
                          borderBottom: "1px solid #e9edf3",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {worstDays.map((day, index) => (
                    <tr key={day.day}>
                      <td style={{ padding: "13px 12px", borderBottom: "1px solid #eef1f5" }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: "13px 12px", borderBottom: "1px solid #eef1f5", fontWeight: 600 }}>
                        {formatDate(`${day.day}T00:00:00Z`)}
                      </td>
                      <td style={{ padding: "13px 12px", borderBottom: "1px solid #eef1f5" }}>
                        {formatNumber(day.actual)}
                      </td>
                      <td style={{ padding: "13px 12px", borderBottom: "1px solid #eef1f5" }}>
                        {formatNumber(day.forecast)}
                      </td>
                      <td style={{ padding: "13px 12px", borderBottom: "1px solid #eef1f5", fontWeight: 700 }}>
                        {formatNumber(day.dailyMae)}
                      </td>
                      <td
                        style={{
                          padding: "13px 12px",
                          borderBottom: "1px solid #eef1f5",
                          color: day.averageBias > 0 ? "#b45309" : day.averageBias < 0 ? "#0f766e" : "inherit",
                        }}
                      >
                        {formatBias(day.averageBias)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="chart-placeholder">
              Error ranking will appear when evaluation records are available.
            </div>
          )}

          <div className="method-note" style={{ marginTop: "14px" }}>
            Daily MAE measures the average size of hourly errors for that day.
            Average bias is forecast minus actual; positive values indicate
            over-forecasting on average and negative values indicate
            under-forecasting. These are diagnostic indicators, not direct
            estimates of financial loss or imbalance cost.
          </div>
        </section>

        <section className="bottom-grid">
          <div className="detail-card">
            <h2>Data completeness</h2>
            <p className="detail-description">
              Availability of matched hourly records
            </p>

            <div className="completeness-row">
              <div className="completeness-icon">
                <CheckCircle2 size={19} />
              </div>
              <div className="completeness-text">
                <strong>Missing actual hours</strong>
                <span>Observed wind generation</span>
              </div>
              <strong>{formatNumber(metrics.missing_actual_hours)}</strong>
            </div>

            <div className="completeness-row">
              <div className="completeness-icon">
                <CheckCircle2 size={19} />
              </div>
              <div className="completeness-text">
                <strong>Missing forecast hours</strong>
                <span>Forecast available by cutoff</span>
              </div>
              <strong>{formatNumber(metrics.missing_forecast_hours)}</strong>
            </div>
          </div>

          <div className="detail-card">
            <h2>Evaluation methodology</h2>
            <p className="detail-description">
              How forecast performance is assessed
            </p>

            <div className="method-row">
              <span>Forecast cutoff</span>
              <strong>Previous day, 12:00 UK</strong>
            </div>
            <div className="method-row">
              <span>Comparison interval</span>
              <strong>Hourly</strong>
            </div>
            <div className="method-row">
              <span>Actuals alignment</span>
              <strong>Mean of two half-hours</strong>
            </div>

            <div className="method-note">
              The previous-day noon cutoff is an evaluation assumption for this
              analysis, not a cutoff specified by the challenge.
            </div>
          </div>
        </section>

        <footer className="page-footer">
          <span>WindScope · UK Wind Generation Evaluation</span>
          <span>Data: Elexon / BMRS · January 2026</span>
        </footer>
      </main>
    </div>
  );
}
