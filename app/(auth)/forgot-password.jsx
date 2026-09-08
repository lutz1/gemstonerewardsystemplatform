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
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { addPasswordResetRequest } from "@/utils/PasswordResetRequests";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitRequest = async () => {
    setError("");
    if (!email) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      // TEMP: no backend yet -- this just queues the request for an
      // admin to review. Once approved, a reset link is simulated as
      // sent (see the admin Users page's pending-requests panel).
      await new Promise((resolve) => setTimeout(resolve, 700));
      addPasswordResetRequest({ email });
      setSubmitted(true);
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
          {!submitted && (
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

          {!submitted && (
            <View style={{ gap: 20 }}>
              <View style={styles.header}>
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.sub}>
                  Enter your account email. An admin will review your request, and you'll get a
                  reset link once it's approved.
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

              <Pressable
                style={styles.submitBtn}
                onPress={handleSubmitRequest}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#003921" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={16} color="#003921" />
                    <Text style={styles.submitText}>REQUEST PASSWORD RESET</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {submitted && (
            <View style={styles.doneState}>
              <MaterialIcons name="hourglass-top" size={64} color={colors.primary} />
              <Text style={styles.title}>Request Submitted</Text>
              <Text style={styles.sub}>
                Your request is pending admin approval. Once approved, we'll send a reset link to{" "}
                {email}.
              </Text>

              <Pressable style={styles.submitBtn} onPress={() => router.replace("/login")}>
                <Text style={styles.submitText}>BACK TO LOGIN</Text>
              </Pressable>
            </View>
          )}
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
  submitBtn: {
    marginTop: 4,
    flexDirection: "row",
    backgroundColor: "#59DE9B",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    letterSpacing: 0.5,
    color: "#003921",
  },
  doneState: { alignItems: "center", gap: 12, paddingTop: 40 },
});