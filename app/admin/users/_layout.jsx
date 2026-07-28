import { Stack } from "expo-router";

// Giving Users its own Stack (instead of "index" and "[id]" being
// flat sibling tab routes) means router.back() from the detail
// screen pops this local stack back to the Users list -- it won't
// resolve against the root Tabs' history and land you on Dashboard.
export default function UsersStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}