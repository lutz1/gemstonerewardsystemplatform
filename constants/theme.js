// TEMP / BEST-GUESS: your web project's actual colors live in CSS custom
// properties (var(--primary), var(--on-surface), etc.) defined somewhere
// we haven't seen — probably a global.css or theme file. I reconstructed
// these hex values from the literal rgba() colors scattered through your
// CSS (shadows, borders, badge backgrounds). If any of these look off once
// you see it on your phone, send me the real token values and I'll swap
// them in — every screen imports from here, so it's a one-file fix.

export const colors = {
  background: "#0E1510",
  surface: "#161D18",
  onSurface: "#E7ECE8",
  onSurfaceVariant: "#8FA398",
  primary: "#59DE9B",
  primaryContainer: "#1F6E4C",
  onPrimaryContainer: "#06170F",
  secondary: "#7FB69B",
  tertiary: "#FFB3B1",
  danger: "#E08585",
  border: "rgba(61, 74, 65, 0.35)",
  borderFaint: "rgba(61, 74, 65, 0.15)",
  glassPanel: "rgba(47, 54, 49, 0.55)", // stand-in for the blurred glass panels
  glow: "rgba(0, 168, 107, 0.35)",
};

// These names match the @expo-google-fonts packages — double check the
// exact weight names once installed (they're listed in each package's
// own README), naming can vary slightly by version.
export const fonts = {
  hankenRegular: "HankenGrotesk_400Regular",
  hankenMedium: "HankenGrotesk_500Medium",
  hankenSemiBold: "HankenGrotesk_600SemiBold",
  hankenBold: "HankenGrotesk_700Bold",
  jakartaSemiBold: "PlusJakartaSans_600SemiBold",
  jakartaBold: "PlusJakartaSans_700Bold",
  jetbrainsMedium: "JetBrainsMono_500Medium",
};
