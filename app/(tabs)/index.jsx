import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import TopBar from "@/components/TopBar";
import GemValueChart from "@/components/GemValueChart";
import { colors, fonts } from "@/constants/theme";

const GUIDE_IMG = require("../../assets/images/bg_belowdashboard.png");

export default function Dashboard() {
  // While the user is scrubbing the chart, the page's own scroll gets
  // fully disabled -- this is what actually stops the parent screen
  // from moving during a drag, rather than relying on gesture
  // negotiation alone (which Android in particular doesn't always honor).
  const [chartScrubbing, setChartScrubbing] = useState(false);

  return (
    <View style={styles.root}>
      <TopBar userName="Marcus" showNotifDot />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!chartScrubbing}
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
        <View style={styles.walletGlowWrap}>
          <LinearGradient
            colors={["#1B7A4F", "#0A2E1F"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            {/* Decorative watermark, purely visual depth */}
            <MaterialIcons
              name="diamond"
              size={140}
              color="rgba(255,255,255,0.06)"
              style={styles.walletWatermark}
            />

            <View style={styles.walletTop}>
              <View style={styles.walletMain}>
                <View style={styles.walletIconRow}>
                  <View style={styles.walletIconWrap}>
                    <MaterialIcons name="account-balance-wallet" size={18} color="#fff" />
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
            {/* Exchange: converts Gem Points into wallet balance -- also
                where top-up and withdraw live once those are built out. */}
            <Pressable style={styles.exchangeBtn} onPress={() => router.push("/exchange")}>
              <MaterialIcons name="swap-horiz" size={18} color="#003921" />
              <Text style={styles.exchangeBtnText}>Exchange</Text>
            </Pressable>
          </LinearGradient>
        </View>

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

        {/* Whole row navigates, not just the chevron -- Purchase Codes
            is where the referral link itself lives. */}
        <Pressable
          style={[styles.glassCard, styles.referralCard]}
          onPress={() => router.push("/(tabs)/purchase-codes")}
        >
          <View style={styles.referralInner}>
            <View style={styles.referralIconWrap}>
              <MaterialIcons name="campaign" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.referralTitle}>Referral Hub</Text>
              <Text style={styles.referralSub}>Earn 500 Gems per sign-up</Text>
            </View>
          </View>
          <View style={styles.chevronBtn}>
            <MaterialIcons name="chevron-right" size={22} color={colors.primary} />
          </View>
        </Pressable>

        {/* Gem value chart */}
        <GemValueChart onScrubbingChange={setChartScrubbing} />

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
            source={GUIDE_IMG}
            style={styles.imgCardImage}
            contentFit="cover"
            contentPosition={{ top: "90%", left: "50%" }}
          />
          <LinearGradient
            colors={["transparent", colors.background]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.imgTextWrap}>
            <Text style={styles.imgEyebrow}>Gem Resource</Text>
            <Text style={styles.imgHeading}>Go Mine, Go Exchange, Go Earn</Text>
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

  walletGlowWrap: {
    borderRadius: 14,
    shadowColor: "#59DE9B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  walletCard: {
    borderRadius: 14,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.3)",
    overflow: "hidden",
    position: "relative",
  },
  walletWatermark: {
    position: "absolute",
    right: -24,
    bottom: -24,
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
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
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
  exchangeBtn: {
    marginTop: 4,
    backgroundColor: "#59DE9B",
    borderRadius: 8,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#59DE9B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
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
