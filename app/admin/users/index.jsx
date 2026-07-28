import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import AdminHeader from "@/components/AdminHeader";
import { colors, fonts } from "@/constants/theme";
import { users, formatPeso } from "@/utils/AdminMockData";

export default function UserManagement() {
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.root}>
      <AdminHeader title="User Management" sub={`${users.length} registered users`} />

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    marginBottom: 0,
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
  content: { padding: 16, paddingBottom: 100, gap: 10 },
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