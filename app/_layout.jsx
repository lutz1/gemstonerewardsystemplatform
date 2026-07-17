import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
} from "@expo-google-fonts/hanken-grotesk";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// Keeps the native splash screen up while fonts load, instead of
// flashing unstyled system-font text for a frame.
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="package-detail/[id]" />
        <Stack.Screen name="qr-payment/[id]" />
        <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="change-password" options={{ presentation: "modal" }} />
        <Stack.Screen name="change-tin" options={{ presentation: "modal" }} />
        <Stack.Screen name="notification" options={{ presentation: "modal" }} />
        <Stack.Screen name="exchange/index" />
        <Stack.Screen name="exchange/gems-to-wallet" />
        <Stack.Screen name="exchange/withdraw" />
        <Stack.Screen name="exchange/deposit" />
      </Stack.Protected>

      {/* (auth) no longer has its own _layout.jsx, so it's purely
          organizational now (like exchange/) rather than a nested
          navigator -- that's what makes each screen inside it
          individually addressable here. login and forgot-password
          stay guarded to logged-out only. Same fast fade as register
          below, instead of the default native-stack slide-in (which
          runs ~300-350ms and reads as sluggish for a simple auth
          hand-off between screens). */}
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen
          name="(auth)/login"
          options={{ animation: "fade", animationDuration: 180 }}
        />
        <Stack.Screen
          name="(auth)/forgot-password"
          options={{ animation: "fade", animationDuration: 180 }}
        />
      </Stack.Protected>

      {/* register.jsx stays on disk at app/(auth)/register.jsx, but is
          referenced directly here, unguarded, so it's reachable both
          logged-out (real sign-up, via the login screen) and
          logged-in (Direct Referral's "Register New Member" action
          from PurchaseCodes). Before this, (auth) was one single
          nested navigator gated to logged-out only, so
          router.push("/register") fired while logged in had no
          matching screen and silently did nothing. */}
      <Stack.Screen
        name="(auth)/register"
        options={{ presentation: "modal", animation: "fade", animationDuration: 180 }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Don't render anything until fonts are ready — avoids a flash of
  // the wrong font on first paint.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}