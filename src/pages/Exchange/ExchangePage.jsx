import { getFunctions, httpsCallable } from "firebase/functions";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { app, auth, storage } from "../../firebase";
import { enablePushNotifications } from "../../utils/pushNotifications";
import "./ExchangePage.css";

const options = {
  "gems-to-wallet": {
    title: "Exchange Gems to Wallet",
    caption: "Convert your GEM points into wallet balance.",
    icon: "sync_alt",
  },
  withdraw: {
    title: "Request Referral Commission",
    caption: "Send your wallet balance to an E-Wallet or bank account.",
    icon: "arrow_upward",
  },
  deposit: {
    title: "Top Up Wallet Balance",
    caption: "Add funds to your wallet through secure Paymongo checkout.",
    icon: "arrow_downward",
  },
};

const withdrawalProviders = {
  ewallet: ["GCash", "Maya", "GrabPay", "GoTyme", "Coins.ph"],
  bank: [
    "BDO Unibank",
    "BPI",
    "China Bank",
    "Land Bank of the Philippines",
    "Metrobank",
    "PNB",
    "RCBC",
    "Security Bank",
    "UnionBank",
  ],
};
const QR_CODE_MAX_SIZE = 5 * 1024 * 1024;
const QR_CODE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_WITHDRAWAL = 200;
const MAX_WITHDRAWAL = 50000;
const WITHDRAWAL_FEE_RATE = 0.08;
const QUICK_DEPOSIT_AMOUNTS = [500, 1000, 2500, 5000];

async function loadExchangeInfo() {
  const functions = getFunctions(app, "asia-southeast1");
  const getUserDashboard = httpsCallable(functions, "getUserDashboard");
  const getGemValueHistory = httpsCallable(functions, "getGemValueHistory");
  const [dashboardResult, gemValueResult] = await Promise.all([
    getUserDashboard(),
    getGemValueHistory({ range: "1D" }),
  ]);

  return {
    availableGems: Number(dashboardResult.data?.gemPoints),
    gemValue: Number(gemValueResult.data?.defaultValue),
    currency: gemValueResult.data?.currency || "PHP",
  };
}

