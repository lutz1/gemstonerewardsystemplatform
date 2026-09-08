import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { passwordResetRequests } from "@/utils/PasswordResetRequests";

export default function PasswordResetRequestsScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  // TEMP: no backend yet -- Approve/Reject mutate the shared
  // passwordResetRequests array directly (same pattern as the Codes
  // Approve/Reject actions on pending.jsx). `version` forces a
  // re-render since splicing in place doesn't trigger one on its own.
  const [version, setVersion] = useState(0);
  const [processing, setProcessing] = useState(null); // { id, action: "approve" | "reject" } | null

  const filtered = passwordResetRequests.filter(
    (r) =>
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase())
  );

  const removeFromRequests = (id) => {
    const idx = passwordResetRequests.findIndex((r) => r.id === id);
    if (idx !== -1) passwordResetRequests.splice(idx, 1);
  };

  const handleApprove = async (request) => {
    setProcessing({ id: request.id, action: "approve" });
    // TEMP: simulates both approving the request AND sending the
    // reset link in one step, per how this was scoped. Replace with
    // real "approve + send email" API calls once a backend exists.
    await new Promise((resolve) => setTimeout(resolve, 700));
    removeFromRequests(request.id);
    setProcessing(null);
    setVersion((v) => v + 1);
  };

  const handleReject = async (request) => {
    setProcessing({ id: request.id, action: "reject" });
    await new Promise((resolve) => setTimeout(resolve, 600));
    removeFromRequests(request.id);
    setProcessing(null);
    setVersion((v) => v + 1);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Password Reset Requests</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or email..."
          placeholderTextColor="rgba(188, 202, 190, 0.4)"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultCount}>
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </Text>

        {filtered.map((req) => {
          const isProcessing = processing?.id === req.id;
          const isApproving = isProcessing && processing.action === "approve";
          const isRejecting = isProcessing && processing.action === "reject";

          return (
            <View style={styles.card} key={req.id}>
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <View style={styles.resetDot} />
                  <Text style={styles.customerName}>{req.customerName}</Text>
                </View>
              </View>
              <View style={styles.cardMetaRow}>
                <Text style={styles.metaText}>{req.email}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{req.requestedAt}</Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.rejectBtn}
                  onPress={() => handleReject(req)}
                  disabled={isProcessing}
                >
                  {isRejecting ? (
                    <ActivityIndicator color={colors.onSurfaceVariant} size="small" />
                  ) : (
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.approveBtn}
                  onPress={() => handleApprove(req)}
                  disabled={isProcessing}
                >
                  {isApproving ? (
                    <ActivityIndicator color="#003921" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={16} color="#003921" />
                      <Text style={styles.approveBtnText}>Approve & Send</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && passwordResetRequests.length === 0 && (
          <Text style={styles.emptyText}>No password reset requests — all caught up.</Text>
        )}
        {filtered.length === 0 && passwordResetRequests.length > 0 && (
          <Text style={styles.emptyText}>No requests match "{search}".</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  headerTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 16,
    marginBottom: 10,
    backgroundColor: "rgba(26, 33, 28, 0.6)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
  },
  content: { padding: 16, paddingTop: 4, paddingBottom: 100, gap: 10 },
  resultCount: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  card: {
    backgroundColor: "rgba(26, 33, 28, 0.7)",
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resetDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E8C468" },
  customerName: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  metaDot: { color: colors.onSurfaceVariant, fontSize: 11 },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  rejectBtnText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#E8C468",
  },
  approveBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 12,
    color: "#003921",
  },
  emptyText: {
    textAlign: "center",
    padding: 32,
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
});