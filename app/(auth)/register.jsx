import { useEffect, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts } from "@/constants/theme";

// If this screen was opened via a referral deep link
// (gemstonecode://register?ref=CODE), Expo Router hands the "ref" query
// param to us here automatically -- no extra wiring needed for that part.
export default function Register() {
  const { login } = useAuth();
  const { ref } = useLocalSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tin, setTin] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fills the referral field the moment a ref param shows up --
  // still editable afterward, in case someone wants to type a
  // different code manually.
  useEffect(() => {
    if (ref) setReferralCode(String(ref));
  }, [ref]);

  const handleSubmit = async () => {
    setError("");
    if (!name || !email || !phone || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      // TEMP: replace with a real Firebase createUserWithEmailAndPassword
      // call, then write the new profile doc (including referralCode,
      // tin, phone) to Firestore. Once that succeeds, call login() same
      // as here -- everything downstream (Stack.Protected) reacts
      // automatically.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      login();
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
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
          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.backLinkText}>Back to Login</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Apply for Membership</Text>
            <Text style={styles.sub}>Fill in your details to create your account.</Text>
          </View>

          {!!error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <View style={styles.fieldInputWrap}>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Alexis Rivera"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email Address</Text>
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

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <View style={styles.fieldInputWrap}>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. +63 912 345 6789"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>TIN Code</Text>
              <Text style={styles.optionalTag}>Optional</Text>
            </View>
            <View style={styles.fieldInputWrap}>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. 123-456-789"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                keyboardType="number-pad"
                value={tin}
                onChangeText={setTin}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.fieldInputWrap}>
              <TextInput
                style={[styles.fieldInput, { paddingRight: 40 }]}
                placeholder="••••••••••••"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                secureTextEntry={!showPw}
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
                  size={18}
                  color="#3D4A41"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Referral Code</Text>
              {!!ref && <Text style={styles.autoFilledTag}>Auto-filled</Text>}
            </View>
            <View style={styles.fieldInputWrap}>
              <TextInput
                style={styles.fieldInput}
                placeholder="Optional"
                placeholderTextColor="rgba(188, 202, 190, 0.4)"
                autoCapitalize="none"
                value={referralCode}
                onChangeText={setReferralCode}
              />
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
                <Text style={styles.submitText}>Creating Account...</Text>
              </>
            ) : (
              <>
                <Text style={styles.submitText}>CREATE ACCOUNT</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#003921" />
              </>
            )}
          </Pressable>
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
  content: {
    padding: 24,
    paddingTop: 60,
    gap: 20,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backLinkText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  header: { gap: 4, marginTop: 8 },
  title: {
    fontFamily: fonts.jakartaBold,
    fontSize: 26,
    color: "#EDEDED",
  },
  sub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 14,
    color: "#BCCABE",
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
  // Field styling matches Profile's Account Details fields exactly --
  // same label treatment, same box background/border/radius.
  field: { gap: 6 },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionalTag: {
    fontFamily: fonts.hankenRegular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  autoFilledTag: {
    fontFamily: fonts.hankenBold,
    fontSize: 10,
    color: colors.primary,
    textTransform: "uppercase",
  },
  fieldInputWrap: {
    position: "relative",
    justifyContent: "center",
    paddingVertical: 2,
    paddingHorizontal: 2,
    borderRadius: 8,
    backgroundColor: "rgba(26, 33, 28, 0.5)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldInput: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    padding: 4,
  },
  submitBtn: {
    marginTop: 8,
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
});
