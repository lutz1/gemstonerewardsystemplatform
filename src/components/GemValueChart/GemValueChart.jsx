import { getFunctions, httpsCallable } from "firebase/functions";
import { useEffect, useId, useRef, useState } from "react";
import {
  MdDiamond,
  MdNorthEast,
  MdSettings,
  MdSouthEast,
} from "react-icons/md";
import { app } from "../../firebase";
import "./GemValueChart.css";

const RANGES = ["15M", "1H", "6H", "12H", "1D", "1W", "1M", "3M", "1Y", "ALL"];
const CANDLE_INTERVALS = [
  { label: "1m", milliseconds: 60 * 1000 },
  { label: "5m", milliseconds: 5 * 60 * 1000 },
  { label: "15m", milliseconds: 15 * 60 * 1000 },
  { label: "30m", milliseconds: 30 * 60 * 1000 },
  { label: "1H", milliseconds: 60 * 60 * 1000 },
  { label: "4H", milliseconds: 4 * 60 * 60 * 1000 },
  { label: "1D", milliseconds: 24 * 60 * 60 * 1000 },
];

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPoint(value, currency) {
  return value == null
    ? "—"
    : formatCurrency(value, currency);
}

function formatCompactValue(value) {
  return value == null
    ? "—"
    : value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
}

