import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";
import { pendingApprovals, purchaseTotalsByTier, formatPeso } from "@/utils/AdminMockData";

const TIER_FILTERS = ["All", "Emerald", "Sapphire", "Diamond"];

const TIER_COLOR = {
  Emerald: "#59DE9B",
  Sapphire: "#5B9BFF",
  Diamond: "#E8E8EA",
};

export default function PendingApproval() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All");

  // TEMP: no backend yet, so Approve/Reject mutate the shared mock
  // data directly (pendingApprovals + purchaseTotalsByTier) instead of
  // calling a real API. `version` just forces a re-render after each
  // mutation, since splicing an array in place doesn't trigger one on
  // its own. Replace all of this with real approve/reject endpoints
  // once a backend exists.
  const [version, setVersion] = useState(0);
  const [processing, setProcessing] = useState(null); // { id, action } | null
  const [feedback, setFeedback] = useState(null); // { id, action } | null

  const filtered = pendingApprovals.filter((p) => {
    const matchesTier = tierFilter === "All" || p.tier === tierFilter;
    const matchesSearch =
      p.customerName.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(search.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const removeFromPending = (id) => {
    const idx = pendingApprovals.findIndex((p) => p.id === id);
    if (idx !== -1) pendingApprovals.splice(idx, 1);
  };

  const handleApprove = async (item) => {
    setProcessing({ id: item.id, action: "approve" });
    await new Promise((resolve) => setTimeout(resolve, 600));

    const tierEntry = purchaseTotalsByTier.find((t) => t.tier === item.tier);
    if (tierEntry) {
      tierEntry.count += 1;
      tierEntry.total += item.amount;
    }
    removeFromPending(item.id);

    setProcessing(null);
    setFeedback({ id: item.id, action: "approve" });
    setVersion((v) => v + 1);
  };

  const handleReject = async (item) => {
    setProcessing({ id: item.id, action: "reject" });
    await new Promise((resolve) => setTimeout(resolve, 600));

    removeFromPending(item.id);

    setProcessing(null);
    setFeedback({ id: item.id, action: "reject" });
    setVersion((v) => v + 1);
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Pending Approval</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or reference number..."
          placeholderTextColor="rgba(188, 202, 190, 0.4)"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {TIER_FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, tierFilter === f && styles.filterChipActive]}
            onPress={() => setTierFilter(f)}
          >
            <Text
              style={[styles.filterChipText, tierFilter === f && styles.filterChipTextActive]}
            >
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.resultCount}>
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </Text>

        {filtered.map((p) => {
          const isProcessing = processing?.id === p.id;
          const isApproving = isProcessing && processing.action === "approve";
          const isRejecting = isProcessing && processing.action === "reject";

          return (
            <View style={styles.card} key={p.id}>
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <View style={[styles.tierDot, { backgroundColor: TIER_COLOR[p.tier] }]} />
                  <Text style={styles.customerName}>{p.customerName}</Text>
                </View>
                <Text style={styles.amount}>{formatPeso(p.amount)}</Text>
              </View>
              <View style={styles.cardMetaRow}>
                <Text style={styles.metaText}>{p.tier}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{p.date}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={[styles.metaText, styles.mono]}>{p.referenceNumber}</Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.rejectBtn}
                  onPress={() => handleReject(p)}
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
                  onPress={() => handleApprove(p)}
                  disabled={isProcessing}
                >
                  {isApproving ? (
                    <ActivityIndicator color="#003921" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={16} color="#003921" />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && pendingApprovals.length === 0 && (
          <Text style={styles.emptyText}>No pending approvals — all caught up.</Text>
        )}
        {filtered.length === 0 && pendingApprovals.length > 0 && (
          <Text style={styles.emptyText}>No pending approvals match your filters.</Text>
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: colors.onPrimaryContainer,
    fontFamily: fonts.hankenSemiBold,
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
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  customerName: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  amount: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 14,
    color: "#E8C468",
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
  mono: { fontFamily: "monospace" },
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
    backgroundColor: colors.primary,
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