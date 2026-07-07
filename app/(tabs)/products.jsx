import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import TopBar from "@/components/TopBar";
import { colors, fonts } from "@/constants/theme";
// TEMP: this assumes you've copied your existing utils/PackagesData.js
// into the project unchanged -- it's plain JS (no DOM/CSS), so it
// ports over as-is, no conversion needed.
import { packages, calcTotal, formatCurrency } from "@/utils/PackagesData";

const TIER_DOT_COLORS = {
  primary: colors.primary,
  platinum: "#E5E4E2",
  muted: colors.onSurfaceVariant,
};

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
            Choose the code package that matches your networking tier.
          </Text>
        </View>

        <View style={styles.grid}>
          {packages.map((pkg) => (
            <Pressable
              key={pkg.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => router.push(`/package-detail/${pkg.id}`)}
            >
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.tierDot,
                    { backgroundColor: TIER_DOT_COLORS[pkg.tierColor] ?? colors.primary },
                  ]}
                />
                <Text style={styles.tierLabel}>{pkg.tier}</Text>
              </View>

              <Text style={styles.packageName}>{pkg.name}</Text>

              <View style={styles.rows}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Quantity</Text>
                  <Text style={styles.rowValue}>{pkg.quantity} codes</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Price</Text>
                  <Text style={styles.rowValue}>{formatCurrency(pkg.price)} / code</Text>
                </View>
                <View style={[styles.row, styles.rowTotal]}>
                  <Text style={styles.rowLabel}>Total</Text>
                  <Text style={styles.rowTotalValue}>{formatCurrency(calcTotal(pkg))}</Text>
                </View>
              </View>

              <View style={styles.cta}>
                <Text style={styles.ctaText}>View Package</Text>
                <MaterialIcons name="arrow-forward" size={14} color={colors.primary} />
              </View>
            </Pressable>
          ))}
        </View>
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
  header: { gap: 4 },
  title: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 26,
    color: colors.onSurface,
  },
  sub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  grid: { gap: 14 },
  card: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 18,
    gap: 10,
  },
  cardPressed: {
    backgroundColor: "rgba(47, 54, 49, 0.7)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tierLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.secondary,
  },
  packageName: {
    fontFamily: fonts.jakartaBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  rows: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 74, 65, 0.25)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  rowValue: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  rowTotal: {
    paddingTop: 6,
    marginTop: 2,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 74, 65, 0.25)",
  },
  rowTotalValue: {
    fontFamily: fonts.hankenBold,
    fontSize: 16,
    color: colors.primary,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  ctaText: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.primary,
  },
});
