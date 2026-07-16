import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

const METHODS = [
  { key: "gcash", label: "GCash", icon: "phone-android" },
  { key: "bank", label: "Bank Transfer", icon: "account-balance" },
];

export default function Deposit() {
  const insets = useSafeAreaInsets();
  const [method, setMethod] = useState("gcash");
  const [amount, setAmount] = useState("");
  const [gcashNumber, setGcashNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const handleSubmit = () => {
    // TEMP: no backend call wired here on purpose -- this is where a
    // real "record deposit" / payment-gateway API call goes once it exists.
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Deposit</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sub}>Top up your wallet via GCash or a bank transfer.</Text>

          <View style={styles.methodRow}>
            {METHODS.map((m) => (
              <Pressable
                key={m.key}
                style={[styles.methodTab, method === m.key && styles.methodTabActive]}
                onPress={() => setMethod(m.key)}
              >
                <MaterialIcons
                  name={m.icon}
                  size={18}
                  color={method === m.key ? colors.onPrimaryContainer : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.methodTabText,
                    method === m.key && styles.methodTabTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {method === "gcash" ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sending From (GCash Number)</Text>
              <View style={styles.fieldInputWrap}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. 0912 345 6789"
                  placeholderTextColor="rgba(188, 202, 190, 0.4)"
                  keyboardType="phone-pad"
                  value={gcashNumber}
                  onChangeText={setGcashNumber}
                />
              </View>
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Sending From (Bank Name)</Text>
              <View style={styles.fieldInputWrap}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g. BDO, BPI, Metrobank"
                  placeholderTextColor="rgba(188, 202, 190, 0.4)"
                  value={bankName}
                  onChangeText={setBankName}
                />
              </View>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.fieldInputWrap}>
              <Text style={styles.fieldPrefix}>₱</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="0.00"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Reference Number</Text>
              <Text style={styles.optionalTag}>Optional</Text>
            </View>
            <View style={styles.fieldInputWrap}>
              <TextInput
                style={styles.fieldInput}
                placeholder="Transaction reference number"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                value={referenceNumber}
                onChangeText={setReferenceNumber}
              />
            </View>
          </View>

          <Pressable style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>SUBMIT DEPOSIT</Text>
          </Pressable>
        </ScrollView>
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
  content: { padding: 20, gap: 16 },
  sub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  methodRow: {
    flexDirection: "row",
    gap: 10,
  },
  methodTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  methodTabText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  methodTabTextActive: {
    color: colors.onPrimaryContainer,
  },
  field: { gap: 6 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionalTag: {
    fontFamily: fonts.hankenRegular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(26, 33, 28, 0.5)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  fieldPrefix: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 15,
    color: colors.onSurfaceVariant,
    marginRight: 4,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: colors.onSurface,
    paddingVertical: 12,
  },
  submitBtn: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitText: {
    fontFamily: fonts.hankenBold,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.onPrimaryContainer,
  },
});
