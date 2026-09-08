import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, PanResponder } from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

const RANGES = ["1D", "1W", "1M", "3M", "1Y", "5Y"];
const POINT_COUNTS = { "1D": 20, "1W": 28, "1M": 30, "3M": 45, "1Y": 52, "5Y": 60 };

// TEMP: placeholder conversion rate until the backend exposes a real
// GEMS-to-peso rate. This is what drives the "≈ ₱x.xx" line under the
// big GEMS number.
const GEM_TO_PHP_RATE = 1.4;

function formatPeso(value) {
  return "₱" + value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
// card by nudging its anchor point based on where it sits.
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
  const sameValue = geometry && geometry.maxPoint.value === geometry.minPoint.value;

  // Converts a raw touch X position into the nearest data point index.
  const indexFromTouchX = (x) => {
    if (!geometry) return null;
    const clampedX = Math.max(0, Math.min(chartW, x));
    const idx = Math.round(clampedX / geometry.stepX);
    return Math.max(0, Math.min(data.length - 1, idx));
  };

  // Rebuilds the touch handler whenever chartW or data changes, so it
  // never references stale (empty) values from before the chart
  // finished measuring/loading -- that was the actual bug.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // "Capture" variants claim the touch before it can reach the
        // parent ScrollView at all, and returning false from
        // onPanResponderTerminationRequest means once we've grabbed
        // it, nothing (including the ScrollView) can take it back
        // mid-drag. Together these stop the screen from scrolling
        // while scrubbing the chart.
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (evt) => {
          onScrubbingChange?.(true);
          setTouchIndex(indexFromTouchX(evt.nativeEvent.locationX));
        },
        onPanResponderMove: (evt) => setTouchIndex(indexFromTouchX(evt.nativeEvent.locationX)),
        onPanResponderRelease: () => {
          onScrubbingChange?.(false);
          setTouchIndex(null);
        },
        onPanResponderTerminate: () => {
          onScrubbingChange?.(false);
          setTouchIndex(null);
        },
      }),
    [chartW, data, onScrubbingChange]
  );

  const touchPoint =
    touchIndex !== null && geometry ? geometry.points[touchIndex] : null;

  const current = data ? data[data.length - 1] : null;
  const change = data ? current - data[0] : 0;
  const pct = data ? ((change / data[0]) * 100).toFixed(1) : "0.0";
  const positive = change >= 0;
  const changeColor = positive ? colors.primary : colors.danger;

  // While scrubbing, the big value swaps to whatever point is being
  // touched, same as most stock/price apps -- reverts once released.
  const displayValue = touchPoint ? touchPoint.value : current;
  const estimatedValue =
    displayValue !== null ? formatPeso(displayValue * GEM_TO_PHP_RATE) : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Gems</Text>
          <Text style={styles.title}>Gem value</Text>
        </View>
        <MaterialIcons name="diamond" size={22} color="#fff" />
      </View>

      <View
        style={styles.chartWrap}
        onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        {showChart && (
          <>
            <Svg width={chartW} height={CHART_H} pointerEvents="none">
              <Defs>
                <SvgLinearGradient id="gemAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="#ffffff" stopOpacity={0.18} />
                  <Stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                </SvgLinearGradient>
              </Defs>
              <Path d={geometry.areaPath} fill="url(#gemAreaFill)" />
              <Path
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
                  <Line
                    x1={touchPoint.x}
                    y1={CHART_PAD_TOP - 14}
                    x2={touchPoint.x}
                    y2={CHART_H}
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={1}
                    strokeDasharray="3,4"
                  />
                  <Circle cx={touchPoint.x} cy={touchPoint.y} r={4.5} fill="#fff" />
                </>
              )}
            </Svg>

            {/* High/low labels -- hidden while scrubbing so they don't
                collide visually with the touch tooltip below. pointerEvents
                "none" so they never intercept the scrub touch. */}
            {!touchPoint && (
              <>
                <View
                  pointerEvents="none"
                  style={[
                    styles.pointLabelWrap,
                    { top: geometry.maxPoint.y - 24 },
                    labelAlignStyle(geometry.maxPoint.x, chartW),
                  ]}
                >
                  <View style={styles.pointLabelChip}>
                    <Text style={styles.pointLabelText}>{geometry.maxPoint.value} GEMS</Text>
                  </View>
                </View>

                {!sameValue && (
                  <View
                    pointerEvents="none"
                    style={[
                      styles.pointLabelWrap,
                      { top: geometry.minPoint.y + 6 },
                      labelAlignStyle(geometry.minPoint.x, chartW),
                    ]}
                  >
                    <View style={styles.pointLabelChip}>
                      <Text style={styles.pointLabelText}>{geometry.minPoint.value} GEMS</Text>
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Scrub tooltip -- follows the touched point */}
            {touchPoint && (
              <View
                pointerEvents="none"
                style={[
                  styles.pointLabelWrap,
                  { top: Math.max(0, touchPoint.y - 26) },
                  labelAlignStyle(touchPoint.x, chartW),
                ]}
              >
                <View style={[styles.pointLabelChip, styles.touchChip]}>
                  <Text style={styles.pointLabelText}>{touchPoint.value} GEMS</Text>
                </View>
              </View>
            )}
          </>
        )}
      </View>

      <View style={styles.tabRow}>
        {RANGES.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[styles.tab, r === range && styles.tabActive]}
          >
            <Text style={[styles.tabText, r === range && styles.tabTextActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.statPanel}>
        <Text style={styles.bigValue}>
          {displayValue ?? "--"} <Text style={styles.bigValueUnit}>GEMS</Text>
        </Text>
        {estimatedValue && <Text style={styles.estimatedValue}>≈ {estimatedValue} estimated value</Text>}

        {touchPoint ? (
          <Text style={[styles.rangeLabel, styles.standaloneRangeLabel]}>
            Day {touchIndex + 1} of {range}
          </Text>
        ) : (
          <View style={styles.changeRow}>
            <MaterialIcons
              name={positive ? "north-east" : "south-east"}
              size={16}
              color={changeColor}
            />
            <Text style={[styles.changeText, { color: changeColor }]}>
              {positive ? "+" : ""}
              {change} ({positive ? "+" : ""}
              {pct}%)
            </Text>
            <Text style={styles.rangeLabel}>past {range}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.heroCard,
    borderRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 4,
  },
  eyebrow: {
    fontFamily: fonts.hankenMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.6)",
  },
  title: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 18,
    color: "#fff",
    marginTop: 2,
  },
  chartWrap: {
    height: CHART_H,
    marginHorizontal: 8,
    position: "relative",
  },
  pointLabelWrap: {
    position: "absolute",
  },
  pointLabelChip: {
    backgroundColor: "rgba(9, 18, 13, 0.55)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  touchChip: {
    backgroundColor: "rgba(9, 18, 13, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.5)",
  },
  pointLabelText: {
    fontFamily: fonts.hankenBold,
    fontSize: 11,
    color: "#ffffff",
  },
  tabRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
  tabTextActive: {
    color: colors.heroCard,
    fontFamily: fonts.hankenSemiBold,
  },
  statPanel: {
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  bigValue: {
    fontFamily: fonts.jakartaBold,
    fontSize: 32,
    color: "#fff",
    textAlign: "center",
  },
  bigValueUnit: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  estimatedValue: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
  },
  changeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
  },
  changeText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
  },
  rangeLabel: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },
  standaloneRangeLabel: {
    marginTop: 10,
  },
});
