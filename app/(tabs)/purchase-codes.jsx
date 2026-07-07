import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { MaterialIcons } from "@expo/vector-icons";
import TopBar from "@/components/TopBar";
import { colors, fonts } from "@/constants/theme";
import { getTransactions } from "@/utils/TransactionsData";

const codes = [
  {
    id: "#GSC-9921-XLP",
    tier: "Platinum Tier",
    tierColor: "platinum",
    date: "Oct 24, 2024",
    status: "active",
  },
  {
    id: "#GSC-8842-EXC",
    tier: "Executive Tier",
    tierColor: "primary",
    date: "Oct 20, 2024",
    status: "active",
  },
  {
    id: "#GSC-7712-STD",
    tier: "Standard Tier",
    tierColor: "muted",
    date: "Oct 15, 2024",
    status: "used",
  },
  {
    id: "#GSC-6650-EXC",
    tier: "Executive Tier",
    tierColor: "primary",
    date: "Oct 12, 2024",
    status: "active",
  },
];

const ledgerStats = [
  {
    key: "referral",
    icon: "trending-up",
    label: "Referral Bonuses",
    value: "+ 4,200 GEMS",
    caption: "↑ 12% from last month",
    captionStyle: "primary",
  },
  {
    key: "purchase",
    icon: "account-balance-wallet",
    label: "Code Purchases",
    value: "- $1,500.00",
    caption: "3 Active License Blocks",
    captionStyle: "muted",
  },
  {
    key: "staking",
    icon: "token",
    label: "Staking Earnings",
    value: "8,250 GEMS",
    caption: "Auto-compounding enabled",
    captionStyle: "primary",
  },
];

const TIER_DOT_COLORS = {
  primary: colors.primary,
  platinum: "#E5E4E2",
  muted: colors.onSurfaceVariant,
};

const REFERRAL_LINK = "https://gemstonecode.com/join?ref=arivera92";

