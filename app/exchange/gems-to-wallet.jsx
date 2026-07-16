import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

// TEMP: placeholder rate, same one used on Dashboard's Gem Value chart --
// replace both with a real rate from the backend once it exists.
const GEM_TO_PHP_RATE = 1.4;

function formatPeso(value) {
  return "₱" + value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GemsToWallet() {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState("");
  const gemAmount = parseFloat(amount) || 0;
  const pesoEquivalent = gemAmount * GEM_TO_PHP_RATE;

  const handleConfirm = () => {
    // TEMP: no backend call wired here on purpose -- this is where a
    // real "exchange gems to wallet" API call goes once it exists.
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
          <Text style={styles.headerTitle}>Exchange Gems to Wallet</Text>
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sub}>
            Convert GEM points into wallet balance at the current exchange rate.
          </Text>

          <View style={styles.rateCard}>
            <MaterialIcons name="diamond" size={18} color={colors.primary} />
            <Text style={styles.rateText}>1 GEM ≈ {formatPeso(GEM_TO_PHP_RATE)}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Amount of GEMS</Text>
            <View style={styles.fieldInputWrap}>
              <TextInput
                style={styles.fieldInput}
                placeholder="0"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
              <Text style={styles.fieldSuffix}>GEMS</Text>
            </View>
          </View>

          <View style={styles.resultCard}>
            <Text style={styles.resultLabel}>You'll receive</Text>
            <Text style={styles.resultValue}>{formatPeso(pesoEquivalent)}</Text>
          </View>

          <Pressable
            style={[styles.submitBtn, gemAmount <= 0 && styles.submitBtnDisabled]}
            onPress={handleConfirm}
            disabled={gemAmount <= 0}
          >
            <Text style={styles.submitText}>CONFIRM EXCHANGE</Text>
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
    fontSize: 15,
    color: colors.onSurface,
    flex: 1,
    textAlign: "center",
  },
  content: { padding: 20, gap: 18 },
  sub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  rateCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(89, 222, 155, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.2)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rateText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
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
  fieldInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(26, 33, 28, 0.5)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 18,
    color: colors.onSurface,
    paddingVertical: 12,
  },
  fieldSuffix: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  resultCard: {
    backgroundColor: colors.glassPanel,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  resultLabel: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  resultValue: {
    fontFamily: fonts.jakartaBold,
    fontSize: 26,
    color: colors.primary,
  },
  submitBtn: {
    marginTop: 4,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: {
    fontFamily: fonts.hankenBold,
    fontSize: 14,
    letterSpacing: 0.5,
    color: colors.onPrimaryContainer,
  },
});
