import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { MaterialIcons } from "@expo/vector-icons";
import TopBar from "@/components/TopBar";
import { colors, fonts } from "@/constants/theme";
import { getPackageById, calcTotal, formatCurrency } from "@/utils/PackagesData";
import { confirmQrScan, completePayment } from "@/utils/MockPaymentAPI";
import { addTransaction } from "@/utils/TransactionsData";

const RECEIPT_REDIRECT_SECONDS = 5;

function formatTxDate(date) {
  return date
    .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    .toUpperCase();
}

export default function QrPayment() {
  const { id } = useLocalSearchParams();
  const pkg = getPackageById(id);
  const total = pkg ? calcTotal(pkg) : 0;

  const [permission, requestPermission] = useCameraPermissions();

  // "scanning" -> "confirmed" -> "receipt"
  const [stage, setStage] = useState("scanning");
  const [scanResult, setScanResult] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [redirectIn, setRedirectIn] = useState(RECEIPT_REDIRECT_SECONDS);

  const hasConfirmedRef = useRef(false); // guards against double-fire

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted && permission.canAskAgain) {
      requestPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  async function handleQrDetected(decodedValue) {
    if (hasConfirmedRef.current) return;
    hasConfirmedRef.current = true;
    try {
      const result = await confirmQrScan(pkg, decodedValue);
      setScanResult({ ...result, decodedValue });
      setStage("confirmed");
    } catch {
      hasConfirmedRef.current = false;
    }
  }

  function handleBarcodeScanned({ data }) {
    handleQrDetected(data);
  }

  function handleDemoScan() {
    if (!pkg || hasConfirmedRef.current) return;
    handleQrDetected("DEMO-QR-0001");
  }

  async function handleCompletePayment() {
    try {
      const result = await completePayment(pkg, scanResult);
      setReceipt(result);
      addTransaction({
        icon: "shopping_bag",
        iconFill: false,
        label: "Code Purchase",
        sub: `${pkg.name} • ${pkg.tier}`,
        date: formatTxDate(new Date()),
        amount: `- ${formatCurrency(total)}`,
        amountSub: `Receipt ${result.receiptId}`,
        positive: false,
        status: "Completed",
      });
      setStage("receipt");
    } catch {
      // TEMP: surface a real error state here later
    }
  }

  // Receipt: 5s auto-redirect regardless of button press
  useEffect(() => {
    if (stage !== "receipt") return;

    setRedirectIn(RECEIPT_REDIRECT_SECONDS);
    const tick = setInterval(() => {
      setRedirectIn((s) => Math.max(0, s - 1));
    }, 1000);
    const redirectTimer = setTimeout(() => {
      router.replace("/(tabs)");
    }, RECEIPT_REDIRECT_SECONDS * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(redirectTimer);
    };
  }, [stage]);

  if (!pkg) {
    return (
      <View style={styles.root}>
        <TopBar />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>We couldn't find that package.</Text>
          <Pressable onPress={() => router.push("/(tabs)/purchase-codes")}>
            <Text style={styles.notFoundLink}>Back to Purchase Codes</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar />

      <View style={styles.content}>
        {stage !== "receipt" && (
          <Pressable
            style={styles.backLink}
            onPress={() => router.push(`/package-detail/${pkg.id}`)}
          >
            <MaterialIcons name="arrow-back" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.backLinkText}>Back to Package</Text>
          </Pressable>
        )}

        <View style={styles.card}>
          {/* Camera / scanner area */}
          <View style={styles.scannerFrame}>
            {stage === "scanning" && permission?.granted && (
              <>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={hasConfirmedRef.current ? undefined : handleBarcodeScanned}
                />
                <View style={styles.scanOverlay} pointerEvents="none">
                  <View style={styles.scanBox} />
                </View>
                <Text style={styles.scanCaption}>Point your camera at the QR code to pay</Text>
                <Pressable style={styles.demoBtn} onPress={handleDemoScan}>
                  <Text style={styles.demoBtnText}>Use demo QR scan</Text>
                </Pressable>
              </>
            )}

            {stage === "scanning" && permission && !permission.granted && (
              <View style={styles.cameraError}>
                <MaterialIcons name="videocam-off" size={40} color={colors.tertiary} />
                <Text style={styles.cameraErrorText}>
                  Camera access is needed to scan the QR code. Enable it in your device settings,
                  or use the demo scan below.
                </Text>
                <Pressable style={styles.demoBtnStatic} onPress={handleDemoScan}>
                  <Text style={styles.demoBtnText}>Use demo QR scan</Text>
                </Pressable>
              </View>
            )}

            {(stage === "confirmed" || stage === "receipt") && (
              <View style={styles.doneState}>
                <MaterialIcons name="check-circle" size={64} color={colors.primary} />
                <Text style={styles.doneText}>
                  {stage === "confirmed" ? "QR Code Scanned" : "Payment Complete"}
                </Text>
              </View>
            )}
          </View>

          {/* Confirmed: details + Complete Payment */}
          {stage === "confirmed" && (
            <View style={styles.detailsBlock}>
              <View style={styles.detailRows}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Scanned Data</Text>
                  <Text style={[styles.detailValue, styles.mono]}>
                    {scanResult?.decodedValue || "—"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>{pkg.quantity} codes</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>{formatCurrency(pkg.price)} / code</Text>
                </View>
                <View style={[styles.detailRow, styles.detailTotal]}>
                  <Text style={[styles.detailLabel, styles.totalText]}>Total</Text>
                  <Text style={[styles.detailValue, styles.totalText]}>
                    {formatCurrency(total)}
                  </Text>
                </View>
              </View>

              <Pressable style={styles.completeBtn} onPress={handleCompletePayment}>
                <Text style={styles.completeBtnText}>Complete Payment</Text>
              </Pressable>
            </View>
          )}

          {/* Receipt */}
          {stage === "receipt" && receipt && (
            <View style={styles.receiptBlock}>
              <Text style={styles.receiptTitle}>Review Payment Receipt</Text>

              <View style={styles.detailRows}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Package</Text>
                  <Text style={styles.detailValue}>{pkg.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>{pkg.quantity} codes</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Price</Text>
                  <Text style={styles.detailValue}>{formatCurrency(pkg.price)} / code</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Receipt ID</Text>
                  <Text style={[styles.detailValue, styles.mono]}>{receipt.receiptId}</Text>
                </View>
                <View style={[styles.detailRow, styles.detailTotal]}>
                  <Text style={[styles.detailLabel, styles.totalText]}>Total Paid</Text>
                  <Text style={[styles.detailValue, styles.totalText]}>
                    {formatCurrency(total)}
                  </Text>
                </View>
              </View>

              <View style={{ gap: 10 }}>
                <Pressable
                  style={styles.merchantBtn}
                  onPress={() => router.replace("/(tabs)")}
                >
                  <Text style={styles.merchantBtnText}>Back to Merchant</Text>
                </Pressable>
                <Pressable
                  style={styles.historyLink}
                  onPress={() => router.push("/(tabs)/purchase-codes")}
                >
                  <Text style={styles.historyLinkText}>View Transaction History</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={colors.onSurface} />
                </Pressable>
              </View>

              <Text style={styles.redirectNote}>
                Redirecting to your dashboard in {redirectIn}s…
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
    padding: 16,
    gap: 16,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backLinkText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  card: {
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    borderRadius: 12,
    padding: 20,
    gap: 20,
  },
  scannerFrame: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0A0F0B",
    alignItems: "center",
    justifyContent: "center",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBox: {
    width: "65%",
    height: "65%",
    borderWidth: 3,
    borderColor: "rgba(89, 222, 155, 0.85)",
    borderRadius: 16,
  },
  scanCaption: {
    position: "absolute",
    bottom: 44,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#fff",
    fontFamily: fonts.hankenRegular,
    fontSize: 12,
  },
  demoBtn: {
    position: "absolute",
    bottom: 12,
    alignSelf: "center",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "rgba(89, 222, 155, 0.16)",
  },
  demoBtnStatic: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "rgba(89, 222, 155, 0.16)",
    marginTop: 8,
  },
  demoBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 12,
    color: colors.onSurface,
  },
  cameraError: {
    alignItems: "center",
    gap: 10,
    padding: 24,
  },
  cameraErrorText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
  doneState: { alignItems: "center", gap: 10 },
  doneText: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 16,
    color: colors.onSurface,
  },
  detailsBlock: { gap: 20 },
  receiptBlock: { gap: 16 },
  receiptTitle: {
    fontFamily: fonts.jakartaBold,
    fontSize: 18,
    color: colors.onSurface,
    textAlign: "center",
  },
  detailRows: {
    gap: 2,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(61, 74, 65, 0.3)",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  detailLabel: {
    fontFamily: fonts.hankenMedium,
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: colors.onSurfaceVariant,
  },
  detailValue: {
    fontFamily: fonts.jakartaSemiBold,
    fontSize: 14,
    color: colors.onSurface,
  },
  mono: { fontFamily: "monospace", fontSize: 12 },
  detailTotal: {},
  totalText: { fontSize: 17, color: colors.primary, fontFamily: fonts.jakartaBold },
  completeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  completeBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 15,
    color: colors.onPrimaryContainer,
  },
  merchantBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  merchantBtnText: {
    fontFamily: fonts.hankenBold,
    fontSize: 14,
    color: colors.onPrimaryContainer,
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyLinkText: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 13,
    color: colors.onSurface,
  },
  redirectNote: {
    fontFamily: fonts.hankenRegular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 24,
  },
  notFoundText: {
    fontFamily: fonts.hankenRegular,
    fontSize: 15,
    color: colors.onSurfaceVariant,
  },
  notFoundLink: {
    fontFamily: fonts.hankenSemiBold,
    fontSize: 14,
    color: colors.primary,
  },
});