export default function PurchaseCodes() {
  const [search, setSearch] = useState("");
  const [transactions] = useState(() => getTransactions());
  const [copied, setCopied] = useState(false);

  const filtered = codes.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.tier.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyReferral = async () => {
    await Clipboard.setStringAsync(REFERRAL_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareReferral = async () => {
    try {
      await Share.share({
        message: `Join me on Gemstone Code and get access to executive networking codes. ${REFERRAL_LINK}`,
        url: REFERRAL_LINK, // iOS uses this; Android falls back to message
      });
    } catch {
      // user dismissed the share sheet -- nothing to do
    }
  };

  return (
    <View style={styles.root}>
      <TopBar />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Direct referral link */}
        <View style={styles.card}>
          <Text style={styles.referralLabel}>Your Direct Referral Link</Text>
          <View style={styles.referralRow}>
            <View style={styles.referralInputWrap}>
              <MaterialIcons name="link" size={18} color={colors.onSurfaceVariant} />
              <TextInput
                style={styles.referralInput}
                value={REFERRAL_LINK}
                editable={false}
              />
            </View>
            <View style={styles.referralActions}>
              <Pressable style={styles.copyBtn} onPress={handleCopyReferral}>
                <Text style={styles.copyBtnText}>{copied ? "Copied!" : "Copy Link"}</Text>
              </Pressable>
              <Pressable style={styles.shareBtn} onPress={handleShareReferral}>
                <MaterialIcons name="ios-share" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Balance card */}
        <View style={styles.card}>
          <Text style={styles.balanceTitle}>Available Codes</Text>
          <Text style={styles.balanceSub}>
            Manage and generate your networking access keys.
          </Text>
          <View style={styles.balanceBottom}>
            <View>
              <Text style={styles.gemsLabel}>Current Wallet Balance</Text>
              <View style={styles.gemsRow}>
                <MaterialIcons name="diamond" size={28} color={colors.primary} />
                <Text style={styles.gemsValue}>42,850</Text>
              </View>
            </View>
            <Pressable style={styles.generateBtn}>
              <MaterialIcons name="add-circle" size={18} color={colors.onPrimaryContainer} />
              <Text style={styles.generateBtnText}>Purchased Codes</Text>
            </Pressable>
          </View>
        </View>

        {/* Quick stats -- Active Codes / Total Used, side by side */}
        <View style={styles.statMiniPanel}>
          <View style={styles.statMiniRow}>
            <View style={[styles.statMiniIcon, { backgroundColor: "rgba(89, 222, 155, 0.1)" }]}>
              <MaterialIcons name="token" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.statMiniLabel}>Active Codes</Text>
              <Text style={styles.statMiniValue}>12</Text>
            </View>
          </View>
          <View style={[styles.statMiniRow, styles.statMiniRowBorder]}>
            <View style={[styles.statMiniIcon, { backgroundColor: "rgba(198, 198, 198, 0.08)" }]}>
              <MaterialIcons name="history" size={22} color={colors.secondary} />
            </View>
            <View>
              <Text style={styles.statMiniLabel}>Total Used</Text>
              <Text style={styles.statMiniValue}>156</Text>
            </View>
          </View>
        </View>

        {/* Code batches */}
        <View style={styles.tableCard}>
          <View style={styles.tableToolbar}>
            <Text style={styles.tableTitle}>Purchased Code Batches</Text>
            <View style={styles.toolbarRight}>
              <View style={styles.searchWrap}>
                <MaterialIcons name="search" size={16} color={colors.onSurfaceVariant} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search ID..."
                  placeholderTextColor="rgba(188, 202, 190, 0.5)"
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <Pressable style={styles.filterBtn}>
                <MaterialIcons name="filter-list" size={18} color={colors.onSurfaceVariant} />
              </Pressable>
            </View>
          </View>

          <View>
            {filtered.map((code) => (
              <View
                key={code.id}
                style={[styles.codeRow, code.status === "used" && styles.codeRowUsed]}
              >
                <View style={styles.codeRowTop}>
                  <Text
                    style={[
                      styles.codeId,
                      code.status === "used" && { color: colors.secondary },
                    ]}
                  >
                    {code.id}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      code.status === "used" && styles.statusBadgeUsed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        code.status === "used" && { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {code.status === "used" ? "Used" : "Active"}
                    </Text>
                  </View>
                </View>
                <View style={styles.codeRowBottom}>
                  <View style={styles.tierCell}>
                    <View
                      style={[
                        styles.tierDot,
                        { backgroundColor: TIER_DOT_COLORS[code.tierColor] ?? colors.primary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.tierName,
                        code.status === "used" && { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {code.tier}
                    </Text>
                  </View>
                  <Text style={styles.codeDate}>{code.date}</Text>
                  {code.status === "active" ? (
                    <Pressable style={styles.actionBtn}>
                      <MaterialIcons name="content-copy" size={18} color={colors.secondary} />
                    </Pressable>
                  ) : (
                    <MaterialIcons name="check-circle" size={18} color="rgba(61, 74, 65, 0.6)" />
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.pagination}>
            <Text style={styles.paginationCount}>Showing 4 of 24 batches</Text>
            <View style={styles.paginationButtons}>
              <Pressable style={styles.pageBtn} disabled>
                <Text style={styles.pageBtnText}>Previous</Text>
              </Pressable>
              <Pressable style={[styles.pageBtn, styles.pageBtnActive]}>
                <Text style={[styles.pageBtnText, { color: colors.primary }]}>Next Page</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Activity ledger */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeader}>
            <Text style={styles.ledgerTitle}>Activity Ledger</Text>
            <Text style={styles.ledgerSub}>
              Review your historical data, bonuses, and investments.
            </Text>
          </View>

          <View style={styles.ledgerHeaderActions}>
            <Pressable style={styles.filterActionBtn}>
              <MaterialIcons name="filter-list" size={16} color={colors.onSurface} />
              <Text style={styles.filterActionBtnText}>Filter</Text>
            </Pressable>
            <Pressable style={styles.exportBtn}>
              <MaterialIcons name="download" size={16} color={colors.onPrimaryContainer} />
              <Text style={styles.exportBtnText}>Export PDF</Text>
            </Pressable>
          </View>

          {/* Ledger stats */}
          <View style={styles.ledgerStatsPanel}>
            {ledgerStats.map((s) => (
              <View style={styles.ledgerStatCol} key={s.key}>
                <MaterialIcons name={s.icon} size={20} color={colors.primary} />
                <Text style={styles.ledgerStatLabel}>{s.label}</Text>
                <Text style={styles.ledgerStatValue}>{s.value}</Text>
                <Text
                  style={[
                    styles.ledgerStatCaption,
                    { color: s.captionStyle === "primary" ? "rgba(89, 222, 155, 0.8)" : colors.onSurfaceVariant },
                  ]}
                >
                  {s.caption}
                </Text>
              </View>
            ))}
          </View>

          {/* Transaction list */}
          <View style={styles.txListCard}>
            {transactions.length === 0 && (
              <Text style={styles.emptyRow}>
                No transactions yet — completed purchases will show up here.
              </Text>
            )}
            {transactions.map((tx) => (
              <View style={styles.txCard} key={tx.id}>
                <View style={styles.txCardTop}>
                  <View
                    style={[
                      styles.txIconWrap,
                      !tx.positive && styles.txIconWrapMuted,
                    ]}
                  >
                    <MaterialIcons
                      name={tx.icon.replace(/_/g, "-")}
                      size={18}
                      color={tx.positive ? colors.primary : colors.secondary}
                    />
                  </View>
                  <View style={styles.txCardInfo}>
                    <Text style={styles.txLabel}>{tx.label}</Text>
                    <Text style={styles.txSub}>{tx.sub}</Text>
                  </View>
                  <View style={styles.txCardAmount}>
                    <Text style={[styles.txAmount, !tx.positive && { color: colors.onSurface }]}>
                      {tx.amount}
                    </Text>
                    <Text style={styles.txAmountSub}>{tx.amountSub}</Text>
                  </View>
                </View>
                <View style={styles.txCardBottom}>
                  <Text style={styles.txCardDate}>{tx.date}</Text>
                  <View style={styles.txStatusBadge}>
                    <Text style={styles.txStatusBadgeText}>{tx.status}</Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.ledgerPagination}>
              <Text style={styles.paginationCount}>
                {transactions.length === 0
                  ? "No entries yet"
                  : `Showing 1 to ${transactions.length} of ${transactions.length} entries`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 100, gap: 20 },

  card: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 20,
    gap: 12,
  },

  referralLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.secondary,
  },
  referralRow: { gap: 12 },
  referralInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(26, 33, 28, 0.5)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  referralInput: {
    flex: 1,
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
  },
  referralActions: { flexDirection: "row", gap: 10 },
  copyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  copyBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.onPrimaryContainer,
  },
  shareBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  balanceTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 20,
    color: colors.primary,
  },
  balanceSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: -6,
  },
  balanceBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 10,
  },
  gemsLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.secondary,
    marginBottom: 4,
  },
  gemsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gemsValue: {
    fontFamily: fonts.jakartaBold,
    fontSize: 34,
    color: colors.onSurface,
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryContainer,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  generateBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.onPrimaryContainer,
  },

  statMiniPanel: {
    flexDirection: "row",
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
  },
  statMiniRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  statMiniRowBorder: {
    borderLeftWidth: 1,
    borderLeftColor: "rgba(61, 74, 65, 0.15)",
  },
  statMiniIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statMiniLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.secondary,
  },
  statMiniValue: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 19,
    color: colors.onSurface,
  },

  tableCard: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(61, 74, 65, 0.2)",
    backgroundColor: "rgba(37, 44, 39, 0.5)",
  },
  tableTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 15,
    color: colors.onSurface,
  },
  toolbarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(26, 33, 28, 0.6)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  searchInput: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
    width: 110,
  },
  filterBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeRow: {
    padding: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(61, 74, 65, 0.1)",
  },
  codeRowUsed: { opacity: 0.65 },
  codeRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeId: {
    fontFamily: fonts.hankenMedium,
    fontSize: 13,
    letterSpacing: 0.3,
    color: colors.primary,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.2)",
  },
  statusBadgeUsed: {
    backgroundColor: "rgba(47, 54, 49, 0.5)",
    borderColor: "rgba(61, 74, 65, 0.3)",
  },
  statusBadgeText: {
    fontFamily: fonts.hankenBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.primary,
  },
  codeRowBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tierCell: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  tierName: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  codeDate: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginRight: 12,
  },
  actionBtn: { padding: 2 },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 74, 65, 0.15)",
    backgroundColor: "rgba(22, 29, 24, 0.3)",
  },
  paginationCount: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.secondary,
  },
  paginationButtons: { flexDirection: "row", gap: 8 },
  pageBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageBtnActive: {
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    borderColor: "rgba(89, 222, 155, 0.2)",
  },
  pageBtnText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },

  ledgerSection: { gap: 16 },
  ledgerHeader: { gap: 2 },
  ledgerTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 19,
    color: colors.onSurface,
  },
  ledgerSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  ledgerHeaderActions: { flexDirection: "row", gap: 8 },
  filterActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(47, 54, 49, 0.4)",
  },
  filterActionBtnText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurface,
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
  },
  exportBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.onPrimaryContainer,
  },

  ledgerStatsPanel: {
    flexDirection: "row",
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
  },
  ledgerStatCol: {
    flex: 1,
    padding: 14,
    gap: 4,
    borderLeftWidth: 1,
    borderLeftColor: "rgba(61, 74, 65, 0.15)",
  },
  ledgerStatLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  ledgerStatValue: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  ledgerStatCaption: {
    fontFamily: fonts.hankenRegular,
    fontSize: 10,
  },

  txListCard: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyRow: {
    textAlign: "center",
    padding: 32,
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  txCard: {
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(61, 74, 65, 0.15)",
  },
  txCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 168, 107, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  txIconWrapMuted: {
    backgroundColor: "rgba(198, 198, 198, 0.08)",
    borderColor: "rgba(198, 198, 198, 0.15)",
  },
  txCardInfo: { flex: 1, minWidth: 0 },
  txLabel: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  txSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  txCardAmount: { alignItems: "flex-end" },
  txAmount: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 14,
    color: colors.primary,
  },
  txAmountSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  txCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 48,
  },
  txCardDate: {
    fontFamily: fonts.hankenMedium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  txStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(89, 222, 155, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(89, 222, 155, 0.25)",
  },
  txStatusBadgeText: {
    fontFamily: fonts.hankenBold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.primary,
  },
  ledgerPagination: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 74, 65, 0.2)",
    backgroundColor: "rgba(22, 29, 24, 0.4)",
  },
});
