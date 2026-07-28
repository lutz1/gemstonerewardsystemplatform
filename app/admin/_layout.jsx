import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { colors, fonts } from "@/constants/theme";

// Same tab bar visual language as the customer app's (tabs)/_layout.jsx,
// so it doesn't feel like a totally different product -- just a
// different set of destinations.
export default function AdminTabsLayout() {
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
          elevation: 20,
          zIndex: 30,
          shadowOpacity: 0,
          paddingBottom: 8,
          paddingTop: 6,
        },
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
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="group" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="codes/index"
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
      {/* Pending approval detail is reachable from the Codes tab, not
          shown as its own tab icon. */}
      <Tabs.Screen name="codes/pending" options={{ href: null }} />
      {/* Change Email / Change Password are reachable from the
          Profile tab, not shown as their own tab icons. */}
      <Tabs.Screen name="change-email" options={{ href: null }} />
      <Tabs.Screen name="change-password" options={{ href: null }} />
    </Tabs>
  );
}