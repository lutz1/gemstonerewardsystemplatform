import { useMemo, useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Share,
  Modal,
  Animated,
  Easing,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import TopBar from "@/components/TopBar";
import { colors, fonts } from "@/constants/theme";
import { getTransactions } from "@/utils/TransactionsData";

const BONUS_PER_REFERRAL = 500;
const REFERRAL_CODE = "arivera92";
const REFERRAL_LINK = `https://gemstonecode.com/join?ref=${REFERRAL_CODE}`;
const HISTORY_PAGE_SIZE = 3;

// Base points from staking / other non-referral sources, so the balance
// shown isn't purely referral-driven.
const BASE_GEM_POINTS = 40350;

// Purchase-related ledger stats -- referral earnings live in the
// Direct Referral panel above, this row is purely product purchases
// and the daily gem points they generate.
const ledgerStats = [
  {
    key: "gems",
    icon: "diamond",
    label: "Total Gem Points Earned",
    value: "+ 320 GEMS",
    caption: "Credited from active product holdings",
    captionStyle: "primary",
  },
  {
    key: "purchase",
    icon: "account-balance-wallet",
    label: "Total Purchase",
    value: "- ₱1,500.00",
    caption: "3 Active License Blocks",
    captionStyle: "muted",
  },
  {
    key: "staking",
    icon: "token",
    label: "Total Earnings",
    value: "8,250 GEMS",
    caption: "Auto-compounding enabled",
    captionStyle: "primary",
  },
];

// Mock seed data -- people who joined through your link or a direct
// registration. `purchased` distinguishes members who bought a product
// (and triggered the referral bonus) from ones who only signed up.
const initialReferralHistory = [
  { id: "r1", name: "Jamie Cruz", date: "Jul 14, 2026", source: "direct", purchased: true },
  { id: "r2", name: "Patricia Alonzo", date: "Jul 09, 2026", source: "link", purchased: true },
  { id: "r3", name: "Miguel Santos", date: "Jun 28, 2026", source: "direct", purchased: false },
  { id: "r4", name: "Renz Villareal", date: "Jun 20, 2026", source: "link", purchased: false },
  { id: "r5", name: "Denise Ocampo", date: "Jun 11, 2026", source: "direct", purchased: true },
];

const DATE_FILTERS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year", label: "This Year" },
];

