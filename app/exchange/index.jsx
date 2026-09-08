import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

const OPTIONS = [
  {
    key: "gems-to-wallet",
    icon: "sync-alt",
    title: "Exchange Gems to Wallet",
    caption: "Convert your GEM points into wallet balance.",
  },
  {
    key: "withdraw",
    icon: "arrow-upward",
    title: "Withdraw",
    caption: "Send your wallet balance to GCash or a bank account.",
  },
  {
    key: "deposit",
    icon: "arrow-downward",
    title: "Deposit",
    caption: "Top up your wallet via GCash or a bank transfer.",
  },
];

export default function ExchangeHub() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="close" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Exchange</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={styles.optionCard}
            onPress={() => router.push(`/exchange/${opt.key}`)}
          >
            <View style={styles.optionIconWrap}>
              <MaterialIcons name={opt.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>{opt.title}</Text>
              <Text style={styles.optionCaption}>{opt.caption}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.onSurfaceVariant} />
          </Pressable>
        ))}
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
  content: { padding: 16, gap: 12 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(47, 54, 49, 0.4)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
  },
  optionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: { flex: 1 },
  optionTitle: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  optionCaption: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
