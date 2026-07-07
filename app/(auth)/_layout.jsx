import { Stack } from "expo-router";

// Layout for everything inside (auth) — currently just Login.
// No tab bar here since the user isn't signed in yet.
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