// Fast, native-thread-driven action sheet. Replaces RN's built-in
// Modal animationType="fade", which is a fixed ~300ms and can eat
// navigation calls fired right as it dismisses. This keeps the Modal
// mounted (just fading out) until the exit animation actually
// finishes, so closing the sheet and navigating never race each other.
//
// Exposes closeInstantly() via ref for actions that navigate away
// (e.g. Register New Member): skipping the fade-out there matters
// because otherwise this sheet's exit animation and the native stack's
// own modal-presentation transition run at the same time, competing
// for the same frame budget -- that double-animation overlap is what
// reads as "laggy". The incoming screen's own transition already
// covers the visual handoff, so there's nothing to fade here.
const ActionSheet = forwardRef(function ActionSheet({ visible, onClose, children }, ref) {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    closeInstantly: () => {
      progress.stopAnimation();
      progress.setValue(0);
      setMounted(false);
    },
  }));

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 110,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.modalOverlay, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalSheet,
            {
              opacity: progress,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

export default function PurchaseCodes() {
  const [transactions] = useState(() => getTransactions());
  const [copied, setCopied] = useState(false);
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const referralSheetRef = useRef(null);

  const [referralHistory] = useState(initialReferralHistory);
  const [historyPage, setHistoryPage] = useState(0);

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [txFilter, setTxFilter] = useState("all");
  const [exporting, setExporting] = useState(false);

  // Active = joined AND bought a product (bonus actually earned).
  // Total = everyone who joined, purchased or not.
  const activeReferrals = referralHistory.filter((r) => r.purchased).length;
  const totalReferrals = referralHistory.length;

  const gemPoints = BASE_GEM_POINTS + activeReferrals * BONUS_PER_REFERRAL;

  const historyTotalPages = Math.max(1, Math.ceil(referralHistory.length / HISTORY_PAGE_SIZE));
  const pagedHistory = referralHistory.slice(
    historyPage * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE + HISTORY_PAGE_SIZE
  );

  const filteredTransactions = useMemo(() => {
    if (txFilter === "all") return transactions;
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (isNaN(d)) return true; // unparseable date -- don't hide it, just include it
      switch (txFilter) {
        case "today":
          return d.toDateString() === now.toDateString();
        case "week": {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          return d >= startOfWeek && d <= now;
        }
        case "month":
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        case "year":
          return d.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }, [transactions, txFilter]);

  const handleCopyReferral = async () => {
    await Clipboard.setStringAsync(REFERRAL_LINK);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      setReferralModalVisible(false);
    }, 900);
  };

  const handleShareReferral = async () => {
    try {
      await Share.share({
        message: `Join me on Gemstone Code and get access to executive networking codes. ${REFERRAL_LINK}`,
        url: REFERRAL_LINK, // iOS uses this; Android falls back to message
      });
    } catch {
      // user dismissed the share sheet -- nothing to do
    } finally {
      setReferralModalVisible(false);
    }
  };

  const handleDirectRegister = () => {
    // Skip the sheet's own fade-out here -- it's about to be covered
    // by the incoming register screen's native transition anyway, and
    // running both animations at once is what was causing the lag.
    referralSheetRef.current?.closeInstantly();
    setReferralModalVisible(false);
    // register.jsx (app/(auth)/register.jsx) reads the "ref" param via
    // useLocalSearchParams and auto-fills the Referral Code field.
    // Using the object form of router.push is more reliable than a
    // hand-built query string for useLocalSearchParams to pick up.
    router.push({ pathname: "/register", params: { ref: REFERRAL_CODE } });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const rows = filteredTransactions
        .map(
          (tx) => `
            <tr>
              <td>${tx.date}</td>
              <td>${tx.label}</td>
              <td>${tx.sub}</td>
              <td style="color:${tx.positive ? "#00A86B" : "#333"};">${tx.amount}</td>
              <td>${tx.status}</td>
            </tr>`
        )
        .join("");

      const html = `
        <html>
          <head><meta charset="utf-8" /></head>
          <body style="font-family: Helvetica, Arial, sans-serif; padding: 24px;">
            <h2 style="color:#00A86B;">Gemstone Code — Activity Ledger</h2>
            <p style="color:#555; font-size:12px;">
              Exported ${new Date().toLocaleString()} · Filter: ${
        DATE_FILTERS.find((f) => f.key === txFilter)?.label
      }
            </p>
            <table width="100%" cellspacing="0" cellpadding="8" style="border-collapse:collapse; font-size:12px;">
              <thead>
                <tr style="background:#0E1510; color:#fff; text-align:left;">
                  <th>Date</th><th>Label</th><th>Details</th><th>Amount</th><th>Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Export Activity Ledger",
        });
      }
    } catch (err) {
      console.warn("PDF export failed:", err);
    } finally {
      setExporting(false);
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
        {/* Direct referral -- one button, three actions */}
        <View style={styles.card}>
          <Text style={styles.referralLabel}>Direct Referral</Text>
          <Text style={styles.referralIntro}>
            Share your link or register a new member yourself — both count
            toward your referrals.
          </Text>

          <Pressable
            style={styles.referralMainBtn}
            onPress={() => setReferralModalVisible(true)}
          >
            <MaterialIcons name="person-add" size={18} color={colors.onPrimaryContainer} />
            <Text style={styles.referralMainBtnText}>Invite Gem Buddy</Text>
          </Pressable>
        </View>

        {/* Referral rewards -- gem points, tied to purchases made by referrals */}
        <View style={styles.card}>
          <Text style={styles.balanceTitle}>Referral Rewards</Text>
          <Text style={styles.balanceSub}>
            Gem Points accumulate when a member you referred makes a purchase.
          </Text>
          <View>
            <Text style={styles.gemsLabel}>Gem Points Accumulated</Text>
            <View style={styles.gemsRow}>
              <MaterialIcons name="diamond" size={28} color={colors.primary} />
              <Text style={styles.gemsValue}>{gemPoints.toLocaleString()}</Text>
            </View>
            <Text style={styles.bonusCaption}>
              +{BONUS_PER_REFERRAL} GEMS earned per referral's first purchase ·{" "}
              {activeReferrals} of {totalReferrals} referrals have bought so far
            </Text>
          </View>
        </View>

        {/* Active vs Total referrals */}
        <View style={styles.statMiniPanel}>
          <View style={styles.statMiniRow}>
            <View style={[styles.statMiniIcon, { backgroundColor: "rgba(89, 222, 155, 0.1)" }]}>
              <MaterialIcons name="verified" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.statMiniLabel}>Active Referrals</Text>
              <Text style={styles.statMiniValue}>{activeReferrals}</Text>
              <Text style={styles.statMiniCaption}>Joined & purchased</Text>
            </View>
          </View>
          <View style={[styles.statMiniRow, styles.statMiniRowBorder]}>
            <View style={[styles.statMiniIcon, { backgroundColor: "rgba(198, 198, 198, 0.08)" }]}>
              <MaterialIcons name="groups" size={22} color={colors.secondary} />
            </View>
            <View>
              <Text style={styles.statMiniLabel}>Total Referrals</Text>
              <Text style={styles.statMiniValue}>{totalReferrals}</Text>
              <Text style={styles.statMiniCaption}>All members joined</Text>
            </View>
          </View>
        </View>

        {/* Direct referral history */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeader}>
            <Text style={styles.ledgerTitle}>Direct Referral History</Text>
            <Text style={styles.ledgerSub}>
              Everyone who joined through your link or was registered directly.
            </Text>
          </View>

          <View style={styles.txListCard}>
            {pagedHistory.length === 0 && (
              <Text style={styles.emptyRow}>
                No referrals yet — shared links and direct registrations will show up here.
              </Text>
            )}
            {pagedHistory.map((r) => (
              <View style={styles.txCard} key={r.id}>
                <View style={styles.txCardTop}>
                  <View
                    style={[styles.txIconWrap, !r.purchased && styles.txIconWrapMuted]}
                  >
                    <MaterialIcons
                      name={r.source === "direct" ? "person-add" : "link"}
                      size={18}
                      color={r.purchased ? colors.primary : colors.secondary}
                    />
                  </View>
                  <View style={styles.txCardInfo}>
                    <Text style={styles.txLabel}>{r.name}</Text>
                    <Text style={styles.txSub}>
                      {r.source === "direct" ? "Registered directly" : "Joined via your link"}
                    </Text>
                  </View>
                  <View style={styles.txCardAmount}>
                    <Text
                      style={[styles.txAmount, !r.purchased && { color: colors.onSurfaceVariant }]}
                    >
                      {r.purchased ? `+${BONUS_PER_REFERRAL} GEMS` : "Pending purchase"}
                    </Text>
                  </View>
                </View>
                <View style={styles.txCardBottom}>
                  <Text style={styles.txCardDate}>{r.date}</Text>
                  <View
                    style={[styles.txStatusBadge, !r.purchased && styles.txStatusBadgeMuted]}
                  >
                    <Text
                      style={[
                        styles.txStatusBadgeText,
                        !r.purchased && { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {r.purchased ? "Active" : "Pending"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.ledgerPaginationRow}>
              <Text style={styles.paginationCount}>
                {referralHistory.length === 0
                  ? "No entries yet"
                  : `Showing ${historyPage * HISTORY_PAGE_SIZE + 1} to ${Math.min(
                      (historyPage + 1) * HISTORY_PAGE_SIZE,
                      referralHistory.length
                    )} of ${referralHistory.length} entries`}
              </Text>
              <View style={styles.paginationBtns}>
                <Pressable
                  style={[styles.pageBtn, historyPage === 0 && styles.pageBtnDisabled]}
                  disabled={historyPage === 0}
                  onPress={() => setHistoryPage((p) => Math.max(0, p - 1))}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={18}
                    color={historyPage === 0 ? colors.onSurfaceVariant : colors.onSurface}
                  />
                </Pressable>
                <Pressable
                  style={[
                    styles.pageBtn,
                    historyPage >= historyTotalPages - 1 && styles.pageBtnDisabled,
                  ]}
                  disabled={historyPage >= historyTotalPages - 1}
                  onPress={() => setHistoryPage((p) => Math.min(historyTotalPages - 1, p + 1))}
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={18}
                    color={
                      historyPage >= historyTotalPages - 1
                        ? colors.onSurfaceVariant
                        : colors.onSurface
                    }
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Activity ledger -- purely product purchases + daily gem points */}
        <View style={styles.ledgerSection}>
          <View style={styles.ledgerHeader}>
            <Text style={styles.ledgerTitle}>Activity Ledger</Text>
            <Text style={styles.ledgerSub}>
              Review your product purchases and daily gem point earnings.
            </Text>
          </View>

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

          <View style={styles.ledgerHeaderActions}>
            <Pressable style={styles.filterActionBtn} onPress={() => setFilterModalVisible(true)}>
              <MaterialIcons name="filter-list" size={16} color={colors.onSurface} />
              <Text style={styles.filterActionBtnText}>
                {DATE_FILTERS.find((f) => f.key === txFilter)?.label ?? "Filter"}
              </Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={handleExportPDF} disabled={exporting}>
              <MaterialIcons name="download" size={16} color={colors.onSurface} />
              <Text style={styles.exportBtnText}>{exporting ? "Exporting..." : "Export PDF"}</Text>
            </Pressable>
          </View>

          <View style={styles.txListCard}>
            {filteredTransactions.length === 0 && (
              <Text style={styles.emptyRow}>
                No transactions match this filter.
              </Text>
            )}
            {filteredTransactions.map((tx) => (
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
                {filteredTransactions.length === 0
                  ? "No entries yet"
                  : `Showing 1 to ${filteredTransactions.length} of ${transactions.length} entries`}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Direct referral action sheet */}
      <ActionSheet
        ref={referralSheetRef}
        visible={referralModalVisible}
        onClose={() => setReferralModalVisible(false)}
      >
        <Text style={styles.modalTitle}>Direct Referral</Text>

        <View style={styles.modalLinkWrap}>
          <MaterialIcons name="link" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.modalLinkText} numberOfLines={1}>
            {REFERRAL_LINK}
          </Text>
        </View>

        <Pressable style={styles.modalOption} onPress={handleCopyReferral}>
          <View style={styles.modalOptionIcon}>
            <MaterialIcons name="content-copy" size={20} color={colors.primary} />
          </View>
          <View style={styles.modalOptionText}>
            <Text style={styles.modalOptionTitle}>{copied ? "Copied!" : "Copy Link"}</Text>
            <Text style={styles.modalOptionSub}>Copy your referral link to clipboard</Text>
          </View>
        </Pressable>

        <Pressable style={styles.modalOption} onPress={handleShareReferral}>
          <View style={styles.modalOptionIcon}>
            <MaterialIcons name="ios-share" size={20} color={colors.primary} />
          </View>
          <View style={styles.modalOptionText}>
            <Text style={styles.modalOptionTitle}>Share Link</Text>
            <Text style={styles.modalOptionSub}>Send your link via any app</Text>
          </View>
        </Pressable>

        <Pressable style={styles.modalOption} onPress={handleDirectRegister}>
          <View style={styles.modalOptionIcon}>
            <MaterialIcons name="person-add" size={20} color={colors.primary} />
          </View>
          <View style={styles.modalOptionText}>
            <Text style={styles.modalOptionTitle}>Register New Member</Text>
            <Text style={styles.modalOptionSub}>Open the registration form directly</Text>
          </View>
        </Pressable>

        <Pressable style={styles.modalCancelBtn} onPress={() => setReferralModalVisible(false)}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </Pressable>
      </ActionSheet>

      {/* Filter action sheet */}
      <ActionSheet visible={filterModalVisible} onClose={() => setFilterModalVisible(false)}>
        <Text style={styles.modalTitle}>Filter Activity Ledger</Text>

        {DATE_FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={styles.modalOption}
            onPress={() => {
              setTxFilter(f.key);
              setFilterModalVisible(false);
            }}
          >
            <View style={styles.modalOptionIcon}>
              <MaterialIcons
                name={txFilter === f.key ? "radio-button-checked" : "radio-button-unchecked"}
                size={20}
                color={txFilter === f.key ? colors.primary : colors.onSurfaceVariant}
              />
            </View>
            <View style={styles.modalOptionText}>
              <Text style={styles.modalOptionTitle}>{f.label}</Text>
            </View>
          </Pressable>
        ))}

        <Pressable style={styles.modalCancelBtn} onPress={() => setFilterModalVisible(false)}>
          <Text style={styles.modalCancelText}>Close</Text>
        </Pressable>
      </ActionSheet>
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
  referralIntro: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: -6,
  },
  referralMainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 13,
  },
  referralMainBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 14,
    color: colors.onPrimaryContainer,
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
  bonusCaption: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 6,
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
  statMiniCaption: {
    fontFamily: fonts.hankenRegular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },

  paginationCount: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.secondary,
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
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(47, 54, 49, 0.4)",
  },
  exportBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.onSurface,
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
  txStatusBadgeMuted: {
    backgroundColor: "rgba(198, 198, 198, 0.08)",
    borderColor: "rgba(198, 198, 198, 0.2)",
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
  ledgerPaginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(61, 74, 65, 0.2)",
    backgroundColor: "rgba(22, 29, 24, 0.4)",
  },
  paginationBtns: { flexDirection: "row", gap: 8 },
  pageBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(47, 54, 49, 0.4)",
  },
  pageBtnDisabled: { opacity: 0.4 },

  // Centered action sheet shared by referral & filter modals -- one tap
  // opens it, options sit right there, no scrolling to a bottom sheet.
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#0E1510",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 17,
    color: colors.onSurface,
    marginBottom: 4,
  },
  modalLinkWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(26, 33, 28, 0.5)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  modalLinkText: {
    flex: 1,
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  modalOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(89, 222, 155, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionText: { flex: 1 },
  modalOptionTitle: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  modalOptionSub: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  modalCancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(47, 54, 49, 0.4)",
  },
  modalCancelText: {
    fontFamily: fonts.hankenBold,
    fontSize: 13,
    color: colors.onSurface,
  },
});