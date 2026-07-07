import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import TopBar from "@/components/TopBar";
import { colors, fonts } from "@/constants/theme";
import { getPackageById, calcTotal, formatCurrency } from "@/utils/PackagesData";

const TIER_DOT_COLORS = {
  primary: colors.primary,
  platinum: "#E5E4E2",
  muted: colors.onSurfaceVariant,
};

export default function PackageDetail() {
  const { id } = useLocalSearchParams();
  const pkg = getPackageById(id);

  if (!pkg) {
    return (
      <View style={styles.root}>
        <TopBar />
        <View style={styles.content}>
          <View style={[styles.card, { gap: 12 }]}>
            <Text style={styles.title}>Package not found</Text>
            <Text style={styles.sub}>
              That package could not be loaded. Please return to the products screen.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={() => router.push("/(tabs)/products")}>
              <Text style={styles.primaryBtnText}>Back to products</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const total = calcTotal(pkg);

  return (
    <View style={styles.root}>
      <TopBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>Package Detail</Text>
            <Text style={styles.title}>{pkg.name}</Text>
            <Text style={styles.sub}>
              Review the package details below and continue to the QR checkout flow.
            </Text>
          </View>
        </View>

        <Pressable style={styles.secondaryBtn} onPress={() => router.push("/(tabs)/products")}>
          <Text style={styles.secondaryBtnText}>Back to Products</Text>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.tierRow}>
              <View
                style={[
                  styles.tierDot,
                  { backgroundColor: TIER_DOT_COLORS[pkg.tierColor] ?? colors.primary },
                ]}
              />
              <Text style={styles.tierLabel}>{pkg.tier}</Text>
            </View>
            <Text style={styles.price}>{formatCurrency(total)}</Text>
          </View>

          <View style={styles.detailBody}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Package</Text>
              <Text style={styles.detailValue}>{pkg.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quantity</Text>
              <Text style={styles.detailValue}>{pkg.quantity} codes</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Unit price</Text>
              <Text style={styles.detailValue}>{formatCurrency(pkg.price)} / code</Text>
            </View>
            <View style={[styles.detailRow, styles.detailTotal]}>
              <Text style={[styles.detailLabel, styles.detailTotalText]}>Total</Text>
              <Text style={[styles.detailValue, styles.detailTotalText]}>
                {formatCurrency(total)}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push(`/qr-payment/${pkg.id}`)}
          >
            <Text style={styles.primaryBtnText}>Continue to QR Payment</Text>
          </Pressable>
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
    gap: 16,
  },
  header: { flexDirection: "row", gap: 12 },
  eyebrow: {
    fontFamily: fonts.hankenBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.primary,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 24,
    color: colors.onSurface,
  },
  sub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  secondaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  card: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 20,
    gap: 18,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tierRow: {
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
  price: {
    fontFamily: fonts.jakartaBold,
    fontSize: 24,
    color: colors.primary,
  },
  detailBody: { gap: 10 },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(61, 74, 65, 0.2)",
  },
  detailLabel: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  detailTotal: { borderBottomWidth: 0, paddingBottom: 0 },
  detailTotalText: { color: colors.primary, fontSize: 16 },
  primaryBtn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  primaryBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 14,
    color: colors.onPrimaryContainer,
  },
});
