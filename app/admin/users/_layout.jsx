import { Stack } from "expo-router";

// Giving Users its own Stack (instead of "index" and "[id]" being
// flat sibling tab routes) means router.back() from the detail
// screen pops this local stack back to the Users list -- it won't
// resolve against the root Tabs' history and land you on Dashboard.
//
// password-resets lives in this same Stack (app/admin/user/password-reset.jsx).
// `animationDuration` isn't an actual native-stack option, so the
// earlier "fade" attempt was still running on the default ~300-350ms
// push timing -- that's the lag you were seeing. animation: "none"
// removes the push animation entirely, so it swaps instantly, the
// same way codes/pending does inside the Tabs (no nested Stack push
// to sit through there either).
export default function UsersStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen
        name="password-resets"
        options={{
          animation: "none",
        }}
      />
    </Stack>
  );
}