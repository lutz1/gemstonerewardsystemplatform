import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

export default function ChangeTin() {
  const insets = useSafeAreaInsets();
  const [tin, setTin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    if (!tin) {
      setError("Please enter your TIN code.");
      return;
    }
    setSaving(true);
    try {
      // TEMP: replace with a real "update TIN" backend call.
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="close" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>TIN Code</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>TIN Code</Text>
            <View style={styles.fieldInputWrap}>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. 123-456-789"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                keyboardType="number-pad"
                value={tin}
                onChangeText={setTin}
              />
            </View>
            <Text style={styles.fieldHint}>
              Your Tax Identification Number, used for compliance and payout reporting.
            </Text>
          </View>

          <Pressable style={styles.submitBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#003921" size="small" />
            ) : (
              <Text style={styles.submitText}>SAVE CHANGES</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  content: { padding: 20, gap: 18 },
  errorBanner: {
    backgroundColor: "rgba(147, 0, 10, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 180, 171, 0.25)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    fontFamily: fonts.jetbrainsMedium,
    fontSize: 11,
    color: "#FFB4AB",
    textAlign: "center",
  },
  field: { gap: 6 },
  fieldLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldInputWrap: {
    borderRadius: 8,
    backgroundColor: "rgba(26, 33, 28, 0.5)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldInput: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  fieldHint: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontFamily: fonts.hankenBold,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.onPrimaryContainer,
  },
});
