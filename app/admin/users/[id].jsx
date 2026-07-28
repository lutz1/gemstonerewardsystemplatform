import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { users, formatPeso } from "@/utils/AdminMockData";

export default function AdminUserDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const user = users.find((u) => String(u.id) === String(id));

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Mirrors user.status so the toggle updates instantly here. We also
  // mutate the shared `user` object directly below (TEMP: stand-in for
  // a real backend) so the change is reflected back in the Users list
  // for the rest of this app session.
  const [status, setStatus] = useState(user?.status);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleSendResetLink = async () => {
    setSending(true);
    setSent(false);
    // TEMP: no backend yet -- this is where a real "send password
    // reset email" API call goes once one exists.
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSending(false);
    setSent(true);
  };

  const handleToggleStatus = async () => {
    setStatusLoading(true);
    // TEMP: no backend yet -- this is where a real "suspend/reactivate
    // user" API call goes once one exists. Mutating the mock object
    // directly so AdminMockData stays in sync across screens for now.
    await new Promise((resolve) => setTimeout(resolve, 500));
    const nextStatus = status === "suspended" ? "active" : "suspended";
    user.status = nextStatus;
    setStatus(nextStatus);
    setStatusLoading(false);
  };

  if (!user) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>User Not Found</Text>
          <View style={{ width: 22 }} />
        </View>
      </View>
    );
  }

  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>User Account</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
          <View
            style={[styles.statusPill, status === "suspended" && styles.statusPillSuspended]}
          >
            <Text
              style={[
                styles.statusPillText,
                status === "suspended" && styles.statusPillTextSuspended,
              ]}
            >
              {status === "suspended" ? "Suspended" : "Active"}
            </Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Account Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Joined</Text>
            <Text style={styles.detailValue}>{user.joinDate}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Total Spent</Text>
            <Text style={styles.detailValue}>{formatPeso(user.totalSpent)}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Account Status</Text>
          <Text style={styles.panelSub}>
            {status === "suspended"
              ? "This account is suspended and can't sign in or make purchases."
              : "This account is active and can sign in normally."}
          </Text>

          <Pressable
            style={[styles.statusBtn, status === "suspended" && styles.reactivateBtn]}
            onPress={handleToggleStatus}
            disabled={statusLoading}
          >
            {statusLoading ? (
              <ActivityIndicator
                color={status === "suspended" ? "#003921" : "#FFB4AB"}
                size="small"
              />
            ) : (
              <>
                <MaterialIcons
                  name={status === "suspended" ? "check-circle-outline" : "block"}
                  size={16}
                  color={status === "suspended" ? "#003921" : "#FFB4AB"}
                />
                <Text
                  style={[
                    styles.statusBtnText,
                    status === "suspended" && styles.reactivateBtnText,
                  ]}
                >
                  {status === "suspended" ? "REACTIVATE ACCOUNT" : "SUSPEND ACCOUNT"}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelLabel}>Account Actions</Text>
          <Text style={styles.panelSub}>
            Sends a password reset link to this user's email. They'll set their own new password
            from there — admins don't set it directly.
          </Text>

          {sent && (
            <View style={styles.successBanner}>
              <MaterialIcons name="check-circle" size={16} color={colors.primary} />
              <Text style={styles.successText}>Reset link sent to {user.email}</Text>
            </View>
          )}

          <Pressable
            style={styles.resetBtn}
            onPress={handleSendResetLink}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color="#003921" size="small" />
            ) : (
              <>
                <MaterialIcons name="mail-outline" size={16} color="#003921" />
                <Text style={styles.resetBtnText}>SEND PASSWORD RESET LINK</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  headerTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(89, 222, 155, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 14,
    color: colors.primary,
  },
  name: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  email: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(89, 222, 155, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.25)",
  },
  statusPillSuspended: {
    backgroundColor: "rgba(224, 133, 133, 0.12)",
    borderColor: "rgba(224, 133, 133, 0.3)",
  },
  statusPillText: {
    fontFamily: fonts.hankenBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.primary,
  },
  statusPillTextSuspended: {
    color: colors.danger,
  },
  panel: {
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  panelLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.secondary,
  },
  panelSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailKey: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.25)",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  successText: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    color: colors.primary,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 13,
  },
  resetBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: "#003921",
  },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(224, 133, 133, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(224, 133, 133, 0.3)",
    borderRadius: 8,
    paddingVertical: 13,
  },
  statusBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: "#FFB4AB",
  },
  reactivateBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reactivateBtnText: {
    color: "#003921",
  },
});