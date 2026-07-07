import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import TopBar from "@/components/TopBar";
import { colors, fonts } from "@/constants/theme";

const GUIDE_IMG_URL =
  "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80";

// Placeholder trend data -- swap for real gem points history when available.
const gemPointsTrend = [38, 52, 34, 68, 48, 76, 58];

// Same geometry math as the web version -- this is plain JS, it ports
// over completely unchanged. Only the <svg>/<path> tags below become
// <Svg>/<Path> from react-native-svg.
const CHART_W = 320;
const CHART_H = 120;
const CHART_PAD_Y = 12;

function buildChartGeometry(data) {
  const max = Math.max(...data);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const stepX = CHART_W / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y =
      CHART_H -
      CHART_PAD_Y -
      ((v - min) / range) * (CHART_H - CHART_PAD_Y * 2);
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    `M${points[0].x.toFixed(1)},${CHART_H} ` +
    points.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") +
    ` L${points[points.length - 1].x.toFixed(1)},${CHART_H} Z`;

  return { points, linePath, areaPath };
}

export default function Dashboard() {
  const { points, linePath, areaPath } = buildChartGeometry(gemPointsTrend);

  return (
    <View style={styles.root}>
      <TopBar userName="Marcus" showNotifDot />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome */}
        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>Dashboard Overview</Text>
          <Text style={styles.hello}>Hello, Marcus</Text>
          <Text style={styles.welcomeSub}>
            Welcome back to your executive portal. Your network expanded by{" "}
            <Text style={{ color: colors.primary, fontFamily: fonts.hankenSemiBold }}>4%</Text> this
            week.
          </Text>
        </View>

        {/* Wallet & Gem Points */}
        <LinearGradient
          colors={["rgba(0,168,107,0.18)", "rgba(14,21,16,0.85)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.walletCard}
        >
          <View style={styles.walletTop}>
            <View style={styles.walletMain}>
              <View style={styles.walletIconRow}>
                <View style={styles.walletIconWrap}>
                  <MaterialIcons name="account-balance-wallet" size={18} color={colors.primary} />
                </View>
                <Text style={styles.walletLabel}>Wallet & Gem Points</Text>
              </View>
              <View style={styles.walletValues}>
                <View>
                  <Text style={styles.walletSublabel}>Wallet Balance</Text>
                  <Text style={styles.walletAmount}>12,450</Text>
                </View>
                <View>
                  <Text style={styles.walletSublabel}>Gem Points</Text>
                  <Text style={styles.walletAmount}>8,320</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.walletSide}>
            <Text style={styles.walletEstLabel}>ESTIMATED VALUE</Text>
            <Text style={styles.walletEstVal}>$1,245.00</Text>
            <Pressable style={styles.exchangeBtn}>
              <Text style={styles.exchangeBtnText}>Manage</Text>
              <MaterialIcons name="arrow-forward" size={18} color={colors.onPrimaryContainer} />
            </Pressable>
          </View>
        </LinearGradient>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={[styles.glassCard, styles.statMini]}>
            <View style={styles.statMiniIconWrap}>
              <MaterialIcons name="group" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.statMiniLabel}>Direct Referrals</Text>
              <Text style={styles.statMiniValue}>24</Text>
            </View>
          </View>
          <View style={[styles.glassCard, styles.statMini]}>
            <View style={[styles.statMiniIconWrap, styles.statMiniIconMuted]}>
              <MaterialIcons name="qr-code" size={20} color={colors.secondary} />
            </View>
            <View>
              <Text style={styles.statMiniLabel}>Purchase Codes</Text>
              <Text style={styles.statMiniValue}>05</Text>
            </View>
          </View>
        </View>

        <View style={[styles.glassCard, styles.referralCard]}>
          <View style={styles.referralInner}>
            <View style={styles.referralIconWrap}>
              <MaterialIcons name="campaign" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.referralTitle}>Referral Hub</Text>
              <Text style={styles.referralSub}>Earn 500 Gems per sign-up</Text>
            </View>
          </View>
          {/* TEMP: no referrals route in this project yet -- wire this
              up once you have one */}
          <Pressable
            style={styles.chevronBtn}
            accessibilityLabel="Go to referral hub"
          >
            <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {/* Gem points graph */}
        <View style={[styles.glassCard, styles.graphCard]}>
          <View style={styles.graphHeader}>
            <Text style={styles.graphTitle}>Gem Points Trend</Text>
            <Text style={styles.graphPeriod}>Last 7 Days</Text>
          </View>
          <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
            <Defs>
              <SvgLinearGradient id="gemLineAreaFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="rgba(89, 222, 155, 0.35)" />
                <Stop offset="100%" stopColor="rgba(89, 222, 155, 0)" />
              </SvgLinearGradient>
            </Defs>
            <Path d={areaPath} fill="url(#gemLineAreaFill)" />
            <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={4} fill={colors.background} stroke={colors.primary} strokeWidth={2.5} />
            ))}
          </Svg>
        </View>

        <Pressable style={styles.txLogsBtn} onPress={() => router.push("/(tabs)/purchase-codes")}>
          <MaterialIcons name="receipt-long" size={18} color={colors.primary} />
          <Text style={styles.txLogsBtnText}>View Transaction Logs</Text>
          <MaterialIcons name="arrow-forward" size={18} color={colors.primary} />
        </Pressable>

        {/* Insights & Alerts */}
        <Text style={styles.insightsTitle}>Insights & Alerts</Text>
        <View style={[styles.glassCard, styles.insightsCard]}>
          <View style={styles.insightRow}>
            <MaterialIcons name="error-outline" size={22} color={colors.tertiary} style={styles.insightIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.insightHeading}>Membership Renewal</Text>
              <Text style={styles.insightText}>
                Your Executive status expires in 12 days. Renew now for early-bird bonus.
              </Text>
              <Pressable>
                <Text style={styles.renewBtn}>RENEW STATUS</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.insightRow, styles.insightRowBorder]}>
            <MaterialIcons name="trending-up" size={22} color={colors.primary} style={styles.insightIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.insightHeading}>Market Insight</Text>
              <Text style={styles.insightText}>
                Gem value increased by 0.4% in the last 24 hours. High network volume detected.
              </Text>
            </View>
          </View>
        </View>

        {/* Guide image card */}
        <Pressable style={styles.imgCard}>
          <Image
            source={{ uri: GUIDE_IMG_URL }}
            style={styles.imgCardImage}
            contentFit="cover"
            contentPosition="center"
          />
          <LinearGradient
            colors={["transparent", colors.background]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.imgTextWrap}>
            <Text style={styles.imgEyebrow}>New Resource</Text>
            <Text style={styles.imgHeading}>Executive Network Guide 2024</Text>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 100,
    gap: 20,
  },
  glassCard: {
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 8,
  },

  welcome: { gap: 4 },
  eyebrow: {
    fontFamily: fonts.hankenMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.primary,
  },
  hello: {
    fontFamily: fonts.jakartaBold,
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.onSurface,
  },
  welcomeSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },

  walletCard: {
    borderRadius: 8,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(198, 198, 198, 0.15)",
  },
  walletTop: { flexDirection: "row" },
  walletMain: { flex: 1 },
  walletIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  walletIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(89, 222, 155, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  walletLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  walletValues: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginTop: 8,
  },
  walletSublabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  walletAmount: {
    fontFamily: fonts.jakartaBold,
    fontSize: 26,
    color: colors.onSurface,
    marginTop: 4,
  },
  walletSide: { gap: 4, marginTop: 8 },
  walletEstLabel: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  walletEstVal: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  exchangeBtn: {
    marginTop: 8,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "flex-start",
  },
  exchangeBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 14,
    color: colors.onPrimaryContainer,
  },

  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statMini: {
    flex: 1,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statMiniIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(89, 222, 155, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  statMiniIconMuted: {
    backgroundColor: "rgba(198, 198, 198, 0.08)",
  },
  statMiniLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  statMiniValue: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 19,
    color: colors.onSurface,
  },

  referralCard: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  referralInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexShrink: 1,
  },
  referralIconWrap: {
    padding: 8,
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    borderRadius: 8,
  },
  referralTitle: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  referralSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  chevronBtn: { padding: 4 },

  graphCard: { padding: 20, gap: 16 },
  graphHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  graphTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  graphPeriod: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },

  txLogsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.25)",
    backgroundColor: "rgba(89, 222, 155, 0.06)",
  },
  txLogsBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.primary,
  },

  insightsTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  insightsCard: { padding: 20, gap: 20 },
  insightRow: { flexDirection: "row", gap: 14 },
  insightRowBorder: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
  },
  insightIcon: { marginTop: 2 },
  insightHeading: {
    fontFamily: fonts.hankenMedium,
    fontSize: 14,
    color: colors.onSurface,
  },
  insightText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 16,
  },
  renewBtn: {
    fontFamily: fonts.hankenBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.primary,
    marginTop: 12,
  },

  imgCard: {
    borderRadius: 8,
    overflow: "hidden",
    aspectRatio: 16 / 9,
  },
  imgCardImage: {
    width: "100%",
    height: "100%",
  },
  imgTextWrap: {
    position: "absolute",
    bottom: 14,
    left: 14,
    right: 14,
  },
  imgEyebrow: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.primary,
    marginBottom: 4,
  },
  imgHeading: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 18,
    color: "#FFFFFF",
  },
});
