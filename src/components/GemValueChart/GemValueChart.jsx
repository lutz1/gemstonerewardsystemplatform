import { useEffect, useRef, useState } from "react";
import { MdDiamond, MdNorthEast, MdSouthEast } from "react-icons/md";
import "./GemValueChart.css";

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "5Y"];
const POINT_COUNTS = {
  "1D": 20,
  "1W": 28,
  "1M": 30,
  "3M": 45,
  "1Y": 52,
  "5Y": 60,
};

// TEMP: placeholder conversion rate until the backend exposes a real
// GEMS-to-peso rate. This is what drives the "≈ ₱x.xx" line under the
// big GEMS number.
const GEM_TO_PHP_RATE = 1.4;

function formatPeso(value) {
  return (
    "₱" +
    value.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const CHART_H = 160;
const CHART_PAD_TOP = 34; // room for the high-value label overlay
const CHART_PAD_BOTTOM = 30; // room for the low-value label overlay

// TEMP: replace this with a real API call keyed by `range` once gem value
// history exists on the backend. Keeping this async-shaped (returns a
// Promise) means swapping it out later is a one-function change --
// nothing in the component below needs to know the difference.
function fetchGemValueHistory(range) {
  const points = POINT_COUNTS[range];
  const data = [50];
  for (let i = 1; i < points; i++) {
    const drift = Math.sin(i / 4) * 3.6;
    const noise = (Math.random() - 0.5) * 6;
    data.push(Math.max(10, Math.round(data[i - 1] + drift + noise)));
  }
  return Promise.resolve(data);
}

// chartW is the MEASURED pixel width of the chart area, not a fixed
// constant -- that's what makes the label/touch overlay line up
// exactly with the line underneath it, regardless of screen size.
function buildChartGeometry(data, chartW) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = chartW / (data.length - 1);
  const usableH = CHART_H - CHART_PAD_TOP - CHART_PAD_BOTTOM;

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: CHART_PAD_TOP + usableH - ((v - min) / range) * usableH,
    value: v,
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

// Keeps a floating label from clipping off the left/right edge of the
// card by nudging its anchor point based on where it sits. Returns a
// plain CSS style object (was an RN style array before).
function labelAlignStyle(x, chartW) {
  if (x < 36) return { left: 0, alignItems: "flex-start" };
  if (x > chartW - 36) return { right: 0, alignItems: "flex-end" };
  return { left: x - 40, width: 80, alignItems: "center" };
}

export default function GemValueChart({ onScrubbingChange }) {
  const [range, setRange] = useState("1M");
  const [data, setData] = useState(null);
  const [chartW, setChartW] = useState(0);
  const [touchIndex, setTouchIndex] = useState(null); // scrub state, null when not touching

  const chartWrapRef = useRef(null);
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
    let cancelled = false;
    setTouchIndex(null); // clear any scrub state when the range changes
    fetchGemValueHistory(range).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const showChart = data && chartW > 0;
  const geometry = showChart ? buildChartGeometry(data, chartW) : null;
  geometryRef.current = geometry;
  const sameValue =
    geometry && geometry.maxPoint.value === geometry.minPoint.value;

  // Converts a raw pointer X position (relative to the chart wrap) into
  // the nearest data point index.
  const indexFromTouchX = (x) => {
    const g = geometryRef.current;
    if (!g || !data) return null;
    const clampedX = Math.max(0, Math.min(chartW, x));
    const idx = Math.round(clampedX / g.stepX);
    return Math.max(0, Math.min(data.length - 1, idx));
  };

  const pointerXFromEvent = (e) => {
    const rect = chartWrapRef.current.getBoundingClientRect();
    return e.clientX - rect.left;
  };

  // Pointer events are the web equivalent of PanResponder here: they fire
  // for mouse, touch and pen alike, so no separate touch handling is
  // needed. setPointerCapture keeps receiving move/up events even if the
  // pointer leaves the element mid-drag, matching the "once grabbed,
  // nothing takes it back" behavior the RN version got from
  // onPanResponderTerminationRequest returning false.
  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onScrubbingChange?.(true);
    setTouchIndex(indexFromTouchX(pointerXFromEvent(e)));
  };

  const handlePointerMove = (e) => {
    if (e.buttons === 0 && e.pointerType !== "touch") return; // not dragging
    setTouchIndex(indexFromTouchX(pointerXFromEvent(e)));
  };

  const endScrub = () => {
    onScrubbingChange?.(false);
    setTouchIndex(null);
  };

  const touchPoint =
    touchIndex !== null && geometry ? geometry.points[touchIndex] : null;

  const current = data ? data[data.length - 1] : null;
  const change = data ? current - data[0] : 0;
  const pct = data ? ((change / data[0]) * 100).toFixed(1) : "0.0";
  const positive = change >= 0;
  const changeColorVar = positive
    ? "var(--color-primary)"
    : "var(--color-danger)";

  // While scrubbing, the big value swaps to whatever point is being
  // touched, same as most stock/price apps -- reverts once released.
  const displayValue = touchPoint ? touchPoint.value : current;
  const estimatedValue =
    displayValue !== null ? formatPeso(displayValue * GEM_TO_PHP_RATE) : null;

  return (
    <div className="gem-chart">
      <div className="gem-chart__header">
        <div>
          <span className="gem-chart__eyebrow">Gems</span>
          <h3 className="gem-chart__title">Gem value</h3>
        </div>
        <MdDiamond size={22} color="#fff" />
      </div>

      <div
        className="gem-chart__chart-wrap"
        ref={chartWrapRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        onPointerLeave={endScrub}
      >
        {showChart && (
          <>
            <svg width={chartW} height={CHART_H} className="gem-chart__svg">
              <defs>
                <linearGradient id="gemAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path d={geometry.areaPath} fill="url(#gemAreaFill)" />
              <path
                d={geometry.linePath}
                fill="none"
                stroke="#59DE9B"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Scrub indicator: vertical guide line + dot at the
                  touched point. Only rendered while actively touching. */}
              {touchPoint && (
                <>
                  <line
                    x1={touchPoint.x}
                    y1={CHART_PAD_TOP - 14}
                    x2={touchPoint.x}
                    y2={CHART_H}
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={1}
                    strokeDasharray="3,4"
                  />
                  <circle
                    cx={touchPoint.x}
                    cy={touchPoint.y}
                    r={4.5}
                    fill="#fff"
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
                    ...labelAlignStyle(geometry.maxPoint.x, chartW),
                  }}
                >
                  <div className="gem-chart__point-label-chip">
                    <span className="gem-chart__point-label-text">
                      {geometry.maxPoint.value} GEMS
                    </span>
                  </div>
                </div>

                {!sameValue && (
                  <div
                    className="gem-chart__point-label-wrap"
                    style={{
                      top: geometry.minPoint.y + 6,
                      ...labelAlignStyle(geometry.minPoint.x, chartW),
                    }}
                  >
                    <div className="gem-chart__point-label-chip">
                      <span className="gem-chart__point-label-text">
                        {geometry.minPoint.value} GEMS
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
                  ...labelAlignStyle(touchPoint.x, chartW),
                }}
              >
                <div className="gem-chart__point-label-chip gem-chart__touch-chip">
                  <span className="gem-chart__point-label-text">
                    {touchPoint.value} GEMS
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="gem-chart__tab-row">
        {RANGES.map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setRange(r)}
            className={`gem-chart__tab${r === range ? " gem-chart__tab--active" : ""}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="gem-chart__stat-panel">
        <p className="gem-chart__big-value">
          {displayValue ?? "--"}{" "}
          <span className="gem-chart__big-value-unit">GEMS</span>
        </p>
        {estimatedValue && (
          <p className="gem-chart__estimated-value">
            ≈ {estimatedValue} estimated value
          </p>
        )}

        {touchPoint ? (
          <p className="gem-chart__range-label gem-chart__standalone-range-label">
            Day {touchIndex + 1} of {range}
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
