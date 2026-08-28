import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import AdminHeader from "@/components/AdminHeader";
import { colors, fonts } from "@/constants/theme";

export default function AdminProfile() {
  const { logout } = useAuth();

  return (
    <View style={styles.root}>
      <AdminHeader title="Admin Profile" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <MaterialIcons name="admin-panel-settings" size={28} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.name}>Gemstone Code Admin</Text>
            {/* TEMP: matches constants/adminCredentials.js -- replace
                once real admin accounts exist. */}
            <Text style={styles.email}>admin@gemstonecode.com</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Role</Text>
          <Text style={styles.panelValue}>Administrator</Text>
        </View>

        <View style={styles.settingsPanel}>
          <Pressable
            style={styles.settingsRow}
            onPress={() => router.push("/admin/change-email")}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialIcons name="alternate-email" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.settingsRowText}>Change Email</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
          </Pressable>

          <View style={styles.settingsDivider} />

          <Pressable
            style={styles.settingsRow}
            onPress={() => router.push("/admin/change-password")}
          >
            <View style={styles.settingsRowLeft}>
              <MaterialIcons name="lock-outline" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.settingsRowText}>Change Password</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <Pressable style={styles.signoutBtn} onPress={logout}>
          <MaterialIcons name="logout" size={18} color={colors.onSurface} />
          <Text style={styles.signoutBtnText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 100, gap: 16 },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(89, 222, 155, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  email: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  panel: {
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  panelTitle: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.secondary,
  },
  panelValue: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  settingsPanel: {
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  settingsRowText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: colors.borderFaint,
    marginLeft: 16,
  },
  signoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signoutBtnText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
});