function ExchangeForm({ mode, onRequestWithdrawal }) {
  const option = options[mode];
  const isWithdraw = mode === "withdraw";
  const isDeposit = mode === "deposit";
  const [searchParams] = useSearchParams();
  const depositReturnId = isDeposit ? searchParams.get("depositId") : null;
  const depositReturnKind = isDeposit ? searchParams.get("payment") : null;
  const [method, setMethod] = useState(isWithdraw ? "ewallet" : "gcash");
  const [provider, setProvider] = useState("GCash");
  const [amount, setAmount] = useState("");
  const [isCreatingDepositCheckout, setIsCreatingDepositCheckout] = useState(false);
  const [depositCheckoutError, setDepositCheckoutError] = useState("");
  const [depositReturn, setDepositReturn] = useState(null);
  const depositRequestIdRef = useRef("");
  const [details, setDetails] = useState("");
  const [accountName, setAccountName] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [qrUploadProgress, setQrUploadProgress] = useState(0);
  const [qrUploadError, setQrUploadError] = useState("");
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const uploadTaskRef = useRef(null);
  const isGemsExchange = mode === "gems-to-wallet";
  const [availableGems, setAvailableGems] = useState(null);
  const [availableWallet, setAvailableWallet] = useState(null);
  const [isLoadingWallet, setIsLoadingWallet] = useState(isWithdraw);
  const [walletLoadError, setWalletLoadError] = useState("");
  const [gemValue, setGemValue] = useState(null);
  const [currency, setCurrency] = useState("PHP");
  const [isLoadingExchangeInfo, setIsLoadingExchangeInfo] = useState(isGemsExchange);
  const [exchangeInfoError, setExchangeInfoError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmittingExchange, setIsSubmittingExchange] = useState(false);
  const [exchangeRequestId, setExchangeRequestId] = useState("");
  const [exchangeError, setExchangeError] = useState("");
  const [exchangeSuccess, setExchangeSuccess] = useState("");
  const numericAmount = Number(amount) || 0;
  const pesoValue = Number((numericAmount * (gemValue || 0)).toFixed(2));
  const serviceFee = Number((numericAmount * WITHDRAWAL_FEE_RATE).toFixed(2));
  const totalWithdrawalDeduction = Number((numericAmount + serviceFee).toFixed(2));
  const normalizedMobileNumber = details.trim().replace(/[()\s-]/g, "");
  const isValidMobileNumber = /^(?:09\d{9}|\+639\d{9})$/.test(normalizedMobileNumber);
  const formattedCurrency = (value) => new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  useEffect(() => {
    if (!isDeposit || !depositReturnId) {
      setDepositReturn(null);
      return undefined;
    }
    if (depositReturnKind === "cancelled") {
      setDepositReturn({ status: "cancelled", depositId: depositReturnId });
      return undefined;
    }

    let isActive = true;
    let timeoutId;
    let attempts = 0;
    const getDepositStatus = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getDepositStatus",
    );
    const checkDepositStatus = async () => {
      try {
        const { data } = await getDepositStatus({ depositId: depositReturnId });
        if (!isActive) return;
        setDepositReturn(data);
        if (data?.status === "pending" && attempts < 10) {
          attempts += 1;
          timeoutId = window.setTimeout(checkDepositStatus, 3000);
        }
      } catch (error) {
        if (isActive) {
          setDepositReturn({
            status: "unavailable",
            message: error?.message || "Unable to check this deposit status.",
          });
        }
      }
    };

    setDepositReturn({ status: "checking" });
    void checkDepositStatus();
    return () => {
      isActive = false;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [depositReturnId, depositReturnKind, isDeposit]);

  const handleDepositCheckout = async () => {
    if (!isDeposit || isCreatingDepositCheckout || numericAmount < 1) return;

    if (!depositRequestIdRef.current) {
      depositRequestIdRef.current = globalThis.crypto?.randomUUID?.()
        || `deposit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    setIsCreatingDepositCheckout(true);
    setDepositCheckoutError("");
    try {
      const createDepositCheckoutSession = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "createDeposit",
      );
      const { data } = await createDepositCheckoutSession({
        amount: numericAmount,
        requestId: depositRequestIdRef.current,
      });
      const checkoutUrl = data?.checkoutUrl;
      if (typeof checkoutUrl !== "string"
        || new URL(checkoutUrl).origin !== "https://checkout.paymongo.com") {
        throw new Error("PayMongo returned an invalid checkout URL.");
      }
      window.location.assign(checkoutUrl);
    } catch (error) {
      setDepositCheckoutError(error?.message || "Unable to start PayMongo checkout. Please try again.");
      setIsCreatingDepositCheckout(false);
    }
  };

  useEffect(() => () => uploadTaskRef.current?.cancel(), []);

  useEffect(() => {
    if (!isWithdraw) return undefined;

    let isCurrent = true;
    setIsLoadingWallet(true);
    setWalletLoadError("");
    const getUserDashboard = httpsCallable(
      getFunctions(app, "asia-southeast1"),
      "getUserDashboard",
    );
    getUserDashboard()
      .then(({ data }) => {
        if (!isCurrent) return;
        const walletBalance = data?.walletBalance == null
          ? NaN
          : Number(data.walletBalance);
        if (!Number.isFinite(walletBalance)) {
          setAvailableWallet(null);
          setWalletLoadError("Unable to load your available wallet balance.");
          return;
        }
        setAvailableWallet(Math.max(0, walletBalance));
      })
      .catch(() => {
        if (!isCurrent) return;
        setAvailableWallet(null);
        setWalletLoadError("Unable to load your available wallet balance.");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingWallet(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isWithdraw]);

  const withdrawalAmountError = isWithdraw && amount
    ? numericAmount < MIN_WITHDRAWAL
      ? `Minimum withdrawal is ${formattedCurrency(MIN_WITHDRAWAL)}.`
      : numericAmount > MAX_WITHDRAWAL
        ? `Maximum withdrawal is ${formattedCurrency(MAX_WITHDRAWAL)}.`
        : availableWallet !== null && totalWithdrawalDeduction > availableWallet
          ? "Withdrawal amount plus the 8% service fee exceeds your available wallet balance."
          : ""
    : "";
  const mobileNumberError = isWithdraw
    && method === "ewallet"
    && details.trim()
    && !isValidMobileNumber
    ? "Enter a valid Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX."
    : "";

  const handleQrCodeUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setQrUploadError("");
    if (!QR_CODE_TYPES.includes(file.type)) {
      setQrUploadError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > QR_CODE_MAX_SIZE) {
      setQrUploadError("The QR image must be 5 MB or smaller.");
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      setQrUploadError("Sign in again before uploading your QR image.");
      return;
    }

    uploadTaskRef.current?.cancel();
    setIsUploadingQr(true);
    setQrUploadProgress(0);
    const qrStorageRef = ref(
      storage,
      `withdrawal-qr-codes/${userId}/payout-qr`,
    );
    const uploadTask = uploadBytesResumable(qrStorageRef, file, {
      contentType: file.type,
      customMetadata: { userId, purpose: "withdrawal-qr-code" },
    });
    uploadTaskRef.current = uploadTask;

    try {
      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            setQrUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
          },
          reject,
          resolve,
        );
      });
      const downloadUrl = await getDownloadURL(qrStorageRef);
      setQrCode({ name: file.name, path: qrStorageRef.fullPath, url: downloadUrl });
    } catch (error) {
      if (error?.code !== "storage/canceled") {
        setQrUploadError(error?.message || "QR image upload failed. Please try again.");
      }
    } finally {
      uploadTaskRef.current = null;
      setIsUploadingQr(false);
    }
  };

  const removeQrCode = async () => {
    if (!qrCode) return;
    setQrUploadError("");
    try {
      await deleteObject(ref(storage, qrCode.path));
      setQrCode(null);
    } catch (error) {
      setQrUploadError(error?.message || "Unable to remove the uploaded QR image.");
    }
  };

  useEffect(() => {
    if (!isGemsExchange) return undefined;

    let isCurrent = true;
    setIsLoadingExchangeInfo(true);
    setExchangeInfoError("");
    loadExchangeInfo()
      .then((exchangeInfo) => {
        if (!isCurrent) return;
        setAvailableGems(Number.isFinite(exchangeInfo.availableGems)
          ? Math.max(0, exchangeInfo.availableGems)
          : 0);
        setGemValue(Number.isFinite(exchangeInfo.gemValue)
          ? Math.max(0, exchangeInfo.gemValue)
          : 0);
        setCurrency(exchangeInfo.currency);
      })
      .catch(() => {
        if (!isCurrent) return;
        setExchangeInfoError("Unable to load your GEM balance and current value.");
      })
      .finally(() => {
        if (isCurrent) setIsLoadingExchangeInfo(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isGemsExchange]);

  const openExchangeConfirmation = () => {
    setExchangeError("");
    setExchangeRequestId(window.crypto?.randomUUID?.() || `${Date.now()}-${numericAmount}`);
    setIsConfirmOpen(true);
  };

  const confirmExchange = async () => {
    if (!exchangeRequestId || isSubmittingExchange) return;

    setIsSubmittingExchange(true);
    setExchangeError("");
    try {
      const exchangeGemsToWallet = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "exchangeGemsToWallet",
      );
      const { data } = await exchangeGemsToWallet({
        gemAmount: numericAmount,
        expectedGemValue: gemValue,
        requestId: exchangeRequestId,
      });

      setAvailableGems(Number(data.availableGems));
      setGemValue(Number(data.gemValue));
      setCurrency(data.currency || currency);
      setExchangeSuccess(
        `Exchanged ${data.gemAmount} GEM${data.gemAmount === 1 ? "" : "s"}. ${formattedCurrency(data.walletAmount)} was added to your wallet.`,
      );
      setAmount("");
      setIsConfirmOpen(false);
      setExchangeRequestId("");
    } catch (error) {
      setExchangeError(error.message || "Unable to complete the exchange. Please try again.");
      try {
        const exchangeInfo = await loadExchangeInfo();
        setAvailableGems(Number.isFinite(exchangeInfo.availableGems)
          ? Math.max(0, exchangeInfo.availableGems)
          : 0);
        setGemValue(Number.isFinite(exchangeInfo.gemValue)
          ? Math.max(0, exchangeInfo.gemValue)
          : 0);
        setCurrency(exchangeInfo.currency);
      } catch {
        setExchangeInfoError("Unable to refresh your GEM balance and current value.");
      }
    } finally {
      setIsSubmittingExchange(false);
    }
  };

  const closeExchangeConfirmation = () => {
    if (isSubmittingExchange) return;
    setIsConfirmOpen(false);
    setExchangeRequestId("");
    setExchangeError("");
  };

  useEffect(() => {
    if (!isConfirmOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeExchangeConfirmation();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfirmOpen, isSubmittingExchange]);

  return (
    <section className={isDeposit ? "exchange-deposit-card" : "exchange-card"}>
      <div className="exchange-card-heading">
        <span className="material-symbols-outlined exchange-heading-icon">
          {option.icon}
        </span>
        <div>
          <p className="exchange-eyebrow">{isDeposit ? "Wallet" : "Exchange"}</p>
          <h1>{option.title}</h1>
          <p>{option.caption}</p>
        </div>
      </div>
      {isDeposit && (
        <div className="exchange-deposit-method" aria-label="PayMongo hosted checkout">
          <span className="material-symbols-outlined" aria-hidden="true">payments</span>
          <div>
            <strong>PayMongo Checkout</strong>
            <small>Hosted payment · QR Ph</small>
          </div>
          <span className="material-symbols-outlined exchange-deposit-secure" aria-hidden="true">
            lock
          </span>
        </div>
      )}
      {exchangeSuccess && isGemsExchange && (
        <p className="exchange-success" role="status">{exchangeSuccess}</p>
      )}
      {isWithdraw && (
        <div className="exchange-withdrawal-overview" aria-live="polite">
          <div>
            <span>Available Wallet</span>
            <strong>
              {isLoadingWallet
                ? "Loading..."
                : availableWallet === null
                  ? "Unavailable"
                  : formattedCurrency(availableWallet)}
            </strong>
          </div>
          {walletLoadError && <p className="exchange-error" role="alert">{walletLoadError}</p>}
        </div>
      )}
      {isWithdraw && (
        <div className="exchange-methods">
          <button
            type="button"
            className={(isWithdraw ? method === "ewallet" : method === "gcash") ? "active" : ""}
            onClick={() => {
              setMethod(isWithdraw ? "ewallet" : "gcash");
              setProvider(isWithdraw ? withdrawalProviders.ewallet[0] : "GCash");
            }}
          >
            <span className="material-symbols-outlined">phone_android</span>
            {isWithdraw ? "E-Wallet" : "GCash"}
          </button>
          <button
            type="button"
            className={method === "bank" ? "active" : ""}
            onClick={() => {
              setMethod("bank");
              setProvider(withdrawalProviders.bank[0]);
            }}
          >
            <span className="material-symbols-outlined">account_balance</span>
            Bank Transfer
          </button>
        </div>
      )}
      {isWithdraw && (
        <label className="exchange-provider-field">
          {method === "ewallet" ? "E-Wallet Provider" : "Bank"}
          <select
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            {withdrawalProviders[method].map((providerOption) => (
              <option key={providerOption} value={providerOption}>
                {providerOption}
              </option>
            ))}
          </select>
        </label>
      )}
      {isGemsExchange ? (
        <>
          <div className="exchange-gems-overview" aria-live="polite">
            <div className="exchange-gems-metric">
              <span>Available GEM</span>
              <strong>
                {isLoadingExchangeInfo || availableGems === null
                  ? "--"
                  : availableGems.toLocaleString("en-PH", { maximumFractionDigits: 2 })}
              </strong>
            </div>
            <div className="exchange-gems-metric">
              <span>GEM Value</span>
              <strong>
                {isLoadingExchangeInfo || gemValue === null
                  ? "--"
                  : formattedCurrency(gemValue)}
              </strong>
            </div>
          </div>
          {exchangeInfoError && (
            <p className="exchange-error" role="alert">{exchangeInfoError}</p>
          )}
          <label>
            Amount of GEMS
            <div className="exchange-input-wrap">
              <input
                type="number"
                min="0"
                max={availableGems ?? undefined}
                step="0.0001"
                placeholder="0"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  setExchangeSuccess("");
                }}
              />
              <span>GEMS</span>
            </div>
          </label>
        </>
      ) : isWithdraw ? (
        <>
          <label>
            Account Name
            <input
              required
              autoComplete="name"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              placeholder="Enter account holder name"
            />
          </label>
          <label>
            {method === "ewallet"
              ? `${provider} Mobile Number`
              : `${provider} Account Number`}
            <input
              type={method === "ewallet" ? "tel" : "text"}
              required
              autoComplete="tel"
              inputMode={method === "ewallet" ? "tel" : undefined}
              maxLength={method === "ewallet" ? 16 : undefined}
              aria-invalid={Boolean(mobileNumberError)}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder={
                method === "ewallet"
                  ? "0912 345 6789 or +63 912 345 6789"
                  : "Enter bank account number"
              }
            />
          </label>
          {mobileNumberError && (
            <p className="exchange-error" role="alert">{mobileNumberError}</p>
          )}
          <div className="exchange-qr-field">
              <label htmlFor="withdrawal-qr-upload">Upload payout QR code image</label>
              <input
                id="withdrawal-qr-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleQrCodeUpload}
                disabled={isUploadingQr}
              />
              <small>PNG, JPG, or WebP. Maximum file size: 5 MB.</small>
              {isUploadingQr && (
                <div className="exchange-qr-progress" role="status" aria-live="polite">
                  <progress max="100" value={qrUploadProgress} />
                  <span>Uploading QR image: {qrUploadProgress}%</span>
                </div>
              )}
              {qrUploadError && <p className="exchange-error" role="alert">{qrUploadError}</p>}
              {qrCode && !isUploadingQr && (
                <div className="exchange-qr-preview">
                  <img src={qrCode.url} alt="Uploaded withdrawal QR code" />
                  <span title={qrCode.name}>{qrCode.name}</span>
                  <button
                    type="button"
                    onClick={removeQrCode}
                    disabled={isUploadingQr}
                    aria-label="Remove selected QR code"
                  >
                    Remove
                  </button>
                </div>
              )}
          </div>
        </>
      ) : null}
      {!isGemsExchange && (
        <>
          {isDeposit && (
            <div className="exchange-deposit-quick-amounts" role="group" aria-label="Quick deposit amounts">
              <span>Choose an amount</span>
              <div>
                {QUICK_DEPOSIT_AMOUNTS.map((quickAmount) => (
                  <button
                    key={quickAmount}
                    type="button"
                    className={numericAmount === quickAmount ? "is-selected" : ""}
                    aria-pressed={numericAmount === quickAmount}
                    onClick={() => {
                      setAmount(String(quickAmount));
                      depositRequestIdRef.current = "";
                      setDepositCheckoutError("");
                    }}
                  >
                    ₱{quickAmount.toLocaleString("en-PH")}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className={isDeposit ? "exchange-deposit-amount" : undefined}>
            {isDeposit ? "Deposit amount" : "Amount"}
            <div className="exchange-input-wrap">
              <span>₱</span>
              <input
                type="number"
                min={isWithdraw ? MIN_WITHDRAWAL : 1}
                max={isWithdraw ? MAX_WITHDRAWAL : undefined}
                step="0.01"
                placeholder={isDeposit ? "1.00" : "0.00"}
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value);
                  if (isDeposit) {
                    depositRequestIdRef.current = "";
                    setDepositCheckoutError("");
                  }
                }}
              />
            </div>
          </label>
        </>
      )}
      {isDeposit && (
        <div className="exchange-deposit-note">
          <span className="material-symbols-outlined" aria-hidden="true">verified_user</span>
          <p>Payment details are entered on PayMongo&apos;s hosted checkout. Your wallet is credited after payment is confirmed.</p>
        </div>
      )}
      {depositCheckoutError && (
        <p className="exchange-error" role="alert">{depositCheckoutError}</p>
      )}
        {withdrawalAmountError && (
          <p className="exchange-error" role="alert">{withdrawalAmountError}</p>
        )}
      {isGemsExchange && (
        <div className="exchange-result">
          <span>You&apos;ll receive</span>
          <strong>
            {isLoadingExchangeInfo || gemValue === null ? "--" : formattedCurrency(pesoValue)}
          </strong>
        </div>
      )}
      <button
        className={`exchange-submit${isDeposit ? " exchange-deposit-submit" : ""}`}
        type="button"
        disabled={isGemsExchange
          ? !amount
            || numericAmount <= 0
            || isLoadingExchangeInfo
            || availableGems === null
            || gemValue === null
            || numericAmount > availableGems
          : !amount
            || numericAmount <= 0
            || (isDeposit && (numericAmount < 1 || isCreatingDepositCheckout))
            || (isWithdraw && (!accountName.trim()
              || !details.trim()
              || (method === "ewallet" && !isValidMobileNumber)
              || isLoadingWallet
              || availableWallet === null
              || numericAmount < MIN_WITHDRAWAL
              || numericAmount > MAX_WITHDRAWAL
              || totalWithdrawalDeduction > availableWallet
              || !qrCode
              || isUploadingQr))}
        onClick={() => {
          if (isGemsExchange) {
            openExchangeConfirmation();
            return;
          }
          if (isWithdraw) {
            onRequestWithdrawal({
              method,
              provider,
              accountName,
              details,
              amount: numericAmount,
              serviceFee,
              totalDeduction: totalWithdrawalDeduction,
              qrCode: qrCode
                ? { name: qrCode.name, path: qrCode.path, url: qrCode.url }
                : null,
            });
            return;
          }
          void handleDepositCheckout();
        }}
      >
        {isGemsExchange
          ? "CONFIRM EXCHANGE"
          : isDeposit
            ? isCreatingDepositCheckout ? "OPENING PAYMONGO..." : "CONTINUE TO PAYMONGO"
            : "REQUEST WITHDRAWAL"}
      </button>
      {isConfirmOpen && isGemsExchange && (
        <div
          className="exchange-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeExchangeConfirmation();
          }}
        >
          <section
            className="exchange-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exchange-confirm-title"
            aria-describedby="exchange-confirm-description"
          >
            <div className="exchange-confirm-heading">
              <span className="material-symbols-outlined" aria-hidden="true">currency_exchange</span>
              <button
                type="button"
                className="exchange-modal-close"
                onClick={closeExchangeConfirmation}
                disabled={isSubmittingExchange}
                aria-label="Close confirmation"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <h2 id="exchange-confirm-title">Confirm GEM exchange</h2>
            <p id="exchange-confirm-description">
              This exchange will immediately update your GEM and wallet balances.
            </p>
            <dl className="exchange-confirm-summary">
              <div>
                <dt>GEM to exchange</dt>
                <dd>{numericAmount.toLocaleString("en-PH", { maximumFractionDigits: 4 })} GEM</dd>
              </div>
              <div>
                <dt>Value per GEM</dt>
                <dd>{gemValue === null ? "--" : formattedCurrency(gemValue)}</dd>
              </div>
              <div className="exchange-confirm-receive">
                <dt>Wallet receives</dt>
                <dd>{formattedCurrency(pesoValue)}</dd>
              </div>
            </dl>
            {exchangeError && <p className="exchange-error" role="alert">{exchangeError}</p>}
            <div className="exchange-confirm-actions">
              <button
                type="button"
                className="exchange-cancel"
                onClick={closeExchangeConfirmation}
                disabled={isSubmittingExchange}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className="exchange-confirm-submit"
                onClick={confirmExchange}
                disabled={isSubmittingExchange || gemValue === null || pesoValue <= 0}
              >
                {isSubmittingExchange ? "Processing..." : "Confirm exchange"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function WithdrawalSummary({ summary, onBack }) {
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [pushEnableMessage, setPushEnableMessage] = useState("");
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [requestId] = useState(() => globalThis.crypto?.randomUUID?.()
    || `withdrawal-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const formattedCurrency = (value) => new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  const submitWithdrawalRequest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError("");
    try {
      if (globalThis.Notification && globalThis.Notification.permission !== "denied") {
        await enablePushNotifications({ forceRefresh: true }).catch((error) => {
          console.warn("Unable to refresh the web push token before withdrawal submission:", error);
        });
      }
      const submitRequest = httpsCallable(
        getFunctions(app, "asia-southeast1"),
        "submitWithdrawalRequest",
      );
      const { data } = await submitRequest({
        requestId,
        method: summary.method,
        provider: summary.provider,
        accountName: summary.accountName,
        details: summary.details,
        amount: summary.amount,
        qrCodePath: summary.qrCode?.path,
        qrCodeUrl: summary.qrCode?.url,
        qrCodeName: summary.qrCode?.name,
      });
      setSubmittedRequest(data);
      setIsConfirmOpen(false);
    } catch (error) {
      setSubmissionError(error?.message || "Unable to submit your withdrawal request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    setPushEnableMessage("");
    try {
      await enablePushNotifications({ forceRefresh: true });
      setPushEnableMessage("Notifications are enabled on this device for future withdrawal updates.");
    } catch (error) {
      setPushEnableMessage(error?.message || "Unable to enable push notifications on this device.");
    } finally {
      setIsEnablingPush(false);
    }
  };

  useEffect(() => {
    if (!isConfirmOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSubmitting) setIsConfirmOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isConfirmOpen, isSubmitting]);

  if (submittedRequest) {
    return (
      <section className="exchange-summary-card exchange-withdrawal-success" role="status">
        <div className="exchange-submission-check" aria-hidden="true">
          <span className="material-symbols-outlined">check</span>
        </div>
        <p className="exchange-eyebrow">Request received</p>
        <h1>Withdrawal request submitted</h1>
        <p className="exchange-withdrawal-success-caption">
          Your request is awaiting admin approval. Please allow 1-3 business days for review.
        </p>
        {submittedRequest.pushDeliveryFailed && (
          <p className="exchange-push-status" role="status">
            Your request was saved, but FCM could not deliver a push. Re-enable notifications on this device to refresh its token.
          </p>
        )}
        {submittedRequest.pushTokensRegistered === false && !submittedRequest.pushDeliveryFailed && (
          <div className="exchange-push-status">
            <p>No web push token is registered on this device yet.</p>
            <button type="button" onClick={handleEnablePush} disabled={isEnablingPush}>
              {isEnablingPush ? "Enabling..." : "Enable Notifications"}
            </button>
          </div>
        )}
        {submittedRequest.pushTokensRegistered && !submittedRequest.pushNotificationSent && !submittedRequest.pushDeliveryFailed && (
          <p className="exchange-push-status" role="status">
            Your request was saved, but push delivery failed. Check this browser&apos;s notification permissions.
          </p>
        )}
        {pushEnableMessage && <p className="exchange-push-status" role="status">{pushEnableMessage}</p>}
        <div className="exchange-withdrawal-reference">
          <span>Reference number</span>
          <strong>{submittedRequest.referenceNo}</strong>
        </div>
        <button
          type="button"
          className="exchange-summary-done"
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </section>
    );
  }

  return (
    <section className="exchange-summary-card">
      <div className="exchange-card-heading">
        <span className="material-symbols-outlined exchange-heading-icon">
          receipt_long
        </span>
        <div>
          <p className="exchange-eyebrow">Withdrawal request</p>
          <h1>Withdrawal Summary</h1>
          <p>Your withdrawal request details.</p>
        </div>
      </div>
      <dl className="exchange-summary-details">
        <div>
          <dt>Payment method</dt>
          <dd>{summary.method === "ewallet" ? "E-Wallet" : "Bank Transfer"}</dd>
        </div>
        <div>
          <dt>Provider</dt>
          <dd>{summary.provider}</dd>
        </div>
        <div>
          <dt>Account holder</dt>
          <dd>{summary.accountName}</dd>
        </div>
        <div>
          <dt>{summary.method === "ewallet" ? "Mobile number" : "Bank account number"}</dt>
          <dd>{summary.details}</dd>
        </div>
        <div>
          <dt>Withdrawal amount</dt>
          <dd>{formattedCurrency(summary.amount)}</dd>
        </div>
        <div>
          <dt>Service fee (8%)</dt>
          <dd>-{formattedCurrency(summary.serviceFee)}</dd>
        </div>
        <div className="exchange-summary-total-deduction">
          <dt>Total deduction from wallet</dt>
          <dd>{formattedCurrency(summary.totalDeduction)}</dd>
        </div>
      </dl>
      {summary.qrCode && (
        <div className="exchange-summary-qr">
          <span>Payout QR code</span>
          <img src={summary.qrCode.url} alt="Payout QR code" />
          <small>{summary.qrCode.name}</small>
        </div>
      )}
      <div className="exchange-summary-actions">
        <button type="button" className="exchange-summary-back" onClick={onBack}>
          Back to Withdraw
        </button>
        <button
          type="button"
          className="exchange-summary-done"
          onClick={() => {
            setSubmissionError("");
            setIsConfirmOpen(true);
          }}
        >
          Done
        </button>
      </div>
      {isConfirmOpen && (
        <div
          className="exchange-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) setIsConfirmOpen(false);
          }}
        >
          <section
            className="exchange-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="withdraw-confirm-title"
            aria-describedby="withdraw-confirm-description"
            aria-busy={isSubmitting}
          >
            <div className="exchange-confirm-heading">
              <span className="material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
              <button
                type="button"
                className="exchange-modal-close"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
                aria-label="Close confirmation"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>
            <h2 id="withdraw-confirm-title">Confirm withdrawal request</h2>
            <p id="withdraw-confirm-description">
              The withdrawal amount and service fee will be deducted now. If an administrator rejects the request, the full amount will be refunded.
            </p>
            <dl className="exchange-confirm-summary">
              <div>
                <dt>Withdrawal amount</dt>
                <dd>{formattedCurrency(summary.amount)}</dd>
              </div>
              <div>
                <dt>Service fee (8%)</dt>
                <dd>{formattedCurrency(summary.serviceFee)}</dd>
              </div>
              <div className="exchange-confirm-receive">
                <dt>Total wallet deduction</dt>
                <dd>{formattedCurrency(summary.totalDeduction)}</dd>
              </div>
            </dl>
            {submissionError && <p className="exchange-error" role="alert">{submissionError}</p>}
            <div className="exchange-confirm-actions">
              <button
                type="button"
                className="exchange-cancel"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                className="exchange-confirm-submit"
                onClick={submitWithdrawalRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Confirm request"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default function ExchangePage() {
  const { mode } = useParams();
  const navigate = useNavigate();
  const [withdrawalSummary, setWithdrawalSummary] = useState(null);
  const showingWithdrawalSummary = mode === "withdraw" && withdrawalSummary !== null;
  if (mode && options[mode])
    return (
      <div className="exchange-root">
        <header className="exchange-header">
          <button
            type="button"
            onClick={() => showingWithdrawalSummary
              ? setWithdrawalSummary(null)
              : navigate("/exchange")}
            aria-label={showingWithdrawalSummary ? "Back to Withdraw" : "Back to Exchange"}
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <strong>{showingWithdrawalSummary ? "Withdrawal Summary" : options[mode].title}</strong>
          <span />
        </header>
        <main className="exchange-main">
          {mode === "withdraw" ? (
            <>
              <div className="exchange-form-stage" hidden={showingWithdrawalSummary}>
                <ExchangeForm mode={mode} onRequestWithdrawal={setWithdrawalSummary} />
              </div>
              {showingWithdrawalSummary && (
                <WithdrawalSummary
                  summary={withdrawalSummary}
                  onBack={() => setWithdrawalSummary(null)}
                />
              )}
            </>
          ) : (
            <ExchangeForm mode={mode} />
          )}
        </main>
      </div>
    );
  return (
    <div className="exchange-root">
      <header className="exchange-header">
        <Link to="/dashboard" aria-label="Close Exchange">
          <span className="material-symbols-outlined">close</span>
        </Link>
        <strong>Exchange</strong>
        <span />
      </header>
      <main className="exchange-main">
        <div className="exchange-options">
          {Object.entries(options).map(([key, option]) => (
            <Link className="exchange-option" to={`/exchange/${key}`} key={key}>
              <span className="exchange-option-icon material-symbols-outlined">
                {option.icon}
              </span>
              <span>
                <strong>{option.title}</strong>
                <small>{option.caption}</small>
              </span>
              <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
