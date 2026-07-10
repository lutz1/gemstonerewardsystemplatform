import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts } from "@/constants/theme";

const BG_IMAGE = require("../../assets/images/login_bg.png");

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!email || !password) {
      setError("Credentials incomplete. Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      // TEMP: swap this delay for a real Firebase signInWithEmailAndPassword
      // call. Once it succeeds, call login() same as here -- everything
      // downstream (Stack.Protected) reacts to that automatically.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      login();
    } catch (err) {
      setError(err?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image
        source={BG_IMAGE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
      />
      <LinearGradient
        colors={["rgba(14,21,16,0.95)", "rgba(14,21,16,0.6)", "rgba(14,21,16,0.3)"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Gemstone Code</Text>
            <Text style={styles.subtitle}>Executive Networking Portal</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardHeadingTitle}>Secure Access</Text>
              <Text style={styles.cardHeadingSub}>
                Enter your professional credentials to continue.
              </Text>
            </View>

            {!!error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={styles.inputWrap}>
                <MaterialIcons name="email" size={18} color="#869489" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. name@company.com"
                  placeholderTextColor="#3D4A41"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                {/* TEMP: no /forgot-password route yet */}
                <Pressable>
                  <Text style={styles.forgotLink}>Forgot Password?</Text>
                </Pressable>
              </View>
              <View style={styles.inputWrap}>
                <MaterialIcons name="lock" size={18} color="#869489" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputHasRight]}
                  placeholder="••••••••••••"
                  placeholderTextColor="#3D4A41"
                  secureTextEntry={!showPw}
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPw((v) => !v)}
                  accessibilityLabel={showPw ? "Hide password" : "Show password"}
                >
                  <MaterialIcons
                    name={showPw ? "visibility-off" : "visibility"}
                    size={20}
                    color="#3D4A41"
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.submitBtn, pressed && styles.submitBtnPressed]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#003921" size="small" />
                  <Text style={styles.submitText}>Authenticating...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitText}>LOGIN</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#003921" />
                </>
              )}
            </Pressable>

            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>
                New to the network?{" "}
                <Text style={styles.cardFooterLink}>Apply for Membership</Text>
              </Text>
            </View>
          </View>

          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Privacy</Text>
            <Text style={styles.footerSep}>·</Text>
            <Text style={styles.footerLink}>Terms</Text>
            <Text style={styles.footerSep}>·</Text>
            <Text style={styles.footerLink}>Help</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0E1510",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    marginBottom: 16,
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.jakartaBold,
    fontSize: 32,
    letterSpacing: -0.5,
    textTransform: "uppercase",
    color: "#EDEDED", // approximation of the gradient-clipped title text
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.jetbrainsMedium,
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "rgba(89, 222, 155, 0.8)",
    marginTop: 4,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(14, 21, 16, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(198, 198, 198, 0.2)",
    width: "100%",
    maxWidth: 440,
    padding: 32,
    borderRadius: 8,
    gap: 24,
  },
  cardHeading: { marginBottom: 8 },
  cardHeadingTitle: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 22,
    color: "#DDE4DD",
  },
  cardHeadingSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: "#BCCABE",
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: "rgba(147, 0, 10, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 180, 171, 0.25)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  errorText: {
    fontFamily: fonts.jetbrainsMedium,
    fontSize: 11,
    color: "#FFB4AB",
    textAlign: "center",
  },
  field: { gap: 8 },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldLabel: {
    fontFamily: fonts.jetbrainsMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#C6C6C6",
  },
  forgotLink: {
    fontFamily: fonts.jetbrainsMedium,
    fontSize: 11,
    color: "#59DE9B",
  },
  inputWrap: {
    position: "relative",
    justifyContent: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  input: {
    backgroundColor: "#161D18",
    borderWidth: 1,
    borderColor: "rgba(134, 148, 137, 0.3)",
    borderRadius: 8,
    paddingVertical: 14,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 15,
    fontFamily: fonts.hankenRegular,
    color: "#DDE4DD",
  },
  inputHasRight: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    padding: 4,
  },
  submitBtn: {
    width: "100%",
    backgroundColor: "#59DE9B",
    borderRadius: 8,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnPressed: {
    backgroundColor: "#00A86B",
  },
  submitText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 15,
    color: "#003921",
  },
  cardFooter: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 74, 65, 0.3)",
    alignItems: "center",
  },
  cardFooterText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: "#BCCABE",
    textAlign: "center",
  },
  cardFooterLink: {
    color: "#59DE9B",
    fontFamily: fonts.hankenSemiBold,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 28,
  },
  footerLink: {
    fontFamily: fonts.jetbrainsMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(188, 202, 190, 0.8)",
  },
  footerSep: {
    color: "rgba(61, 74, 65, 0.9)",
    fontSize: 14,
  },
});
