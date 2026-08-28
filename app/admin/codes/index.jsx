import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AdminHeader from "@/components/AdminHeader";
import { colors, fonts } from "@/constants/theme";
import { pendingApprovals, purchaseTotalsByTier, formatPeso } from "@/utils/AdminMockData";

const TIER_COLOR = {
  Emerald: "#59DE9B",
  Sapphire: "#5B9BFF",
  Diamond: "#E8E8EA",
};

export default function AdminCodesOverview() {
  const totalCount = purchaseTotalsByTier.reduce((sum, t) => sum + t.count, 0);
  const totalRevenue = purchaseTotalsByTier.reduce((sum, t) => sum + t.total, 0);

  return (
    <View style={styles.root}>
      <AdminHeader title="Purchase Codes" sub="Approvals and purchase totals across all tiers." />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pending Approval -- tap to expand into the full filterable list */}
        <Pressable style={styles.sectionCard} onPress={() => router.push("/admin/codes/pending")}>
          <View style={styles.sectionTop}>
            <View style={styles.sectionTitleRow}>
              <MaterialIcons name="pending-actions" size={18} color="#E8C468" />
              <Text style={styles.sectionTitle}>Pending Approval</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
          </View>
          <Text style={styles.sectionSub}>
            {pendingApprovals.length} payments awaiting confirmation — tap to view and filter the
            full list.
          </Text>
        </Pressable>

        {/* Total Code Purchase -- overall total + 3-tier sub-category breakdown */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <MaterialIcons name="bar-chart" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>Total Code Purchase</Text>
          </View>
          <Text style={styles.sectionSub}>All-time totals across every membership tier.</Text>

          <View style={styles.totalsSummary}>
            <View>
              <Text style={styles.totalsLabel}>Total Codes Sold</Text>
              <Text style={styles.totalsValue}>{totalCount}</Text>
            </View>
            <View>
              <Text style={styles.totalsLabel}>Total Revenue</Text>
              <Text style={styles.totalsValue}>{formatPeso(totalRevenue)}</Text>
            </View>
          </View>

          <View style={styles.tierList}>
            {purchaseTotalsByTier.map((t) => (
              <View style={styles.tierRow} key={t.tier}>
                <View style={styles.tierRowLeft}>
                  <View style={[styles.tierDot, { backgroundColor: TIER_COLOR[t.tier] }]} />
                  <Text style={styles.tierName}>{t.tier}</Text>
                </View>
                <Text style={styles.tierCount}>{t.count} codes</Text>
                <Text style={styles.tierTotal}>{formatPeso(t.total)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  sectionCard: {
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  sectionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  sectionSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  totalsSummary: {
    flexDirection: "row",
    gap: 28,
    marginTop: 14,
    marginBottom: 6,
  },
  totalsLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.secondary,
    marginBottom: 4,
  },
  totalsValue: {
    fontFamily: fonts.jakartaBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  tierList: {
    marginTop: 10,
    gap: 2,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
  },
  tierRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierName: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  tierCount: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginRight: 16,
  },
  tierTotal: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 13,
    color: colors.primary,
    minWidth: 90,
    textAlign: "right",
  },
});
