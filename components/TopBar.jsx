import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/constants/theme";

const DEFAULT_AVATAR_URL =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=80&q=80";

/**
 * Shared top app bar. Same props as the web version, minus the ones
 * that don't apply on mobile (no href/anchor concept here).
 *
 * Note: on web this used `position: fixed` plus a padding-top hack on
 * the page below it. In React Native we don't need that trick — this
 * just renders as a normal element at the top of the screen's layout,
 * and the ScrollView content below it flows naturally underneath.
 */
export default function TopBar({
  logoText = "Gemstone Code",
  userName = "Alex Sterling",
  avatarUrl = DEFAULT_AVATAR_URL,
  showNotifDot = false,
  onNotifClick,
  onAvatarClick,
}) {
  const insets = useSafeAreaInsets();

  const handleAvatarPress = () => {
    if (onAvatarClick) {
      onAvatarClick();
    } else {
      router.push("/profile");
    }
  };

  const handleNotifPress = () => {
    if (onNotifClick) {
      onNotifClick();
    } else {
      router.push("/notification");
    }
  };

  return (
    <BlurView intensity={40} tint="dark" style={styles.topbar}>
      <View style={[styles.inner, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.logo}>{logoText}</Text>

        <View style={styles.right}>
          <Text style={styles.userName}>{userName}</Text>

          <Pressable
            onPress={handleNotifPress}
            style={styles.notifBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <MaterialIcons name="notifications" size={22} color={colors.primary} />
            {showNotifDot && <View style={styles.notifDot} />}
          </Pressable>

          <Pressable
            onPress={handleAvatarPress}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          </Pressable>
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  topbar: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    overflow: "hidden",
  },
  inner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  logo: {
    fontFamily: fonts.jakartaBold,
    fontSize: 20,
    color: colors.primary,
    letterSpacing: -0.4,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  userName: {
    fontFamily: fonts.jakartaBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  notifBtn: {
    position: "relative",
    padding: 4,
  },
  notifDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(89, 222, 155, 0.3)",
  },
});
