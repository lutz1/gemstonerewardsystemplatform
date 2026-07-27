import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants/theme";

export default function AdminHeader({ title, sub }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topRow}>
        <Text style={styles.logo}>Gemstone Code</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!sub && <Text style={styles.sub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  logo: {
    fontFamily: fonts.jakartaBold,
    fontSize: 18,
    color: colors.primary,
  },
  adminBadge: {
    backgroundColor: "rgba(232, 196, 104, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(232, 196, 104, 0.4)",
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  adminBadgeText: {
    fontFamily: fonts.hankenBold,
    fontSize: 10,
    letterSpacing: 1,
    color: "#E8C468",
  },
  title: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 22,
    color: colors.onSurface,
  },
  sub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
