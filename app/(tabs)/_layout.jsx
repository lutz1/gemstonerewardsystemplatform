import { Tabs } from "expo-router";
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
        tabBarBackground: () => (
          <BlurView intensity={50} tint="dark" style={{ flex: 1 }} />
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
