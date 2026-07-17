import { useEffect, useRef, useState } from "react";
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
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

// Stages: "email" -> "verify" -> "reset" -> "done"
export default function ForgotPassword() {
  const [stage, setStage] = useState("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // displayedStage lags one animation-frame behind `stage` so the old
  // stage's content stays mounted through the fade-out, then swaps to
  // the new stage right as the fade-in starts. Without this the
  // content would hard-cut the instant `stage` changes, with no
  // transition at all.
  const [displayedStage, setDisplayedStage] = useState(stage);
  const stageOpacity = useRef(new Animated.Value(1)).current;
  const stageShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (stage === displayedStage) return;
    Animated.timing(stageOpacity, {
      toValue: 0,
      duration: 100,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setDisplayedStage(stage);
      stageShift.setValue(10);
      Animated.parallel([
        Animated.timing(stageOpacity, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(stageShift, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const handleSendCode = async () => {
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      // TEMP: replace with a real "send verification code" backend call
      // (e.g. Firebase's sendPasswordResetEmail, or a custom OTP email).
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStage("verify");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      // TEMP: replace with a real code-verification backend call.
      await new Promise((resolve) => setTimeout(resolve, 800));
      setStage("reset");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      // TEMP: replace with a real "set new password" backend call.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStage("done");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {displayedStage !== "done" && (
            <Pressable style={styles.backLink} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back" size={18} color={colors.onSurfaceVariant} />
              <Text style={styles.backLinkText}>Back to Login</Text>
            </Pressable>
          )}

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Animated.View
            style={{
              opacity: stageOpacity,
              transform: [{ translateY: stageShift }],
            }}
          >
            {/* Stage 1: email */}
            {displayedStage === "email" && (
              <View style={{ gap: 20 }}>
                <View style={styles.header}>
                  <Text style={styles.title}>Forgot Password</Text>
                  <Text style={styles.sub}>
                    Enter your account email and we'll send a verification code to confirm it's you.
                  </Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View style={styles.fieldInputWrap}>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="e.g. name@email.com"
                      placeholderTextColor="rgba(188, 202, 190, 0.4)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                </View>
                <Pressable style={styles.submitBtn} onPress={handleSendCode} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#003921" size="small" />
                  ) : (
                    <Text style={styles.submitText}>SEND VERIFICATION CODE</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Stage 2: verify code */}
            {displayedStage === "verify" && (
              <View style={{ gap: 20 }}>
                <View style={styles.header}>
                  <Text style={styles.title}>Enter Code</Text>
                  <Text style={styles.sub}>
                    We sent a 6-digit verification code to {email || "your email"}.
                  </Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Verification Code</Text>
                  <View style={styles.fieldInputWrap}>
                    <TextInput
                      style={[styles.fieldInput, styles.codeInput]}
                      placeholder="000000"
                      placeholderTextColor="rgba(188, 202, 190, 0.4)"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={code}
                      onChangeText={setCode}
                    />
                  </View>
                </View>
                <Pressable style={styles.submitBtn} onPress={handleVerifyCode} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#003921" size="small" />
                  ) : (
                    <Text style={styles.submitText}>VERIFY CODE</Text>
                  )}
                </Pressable>
                <Pressable onPress={handleSendCode} disabled={loading}>
                  <Text style={styles.resendLink}>Didn't get a code? Resend</Text>
                </Pressable>
              </View>
            )}

            {/* Stage 3: set new password */}
            {displayedStage === "reset" && (
              <View style={{ gap: 20 }}>
                <View style={styles.header}>
                  <Text style={styles.title}>Set New Password</Text>
                  <Text style={styles.sub}>Choose a new password for your account.</Text>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>New Password</Text>
                  <View style={styles.fieldInputWrap}>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="••••••••••••"
                      placeholderTextColor="rgba(188, 202, 190, 0.4)"
                      secureTextEntry={!showPw}
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Confirm New Password</Text>
                  <View style={styles.fieldInputWrap}>
                    <TextInput
                      style={styles.fieldInput}
                      placeholder="••••••••••••"
                      placeholderTextColor="rgba(188, 202, 190, 0.4)"
                      secureTextEntry={!showPw}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                  </View>
                </View>
                <Pressable
                  style={styles.showPwRow}
                  onPress={() => setShowPw((v) => !v)}
                >
                  <MaterialIcons
                    name={showPw ? "check-box" : "check-box-outline-blank"}
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.showPwText}>Show passwords</Text>
                </Pressable>
                <Pressable style={styles.submitBtn} onPress={handleResetPassword} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator color="#003921" size="small" />
                  ) : (
                    <Text style={styles.submitText}>RESET PASSWORD</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* Stage 4: done */}
            {displayedStage === "done" && (
              <View style={styles.doneState}>
                <MaterialIcons name="check-circle" size={64} color={colors.primary} />
                <Text style={styles.title}>Password Reset</Text>
                <Text style={styles.sub}>
                  Your password has been updated. You can now log in with your new password.
                </Text>
                <Pressable style={styles.submitBtn} onPress={() => router.replace("/login")}>
                  <Text style={styles.submitText}>BACK TO LOGIN</Text>
                </Pressable>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0E1510" },
  content: { padding: 24, paddingTop: 60, gap: 20 },
  backLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  backLinkText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  header: { gap: 6, marginTop: 8 },
  title: {
    fontFamily: fonts.jakartaBold,
    fontSize: 26,
    color: "#EDEDED",
    textAlign: "center",
  },
  sub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: "#BCCABE",
    textAlign: "center",
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
  field: { gap: 6 },
  fieldLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldInputWrap: {
    borderRadius: 8,
    backgroundColor: "rgba(26, 33, 28, 0.5)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldInput: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  codeInput: {
    fontFamily: fonts.jakartaBold,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: "center",
  },
  showPwRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  showPwText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  submitBtn: {
    marginTop: 4,
    backgroundColor: "#59DE9B",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    letterSpacing: 0.5,
    color: "#003921",
  },
  resendLink: {
    fontFamily: fonts.jetbrainsMedium,
    fontSize: 12,
    color: "#59DE9B",
    textAlign: "center",
  },
  doneState: { alignItems: "center", gap: 12, paddingTop: 40 },
});