import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

const CURRENT_EMAIL = "admin@gemstonecode.com";

export default function AdminChangeEmail() {
  const insets = useSafeAreaInsets();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!newEmail || !password) {
      setError("Please fill in both fields.");
      return;
    }
    setLoading(true);
    try {
      // TEMP: no backend yet -- this is where a real "update admin
      // email" API call goes once one exists.
      await new Promise((resolve) => setTimeout(resolve, 700));
      setSuccess(true);
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.replace("/admin/profile")} hitSlop={8}>
          <MaterialIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Change Email</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.currentLabel}>Current Email</Text>
        <Text style={styles.currentValue}>{CURRENT_EMAIL}</Text>

        {!!error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={styles.successBanner}>
            <MaterialIcons name="check-circle" size={16} color={colors.primary} />
            <Text style={styles.successText}>Email updated successfully.</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>New Email</Text>
          <TextInput
            style={styles.input}
            placeholder="new-admin@email.com"
            placeholderTextColor="rgba(188, 202, 190, 0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newEmail}
            onChangeText={setNewEmail}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••••••"
            placeholderTextColor="rgba(188, 202, 190, 0.4)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Pressable style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#003921" size="small" />
          ) : (
            <Text style={styles.submitText}>SAVE CHANGES</Text>
          )}
        </Pressable>
      </View>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  headerTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  content: { padding: 20, gap: 14 },
  currentLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.secondary,
  },
  currentValue: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
    marginBottom: 10,
  },
  errorBanner: {
    backgroundColor: "rgba(147, 0, 10, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 180, 171, 0.25)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    color: "#FFB4AB",
    textAlign: "center",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.25)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  successText: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    color: colors.primary,
  },
  field: { gap: 6 },
  fieldLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: colors.onSurface,
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  submitBtn: {
    marginTop: 6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  submitText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: "#003921",
  },
});