import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AdminHeader from "@/components/AdminHeader";
import { colors, fonts } from "@/constants/theme";
import { pendingApprovals, users, purchaseTotalsByTier, formatPeso } from "@/utils/AdminMockData";
import { passwordResetRequests } from "@/utils/PasswordResetRequests";

export default function AdminDashboard() {
  const totalRevenue = purchaseTotalsByTier.reduce((sum, t) => sum + t.total, 0);
  const activeUsers = users.filter((u) => u.status === "active").length;

  return (
    <View style={styles.root}>
      <AdminHeader title="Dashboard" sub="Overview of platform activity." />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons name="pending-actions" size={20} color="#E8C468" />
            <Text style={styles.statValue}>{pendingApprovals.length}</Text>
            <Text style={styles.statLabel}>Pending Approvals</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="group" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{activeUsers}</Text>
            <Text style={styles.statLabel}>Active Users</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="payments" size={20} color={colors.primary} />
            <Text style={styles.statValue}>{formatPeso(totalRevenue)}</Text>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="qr-code" size={20} color={colors.primary} />
            <Text style={styles.statValue}>
              {purchaseTotalsByTier.reduce((sum, t) => sum + t.count, 0)}
            </Text>
            <Text style={styles.statLabel}>Codes Purchased</Text>
          </View>
        </View>

        <Pressable style={styles.pendingCard} onPress={() => router.push("/admin/codes/pending")}>
          <View style={styles.pendingCardTop}>
            <Text style={styles.pendingCardTitle}>Pending Approval</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
          </View>
          <Text style={styles.pendingCardSub}>
            {pendingApprovals.length} payments waiting for confirmation
          </Text>
          {pendingApprovals.slice(0, 3).map((p) => (
            <View style={styles.pendingRow} key={p.id}>
              <View>
                <Text style={styles.pendingRowName}>{p.customerName}</Text>
                <Text style={styles.pendingRowTier}>{p.tier} · {p.date}</Text>
              </View>
              <Text style={styles.pendingRowAmount}>{formatPeso(p.amount)}</Text>
            </View>
          ))}
        </Pressable>

        {/* Password Reset Requests -- same card layout as Pending
            Approval above, so both "things awaiting action" read the
            same way on the dashboard. */}
        {passwordResetRequests.length > 0 && (
          <Pressable
            style={styles.pendingCard}
            onPress={() => router.push("/admin/users/password-resets")}
          >
            <View style={styles.pendingCardTop}>
              <Text style={styles.pendingCardTitle}>Password Reset Requests</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.pendingCardSub}>
              {passwordResetRequests.length} requests awaiting approval
            </Text>
            {passwordResetRequests.slice(0, 3).map((r) => (
              <View style={styles.pendingRow} key={r.id}>
                <View>
                  <Text style={styles.pendingRowName}>{r.customerName}</Text>
                  <Text style={styles.pendingRowTier}>{r.email} · {r.requestedAt}</Text>
                </View>
              </View>
            ))}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  statValue: {
    fontFamily: fonts.jakartaBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  statLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  pendingCard: {
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  pendingCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pendingCardTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  pendingCardSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
  },
  pendingRowName: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  pendingRowTier: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  pendingRowAmount: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 13,
    color: "#E8C468",
  },
});