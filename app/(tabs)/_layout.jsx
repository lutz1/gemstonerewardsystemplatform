import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { colors, fonts } from "@/constants/theme";

// This whole file replaces BottomNav.jsx — there's no separate
// component to import into each screen anymore. Expo Router renders
// this bar automatically around every screen inside (tabs).
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontFamily: fonts.hankenMedium,
          fontSize: 11,
        },
        tabBarStyle: {
          position: "absolute",
          height: 64,
          borderTopWidth: 1,
          borderTopColor: "rgba(89, 222, 155, 0.15)",
          backgroundColor: "transparent",
          elevation: 0, // removes Android's default shadow so the blur reads cleanly
        },
        // Renders behind the tab bar content — this is the BlurView
        // doing the same job as `backdrop-filter: blur(24px)` did.
        //
        // On iOS this is a native UIVisualEffectView and is cheap.
        // On Android, expo-blur's default implementation has to
        // recompute the blur as content scrolls underneath this
        // absolute-positioned bar, which is the actual source of the
        // scroll jank on Products/Profile -- not anything in those
        // screens themselves. `experimentalBlurMethod="dimezisBlurView"`
        // swaps in a real-time native blur renderer on Android (SDK
        // 51+ / Android 12+) that doesn't have that recompute cost.
        // Falls back to the default method automatically on older
        // devices/SDKs.
        tabBarBackground: () => (
          <BlurView
            intensity={50}
            tint="dark"
            style={{ flex: 1 }}
            experimentalBlurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="inventory" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="purchase-codes"
        options={{
          title: "Codes",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}