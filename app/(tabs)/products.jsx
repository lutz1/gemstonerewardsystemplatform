import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import TopBar from "@/components/TopBar";
import { colors, fonts } from "@/constants/theme";
import { packages, formatCurrency } from "@/utils/PackagesData";

const TIER_CARD_BG = {
  emerald: require("../../assets/images/emerald_card_products.png"),
  sapphire: require("../../assets/images/sapphire_card_products.png"),
  diamond: require("../../assets/images/diamond_card_products.png"),
};

// ── Adjustable background crop position ─────────────────────────────
// Same idea as the Login/Dashboard background images -- if a gem photo's
// interesting part isn't centered, nudge its entry here.
const TIER_BG_POSITION = {
  emerald: { top: "50%", left: "50%" },
  sapphire: { top: "50%", left: "50%" },
  diamond: { top: "50%", left: "50%" },
};

// Where the clear "spotlight" of the vignette is centered -- should
// roughly match where the gem itself sits in each photo. cy is lower
// than 50% here since these renders tend to have the gem sitting a
// little above true center, with empty space below it.
const VIGNETTE_CENTER = { cx: "50%", cy: "40%", r: "62%" };
// ─────────────────────────────────────────────────────────────────────

function FeatureRow({ text }) {
  return (
    <View style={styles.featureRow}>
      <MaterialIcons name="check-circle" size={13} color="#59DE9B" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export default function Products() {
  return (
    <View style={styles.root}>
      <TopBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Products</Text>
          <Text style={styles.sub}>
            Choose the membership tier that matches your networking goals.
          </Text>
        </View>

        <View style={styles.list}>
          {packages.map((pkg) => (
            <View key={pkg.id} style={styles.cardGlowWrap}>
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/package-detail/${pkg.id}`)}
              >
                <Image
                  source={TIER_CARD_BG[pkg.tierColor]}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  contentPosition={TIER_BG_POSITION[pkg.tierColor]}
                  // These are local require()'d assets, so this is
                  // basically instant either way, but fading in
                  // (rather than popping in) reads smoother, and
                  // memory-disk caching avoids any re-decode cost if
                  // this screen unmounts/remounts while switching tabs.
                  transition={150}
                  cachePolicy="memory-disk"
                />

                {/* Vignette: clear in the middle (where the gem sits),
                    darkens toward the edges. This is what keeps the
                    gem's highlight instead of dulling the whole photo. */}
                <Svg style={StyleSheet.absoluteFill}>
                  <Defs>
                    <RadialGradient
                      id={`vignette-${pkg.id}`}
                      cx={VIGNETTE_CENTER.cx}
                      cy={VIGNETTE_CENTER.cy}
                      r={VIGNETTE_CENTER.r}
                    >
                      <Stop offset="0%" stopColor="#040806" stopOpacity={0} />
                      <Stop offset="55%" stopColor="#040806" stopOpacity={0} />
                      <Stop offset="100%" stopColor="#040806" stopOpacity={0.82} />
                    </RadialGradient>
                  </Defs>
                  <Rect x="0" y="0" width="100%" height="100%" fill={`url(#vignette-${pkg.id})`} />
                </Svg>

                {/* Small extra boost just at the bottom strip, so the
                    feature list text stays legible regardless of how
                    large the vignette's clear zone is. */}
                <LinearGradient
                  colors={["transparent", "rgba(4,8,6,0.85)"]}
                  locations={[0.6, 1]}
                  style={StyleSheet.absoluteFill}
                />

                <View style={styles.cardContent}>
                  <View style={styles.topRow}>
                    <View style={styles.tierTag}>
                      <Text style={styles.tierTagText}>{pkg.tier}</Text>
                    </View>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceTagText}>{formatCurrency(pkg.price)}</Text>
                    </View>
                  </View>

                  <View style={styles.bottomBlock}>
                    <Text style={styles.tierSub}>MEMBERSHIP</Text>
                    <View style={styles.featureList}>
                      <FeatureRow text={`${pkg.totalGems} Total GEMS`} />
                      <FeatureRow text={`${pkg.dailyGems} GEMS Daily Rewards`} />
                      {pkg.features.map((f) => (
                        <FeatureRow key={f} text={f} />
                      ))}
                    </View>
                  </View>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 100 },
  header: { paddingHorizontal: 16, gap: 4, marginBottom: 16 },
  title: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 24,
    color: colors.onSurface,
  },
  sub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  list: {
    paddingHorizontal: 16,
    gap: 18,
  },
  // Outer wrapper carries the glow -- NOT clipped, so the shadow can
  // actually render outside the card's edges instead of being cut off.
  cardGlowWrap: {
    borderRadius: 14,
    shadowColor: "#59DE9B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10, // Android fallback -- won't be colored, but keeps a lift
  },
  // Inner card IS clipped, for the rounded-corner image/gradient.
  card: {
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.heroCard, // shows briefly while the image loads
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.3)",
  },
  cardContent: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tierTag: {
    backgroundColor: "rgba(9, 18, 13, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.4)",
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  tierTagText: {
    fontFamily: fonts.hankenBold,
    fontSize: 11,
    letterSpacing: 1,
    color: "#59DE9B",
  },
  priceTag: {
  backgroundColor: "rgba(9, 18, 13, 0.6)",
  borderWidth: 1,
  borderColor: "rgba(89, 222, 155, 0.4)",
  borderRadius: 999,
  paddingVertical: 5,
  paddingHorizontal: 12,
},
priceTagText: {
  fontFamily: fonts.jakartaBold,
  fontSize: 13,
  color: "#59DE9B",
},
  bottomBlock: {
    gap: 8,
  },
  tierSub: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.6)",
  },
  featureList: {
    gap: 6,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featureText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    flexShrink: 1,
  },
});