function formatPointDateTime(timestamp) {
  if (timestamp == null) return null;

  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;

  return {
    date: new Intl.DateTimeFormat("en-PH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

const CHART_H = 160;
const CHART_PAD_TOP = 34; // room for the high-value label overlay
const CHART_PAD_BOTTOM = 30; // room for the low-value label overlay
const PRICE_SCALE_W = 56;

// chartW is the MEASURED pixel width of the chart area, not a fixed
// constant -- that's what makes the label/touch overlay line up
// exactly with the line underneath it, regardless of screen size.
function buildChartGeometry(data, chartW) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;
  const usableH = CHART_H - CHART_PAD_TOP - CHART_PAD_BOTTOM;

  const points = data.map((v, i) => ({
    x: data.length > 1 ? i * stepX : chartW / 2,
    y: CHART_PAD_TOP + usableH - ((v - min) / range) * usableH,
    value: v,
    sourceIndex: i,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `M${points[0].x.toFixed(1)},${CHART_H} ` +
    points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L${points[points.length - 1].x.toFixed(1)},${CHART_H} Z`;

  const maxPoint = points.reduce((a, b) => (b.value > a.value ? b : a));
  const minPoint = points.reduce((a, b) => (b.value < a.value ? b : a));

  return { points, linePath, areaPath, maxPoint, minPoint, stepX };
}

function buildCandleGeometry(data, timestamps, intervalMs, chartW) {
  const buckets = new Map();
  data.forEach((value, index) => {
    const timestamp = timestamps[index];
    const bucket = Number.isFinite(timestamp)
      ? Math.floor(timestamp / intervalMs) * intervalMs
      : index;
    const candle = buckets.get(bucket);
    if (candle) {
      candle.high = Math.max(candle.high, value);
      candle.low = Math.min(candle.low, value);
      candle.close = value;
      candle.sourceIndex = index;
    } else {
      buckets.set(bucket, {
        open: value,
        high: value,
        low: value,
        close: value,
        sourceIndex: index,
      });
    }
  });
  const candles = Array.from(buckets.values());

  const max = Math.max(...candles.map((candle) => candle.high));
  const min = Math.min(...candles.map((candle) => candle.low));
  const range = max - min || 1;
  const usableH = CHART_H - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const yForValue = (value) =>
    CHART_PAD_TOP + usableH - ((value - min) / range) * usableH;
  const stepX = chartW / candles.length;
  const positionedCandles = candles.map((candle, index) => ({
    ...candle,
    x: (index + 0.5) * stepX,
    openY: yForValue(candle.open),
    highY: yForValue(candle.high),
    lowY: yForValue(candle.low),
    closeY: yForValue(candle.close),
  }));
  const points = positionedCandles.map((candle) => ({
    x: candle.x,
    y: candle.closeY,
    value: candle.close,
    sourceIndex: candle.sourceIndex,
  }));
  const maxPoint = positionedCandles.reduce(
    (highest, candle) => candle.high > highest.value
      ? { x: candle.x, y: candle.highY, value: candle.high }
      : highest,
    { x: positionedCandles[0].x, y: positionedCandles[0].highY, value: positionedCandles[0].high },
  );
  const minPoint = positionedCandles.reduce(
    (lowest, candle) => candle.low < lowest.value
      ? { x: candle.x, y: candle.lowY, value: candle.low }
      : lowest,
    { x: positionedCandles[0].x, y: positionedCandles[0].lowY, value: positionedCandles[0].low },
  );

  return { candles: positionedCandles, points, maxPoint, minPoint, stepX };
}

// Keeps a floating label from clipping off the left/right edge of the
// card by nudging its anchor point based on where it sits. Returns a
// plain CSS style object (was an RN style array before).
function labelAlignStyle(x, chartW) {
  if (x < 36) return { left: 0, alignItems: "flex-start" };
  if (x > chartW - 36) {
    return { right: PRICE_SCALE_W + 4, alignItems: "flex-end" };
  }
  return { left: x - 40, width: 80, alignItems: "center" };
}

export default function GemValueChart({
  onScrubbingChange,
  refreshKey = 0,
  variant = "default",
}) {
  const settingsPanelId = useId();
  const [range, setRange] = useState("1M");
  const [chartType, setChartType] = useState("line");
  const [candleInterval, setCandleInterval] = useState("1H");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [data, setData] = useState(null);
  const [timestamps, setTimestamps] = useState([]);
  const [currency, setCurrency] = useState("PHP");
  const [error, setError] = useState("");
  const [chartW, setChartW] = useState(0);
  const [touchIndex, setTouchIndex] = useState(null); // scrub state, null when not touching
  const [scrollLeft, setScrollLeft] = useState(0);

  const chartWrapRef = useRef(null);
  const chartScrollRef = useRef(null);
  const settingsRef = useRef(null);
  const settingsButtonRef = useRef(null);
  const panStartRef = useRef(null);
  const geometryRef = useRef(null); // lets the pointer handlers read fresh geometry without re-subscribing

  // Measure the chart wrap's width -- the web equivalent of RN's onLayout.
  // ResizeObserver keeps it correct across window resizes / orientation
  // changes, not just on mount.
  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setChartW(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!settingsOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [settingsOpen]);

  useEffect(() => {
    let cancelled = false;
    setTouchIndex(null); // clear any scrub state when the range changes
    setScrollLeft(0);
    setError("");
    setData(null);
    setTimestamps([]);
    const getGemValueHistory = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getGemValueHistory",
    );

    getGemValueHistory({ range })
      .then(({ data: result }) => {
        if (cancelled) return;
        setCurrency(result?.currency || "PHP");
        const points = (result?.points || [])
          .map((point) => ({
            value: Number(point.value),
            timestamp: point.recordedAt == null ? null : Number(point.recordedAt),
          }))
          .filter((point) => Number.isFinite(point.value));
        setData(points.length ? points.map((point) => point.value) : [0]);
        setTimestamps(points.length ? points.map((point) => point.timestamp) : [null]);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load GEM value history.");
      });
    return () => {
      cancelled = true;
    };
  }, [range, refreshKey]);

  const showChart = data?.length > 0 && chartW > 0;
  const chartContentW = showChart
    ? Math.max(chartW, data.length * 4)
    : chartW;
  const isScrollable = chartContentW > chartW;
  const selectedCandleInterval = CANDLE_INTERVALS.find(
    (interval) => interval.label === candleInterval,
  );
  const geometry = showChart
    ? chartType === "candle"
      ? buildCandleGeometry(data, timestamps, selectedCandleInterval.milliseconds, chartContentW)
      : buildChartGeometry(data, chartContentW)
    : null;
  geometryRef.current = geometry;

  useEffect(() => {
    const scrollElement = chartScrollRef.current;
    if (!scrollElement || !showChart) return;
    scrollElement.scrollLeft = scrollElement.scrollWidth;
    setScrollLeft(scrollElement.scrollLeft);
  }, [chartContentW, showChart]);
  const sameValue =
    geometry && geometry.maxPoint.value === geometry.minPoint.value;
  const priceTicks = geometry
    ? Array.from({ length: 5 }, (_, index) => {
      const fraction = index / 4;
      const value = geometry.maxPoint.value
        + (geometry.minPoint.value - geometry.maxPoint.value) * fraction;
      const y = CHART_PAD_TOP
        + (CHART_H - CHART_PAD_TOP - CHART_PAD_BOTTOM) * fraction;

      return { value, y };
    })
    : [];

  // Converts a raw pointer X position (relative to the chart content) into
  // the nearest data point index.
  const indexFromTouchX = (x) => {
    const g = geometryRef.current;
    if (!g || !data) return null;
    const clampedX = Math.max(0, Math.min(chartContentW, x));
    const idx = g.stepX === 0
      ? 0
      : chartType === "candle"
        ? Math.floor(clampedX / g.stepX)
        : Math.round(clampedX / g.stepX);
    return Math.max(0, Math.min(g.points.length - 1, idx));
  };

  const pointerXFromEvent = (e) => {
    const scrollElement = chartScrollRef.current;
    const rect = scrollElement.getBoundingClientRect();
    return e.clientX - rect.left + scrollElement.scrollLeft;
  };

  // Pointer events are the web equivalent of PanResponder here: they fire
  // for mouse, touch and pen alike, so no separate touch handling is
  // needed. setPointerCapture keeps receiving move/up events even if the
  // pointer leaves the element mid-drag, matching the "once grabbed,
  // nothing takes it back" behavior the RN version got from
  // onPanResponderTerminationRequest returning false.
  const handlePointerDown = (e) => {
    if (isScrollable) {
      panStartRef.current = {
        clientX: e.clientX,
        scrollLeft: chartScrollRef.current.scrollLeft,
        moved: false,
      };
      if (e.pointerType !== "touch") {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } else {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    onScrubbingChange?.(true);
    setTouchIndex(indexFromTouchX(pointerXFromEvent(e)));
  };

  const handlePointerMove = (e) => {
    if (isScrollable && panStartRef.current && e.pointerType !== "touch") {
      const panStart = panStartRef.current;
      const deltaX = e.clientX - panStart.clientX;
      if (e.buttons !== 0 && Math.abs(deltaX) > 4) {
        panStart.moved = true;
      }
      if (panStart.moved) {
        const scrollElement = chartScrollRef.current;
        scrollElement.scrollLeft = panStart.scrollLeft - deltaX;
        setScrollLeft(scrollElement.scrollLeft);
        setTouchIndex(null);
        return;
      }
    }
    if (e.buttons === 0 && e.pointerType !== "touch") return; // not dragging
    setTouchIndex(indexFromTouchX(pointerXFromEvent(e)));
  };

  const endScrub = () => {
    panStartRef.current = null;
    onScrubbingChange?.(false);
    setTouchIndex(null);
  };

  const handleChartScroll = (e) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  const isViewingHistory = isScrollable
    && scrollLeft < chartContentW - chartW - 1;
  const historyIndex = isViewingHistory
    ? indexFromTouchX(scrollLeft + chartW - PRICE_SCALE_W)
    : null;
  const touchPoint =
    touchIndex !== null && geometry
      ? geometry.points[touchIndex]
      : historyIndex !== null && geometry
        ? geometry.points[historyIndex]
        : null;
  const touchDateTime = touchPoint
    ? formatPointDateTime(timestamps[touchPoint.sourceIndex])
    : null;

  const current = data?.length ? data[data.length - 1] : null;
  const change = data?.length ? current - data[0] : 0;
  const pct = data?.length && data[0] !== 0
    ? ((change / data[0]) * 100).toFixed(1)
    : "0.0";
  const positive = change >= 0;
  const isAdminVariant = variant === "admin";
  const changeColorVar = positive
    ? (isAdminVariant ? "var(--gem-chart-positive)" : "var(--color-primary)")
    : (isAdminVariant ? "var(--gem-chart-negative)" : "var(--color-danger)");
  const lineColor = isAdminVariant
    ? "var(--gem-chart-positive)"
    : "var(--color-primary)";

  // While scrubbing, the big value swaps to whatever point is being
  // touched, same as most stock/price apps -- reverts once released.
  const displayValue = touchPoint ? touchPoint.value : current;
  return (
    <div className={`gem-chart${isAdminVariant ? " gem-chart--admin" : ""}`}>
      <div className="gem-chart__header">
        <div>
          <span className="gem-chart__eyebrow">Gems</span>
          <h3 className="gem-chart__title">GEM value</h3>
        </div>
        <div className="gem-chart__header-actions">
          <div className="gem-chart__settings" ref={settingsRef}>
            <button
              ref={settingsButtonRef}
              type="button"
              className="gem-chart__settings-button"
              aria-label="Chart settings"
              aria-expanded={settingsOpen}
              aria-controls={settingsPanelId}
              title="Chart settings"
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <MdSettings size={19} aria-hidden="true" />
            </button>
            <div
              className="gem-chart__settings-panel"
              id={settingsPanelId}
              hidden={!settingsOpen}
            >
              <div className="gem-chart__settings-section">
                <span className="gem-chart__control-label">Chart type:</span>
                <div
                  className="gem-chart__type-controls"
                  role="group"
                  aria-label="Chart type"
                >
                  <button
                    type="button"
                    className={`gem-chart__type-button${chartType === "line" ? " gem-chart__type-button--active" : ""}`}
                    onClick={() => {
                      setChartType("line");
                      setTouchIndex(null);
                    }}
                    aria-label="Line chart"
                    aria-pressed={chartType === "line"}
                    title="Line chart"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 17l6-6 4 3 8-9" />
                      <path d="M15 5h6v6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={`gem-chart__type-button${chartType === "candle" ? " gem-chart__type-button--active" : ""}`}
                    onClick={() => {
                      setChartType("candle");
                      setTouchIndex(null);
                    }}
                    aria-label="Candlestick chart"
                    aria-pressed={chartType === "candle"}
                    title="Candlestick chart"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 3v4m0 6v8M12 2v3m0 10v7M18 4v5m0 6v5" />
                      <rect x="4" y="7" width="4" height="6" rx="0.5" />
                      <rect x="10" y="5" width="4" height="10" rx="0.5" />
                      <rect x="16" y="9" width="4" height="6" rx="0.5" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="gem-chart__range-controls gem-chart__settings-section">
                <span className="gem-chart__control-label">Range:</span>
                <div
                  className="gem-chart__tab-row"
                  role="group"
                  aria-label="Chart range"
                >
                  {RANGES.map((r) => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setRange(r)}
                      className={`gem-chart__tab${r === range ? " gem-chart__tab--active" : ""}`}
                      aria-pressed={r === range}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {chartType === "candle" && (
                <div className="gem-chart__candle-controls gem-chart__settings-section">
                  <span className="gem-chart__control-label">Candles:</span>
                  <div
                    className="gem-chart__interval-row"
                    role="group"
                    aria-label="Candle interval"
                  >
                    {CANDLE_INTERVALS.map(({ label }) => (
                      <button
                        type="button"
                        key={label}
                        onClick={() => {
                          setCandleInterval(label);
                          setTouchIndex(null);
                        }}
                        className={`gem-chart__tab${label === candleInterval ? " gem-chart__tab--active" : ""}`}
                        aria-pressed={label === candleInterval}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <MdDiamond
            size={22}
            color={isAdminVariant ? "var(--gem-chart-positive)" : "var(--color-primary)"}
            aria-hidden="true"
          />
        </div>
      </div>

      <div
        className={`gem-chart__chart-wrap${isScrollable ? " gem-chart__chart-wrap--history" : ""}`}
        ref={chartWrapRef}
      >
        {error && <p className="gem-chart__message">{error}</p>}
        {!error && data === null && (
          <p className="gem-chart__message">Loading value history...</p>
        )}
        {showChart && (
          <>
            <div
              className={`gem-chart__scroll${isScrollable ? " gem-chart__scroll--history" : ""}`}
              ref={chartScrollRef}
              role="region"
              aria-label={isScrollable
                ? `GEM value chart for ${range}. Drag or scroll horizontally to explore past values.`
                : `GEM value chart for ${range}`}
              tabIndex={isScrollable ? 0 : undefined}
              onScroll={handleChartScroll}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endScrub}
              onPointerCancel={endScrub}
              onPointerLeave={isScrollable ? undefined : endScrub}
            >
            <div
              className="gem-chart__scroll-content"
              style={{ width: chartContentW }}
            >
            <svg width={chartContentW} height={CHART_H} className="gem-chart__svg">
              <g className="gem-chart__grid" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((index) => {
                  const y = CHART_PAD_TOP
                    + ((CHART_H - CHART_PAD_TOP - CHART_PAD_BOTTOM) / 4) * index;
                  const x = (chartContentW / 4) * index;

                  return (
                    <g key={index}>
                      <line x1={0} y1={y} x2={chartContentW} y2={y} />
                      <line
                        x1={x}
                        y1={CHART_PAD_TOP}
                        x2={x}
                        y2={CHART_H - CHART_PAD_BOTTOM}
                      />
                    </g>
                  );
                })}
              </g>
              {chartType === "line" ? (
                <>
                  <defs>
                    <linearGradient id="gemAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={isAdminVariant ? "var(--gem-chart-positive)" : "var(--color-primary)"}
                        stopOpacity={isAdminVariant ? 0.22 : 0.18}
                      />
                      <stop
                        offset="100%"
                        stopColor={isAdminVariant ? "var(--gem-chart-positive)" : "var(--color-primary)"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <path d={geometry.areaPath} fill="url(#gemAreaFill)" />
                  <path
                    d={geometry.linePath}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {!touchPoint && (
                    <>
                      <circle
                        className="gem-chart__endpoint-pulse"
                        cx={geometry.points[geometry.points.length - 1].x}
                        cy={geometry.points[geometry.points.length - 1].y}
                        r={4}
                      />
                      <circle
                        cx={geometry.points[geometry.points.length - 1].x}
                        cy={geometry.points[geometry.points.length - 1].y}
                        r={3}
                        fill={lineColor}
                      />
                    </>
                  )}
                </>
              ) : (
                geometry.candles.map((candle, index) => {
                  const rising = candle.close >= candle.open;
                  const color = isAdminVariant
                    ? (rising ? "#08a77c" : "#f04452")
                    : (rising ? lineColor : "#F47777");
                  const bodyTop = Math.min(candle.openY, candle.closeY);
                  const bodyHeight = Math.max(2, Math.abs(candle.closeY - candle.openY));
                  const bodyWidth = Math.max(2, Math.min(10, geometry.stepX * 0.62));

                  return (
                    <g key={`${index}-${candle.x}`}>
                      <line
                        x1={candle.x}
                        y1={candle.highY}
                        x2={candle.x}
                        y2={candle.lowY}
                        stroke={color}
                        strokeWidth={1.5}
                      />
                      <rect
                        x={candle.x - bodyWidth / 2}
                        y={bodyTop}
                        width={bodyWidth}
                        height={bodyHeight}
                        fill={color}
                        rx={1}
                      />
                    </g>
                  );
                })
              )}

              {/* Scrub indicator: vertical guide line + dot at the
                  touched point. Only rendered while actively touching. */}
              {touchPoint && (
                <>
                  <line
                    x1={touchPoint.x}
                    y1={CHART_PAD_TOP - 14}
                    x2={touchPoint.x}
                    y2={CHART_H}
                    stroke={isAdminVariant
                      ? "rgba(191, 205, 198, 0.5)"
                      : "var(--color-primary)"}
                    strokeOpacity={isAdminVariant ? 1 : 0.35}
                    strokeWidth={1}
                    strokeDasharray="3,4"
                  />
                  <circle
                    cx={touchPoint.x}
                    cy={touchPoint.y}
                    r={4.5}
                    fill={lineColor}
                  />
                </>
              )}
            </svg>
            {/* High/low labels -- hidden while scrubbing so they don't
                collide visually with the touch tooltip below. pointer-events
                none so they never intercept the scrub touch. */}
            {!touchPoint && (
              <>
                <div
                  className="gem-chart__point-label-wrap"
                  style={{
                    top: geometry.maxPoint.y - 24,
                    ...labelAlignStyle(geometry.maxPoint.x, chartContentW),
                  }}
                >
                  <div className="gem-chart__point-label-chip">
                    <span className="gem-chart__point-label-text">
                      {formatPoint(geometry.maxPoint.value, currency)}
                    </span>
                  </div>
                </div>

                {!sameValue && (
                  <div
                    className="gem-chart__point-label-wrap"
                    style={{
                      top: geometry.minPoint.y + 6,
                      ...labelAlignStyle(geometry.minPoint.x, chartContentW),
                    }}
                  >
                    <div className="gem-chart__point-label-chip">
                      <span className="gem-chart__point-label-text">
                        {formatPoint(geometry.minPoint.value, currency)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Scrub tooltip -- follows the touched point */}
            {touchPoint && (
              <div
                className="gem-chart__point-label-wrap"
                style={{
                  top: Math.max(0, touchPoint.y - 26),
                  ...labelAlignStyle(touchPoint.x, chartContentW),
                }}
              >
                <div className="gem-chart__point-label-chip gem-chart__touch-chip">
                  <span className="gem-chart__point-label-text">
                    {formatPoint(touchPoint.value, currency)}
                  </span>
                  {touchDateTime && (
                    <span className="gem-chart__touch-datetime">
                      <span>{touchDateTime.date}</span>
                      <span>{touchDateTime.time}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
            </div>
            </div>
            <div
              className="gem-chart__price-scale"
              role="group"
              aria-label={`Price scale in ${currency}`}
            >
              {priceTicks.map((tick, index) => (
                <span
                  className="gem-chart__price-tick"
                  key={index}
                  style={{ top: tick.y }}
                >
                  {formatCurrency(tick.value, currency)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="gem-chart__stat-panel">
        <p className="gem-chart__big-value">
          {formatCompactValue(displayValue)}{" "}
          <span className="gem-chart__big-value-unit">{currency}</span>
        </p>

        {touchPoint ? (
          <p className="gem-chart__range-label gem-chart__standalone-range-label">
            {chartType === "candle" ? "Candle" : "Day"} {touchIndex + 1} of {range}
          </p>
        ) : (
          <div className="gem-chart__change-row">
            {positive ? (
              <MdNorthEast size={16} color={changeColorVar} />
            ) : (
              <MdSouthEast size={16} color={changeColorVar} />
            )}
            <span
              className="gem-chart__change-text"
              style={{ color: changeColorVar }}
            >
              {positive ? "+" : ""}
              {change} ({positive ? "+" : ""}
              {pct}%)
            </span>
            <span className="gem-chart__range-label">past {range}</span>
          </div>
        )}
      </div>
    </div>
  );
}
