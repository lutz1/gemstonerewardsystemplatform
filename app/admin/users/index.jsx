import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AdminHeader from "@/components/AdminHeader";
import { colors, fonts } from "@/constants/theme";
import { users, formatPeso } from "@/utils/AdminMockData";
import { passwordResetRequests } from "@/utils/PasswordResetRequests";

const SORT_OPTIONS = [
  { key: "alpha", label: "Alphabetical (A–Z)" },
  { key: "joined", label: "Date Joined" },
];

export default function UserManagement() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  let filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (sortBy === "alpha") {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "joined") {
    // Assumes joinDate is a parseable date string. If your mock data
    // uses a different format, this sort may not land in the order
    // you expect -- worth double-checking joinDate's format in
    // AdminMockData if so.
    filtered = [...filtered].sort((a, b) => new Date(a.joinDate) - new Date(b.joinDate));
  }

  return (
    <View style={styles.root}>
      <AdminHeader title="User Management" sub={`${users.length} registered users`} />

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor="rgba(188, 202, 190, 0.4)"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View>
          <Pressable
            style={[styles.sortBtn, sortBy && styles.sortBtnActive]}
            onPress={() => setSortMenuOpen((v) => !v)}
          >
            <MaterialIcons
              name="sort"
              size={18}
              color={sortBy ? colors.onPrimaryContainer : colors.onSurfaceVariant}
            />
          </Pressable>

          {sortMenuOpen && (
            <View style={styles.sortMenu}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={styles.sortMenuItem}
                  onPress={() => {
                    setSortBy(sortBy === opt.key ? null : opt.key);
                    setSortMenuOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortMenuItemText,
                      sortBy === opt.key && styles.sortMenuItemTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {sortBy === opt.key && (
                    <MaterialIcons name="check" size={16} color={colors.primary} />
                  )}
                </Pressable>
              ))}
              {sortBy && (
                <Pressable
                  style={[styles.sortMenuItem, styles.sortMenuClear]}
                  onPress={() => {
                    setSortBy(null);
                    setSortMenuOpen(false);
                  }}
                >
                  <Text style={styles.sortMenuClearText}>Clear sort</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Password Reset Requests -- tap to open the full list, same
            pattern as Codes' "Pending Approval" -> pending.jsx */}
        {passwordResetRequests.length > 0 && (
          <Pressable
            style={styles.resetPanel}
            onPress={() => router.push("/admin/users/password-resets")}
          >
            <View style={styles.resetPanelTop}>
              <View style={styles.resetPanelTitleRow}>
                <MaterialIcons name="lock-reset" size={18} color="#E8C468" />
                <Text style={styles.resetPanelTitle}>Password Reset Requests</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.resetPanelSub}>
              {passwordResetRequests.length} awaiting approval — tap to view and manage.
            </Text>
          </Pressable>
        )}

        {filtered.map((u) => (
          <Pressable
            style={({ pressed }) => [styles.userCard, pressed && styles.userCardPressed]}
            key={u.id}
            onPress={() => router.push(`/admin/users/${u.id}`)}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{u.name}</Text>
              <Text style={styles.userEmail}>{u.email}</Text>
              <Text style={styles.userMeta}>Joined {u.joinDate} · {formatPeso(u.totalSpent)} spent</Text>
            </View>
            <View
              style={[
                styles.statusPill,
                u.status === "suspended" && styles.statusPillSuspended,
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  u.status === "suspended" && styles.statusPillTextSuspended,
                ]}
              >
                {u.status === "suspended" ? "Suspended" : "Active"}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        ))}

        {filtered.length === 0 && (
          <Text style={styles.emptyText}>No users match "{search}".</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    marginBottom: 0,
    zIndex: 10,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(26, 33, 28, 0.6)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
  },
  sortBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(26, 33, 28, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  sortBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortMenu: {
    position: "absolute",
    top: 46,
    right: 0,
    minWidth: 190,
    backgroundColor: "#161D18",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 4,
    zIndex: 20,
  },
  sortMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sortMenuItemText: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  sortMenuItemTextActive: {
    color: colors.onSurface,
    fontFamily: fonts.hankenSemiBold,
  },
  sortMenuClear: {
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
    marginTop: 2,
  },
  sortMenuClearText: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    color: colors.danger,
  },
  content: { padding: 16, paddingBottom: 100, gap: 10 },
  // Summary card -- same shape/role as Codes' "Pending Approval"
  // sectionCard on the codes overview screen.
  resetPanel: {
    backgroundColor: "rgba(232, 196, 104, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(232, 196, 104, 0.25)",
    borderRadius: 12,
    padding: 16,
    gap: 4,
    marginBottom: 6,
  },
  resetPanelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resetPanelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resetPanelTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  resetPanelSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 14,
  },
  userCardPressed: {
    backgroundColor: "rgba(26, 33, 28, 0.9)",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(89, 222, 155, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontFamily: fonts.jakartaBold,
    fontSize: 13,
    color: colors.primary,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  userEmail: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  userMeta: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
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
  emptyText: {
    textAlign: "center",
    padding: 32,
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});