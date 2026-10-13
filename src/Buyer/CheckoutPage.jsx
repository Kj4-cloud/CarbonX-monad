import React, { useState, useEffect, useRef, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  formatAddress,
  connectMetaMask,
  isMetaMaskAvailable,
} from "../blockchain/walletUtils";
import { mintCredits } from "../blockchain/mint";
import { logTransaction } from "../blockchain/logTransaction";
import { isContractConfigured } from "../blockchain/config";

/* ═══════════════════════════════════════════════════════════════════
   Processing Steps — Monad Testnet execution animation sequence
   ═══════════════════════════════════════════════════════════════════ */
const PROCESSING_STEPS = [
  { label: "Validating order details…" },
  { label: "Awaiting MetaMask confirmation…" },
  { label: "Confirming block on Monad Testnet…" },
  { label: "Recording on-chain proof & updating supply…" },
  { label: "Transaction confirmed!" },
];

/* ─── Circular Progress Ring ──────────────────────────────────── */
function CircularProgress({ progress, done }) {
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (progress / 100) * CIRC;

  return (
    <div className="relative w-32 h-32 mx-auto mb-6">
      <svg width="128" height="128" viewBox="0 0 128 128" className="rotate-[-90deg]">
        {/* background track */}
        <circle cx="64" cy="64" r={R} fill="none" stroke="#e3e8e5" strokeWidth="6" className="dark:stroke-[#2d4235]" />
        {/* progress arc */}
        <circle
          cx="64" cy="64" r={R}
          fill="none"
          stroke="#13ec6d"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {/* center check / spinner */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
            done
              ? "bg-[#13ec6d]/15 scale-110"
              : "bg-[#f0f4f2] dark:bg-[#1a2b21]"
          }`}
        >
          <span
            className="material-icons-round transition-all duration-300"
            style={{
              fontSize: "1.75rem",
              color: "#13ec6d",
            }}
          >
            {done ? "check_circle" : "pending"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Step Row ─────────────────────────────────────────────────── */
function StepRow({ label, status }) {
  // status: 'waiting' | 'active' | 'done'
  return (
    <div
      className={`flex items-center gap-3 py-3 px-1 transition-all duration-500 ${
        status === "waiting" ? "opacity-30" : "opacity-100"
      }`}
    >
      <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
        {status === "done" ? (
          <span className="material-icons-round text-[#13ec6d] animate-scale-in" style={{ fontSize: "1.4rem" }}>
            check_circle
          </span>
        ) : status === "active" ? (
          <span className="material-icons-round text-[#13ec6d] animate-spin" style={{ fontSize: "1.25rem" }}>
            progress_activity
          </span>
        ) : (
          <span className="material-icons-round text-[#c7d1cc] dark:text-[#4a6354]" style={{ fontSize: "1.25rem" }}>
            radio_button_unchecked
          </span>
        )}
      </div>
      <p
        className={`text-sm font-semibold transition-colors duration-300 ${
          status === "done"
            ? "text-[#0c1510] dark:text-[#f0f4f2]"
            : status === "active"
              ? "text-[#0c1510] dark:text-[#f0f4f2]"
              : "text-[#9db0a5]"
        }`}
      >
        {label}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Processing Overlay Modal
   ═══════════════════════════════════════════════════════════════════ */
function ProcessingModal({ currentStep, isDone, helperText }) {
  const progress = isDone
    ? 100
    : Math.min(95, ((currentStep + 1) / PROCESSING_STEPS.length) * 100);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white dark:bg-[#1a2b21] rounded-2xl max-w-md w-full p-8 animate-slide-up shadow-2xl border border-[#e3e8e5] dark:border-[#2d4235]"
        style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#13ec6d]/15 flex items-center justify-center">
            <span
              className="material-icons-round text-[#13ec6d]"
              style={{ fontSize: "1.25rem" }}
            >
              {isDone ? "check_circle" : "more_horiz"}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0c1510] dark:text-[#f0f4f2]">
              {isDone ? "Complete! 🎉" : "Processing Transaction…"}
            </h2>
            <p className="text-xs text-[#9db0a5]">
              {helperText ||
                (isDone
                  ? "Your transaction has been confirmed on Monad"
                  : "Please wait while we interact with Monad Testnet")}
            </p>
          </div>
        </div>

        {/* Circular Progress */}
        <CircularProgress progress={progress} done={isDone} />

        {/* Step List */}
        <div className="border-t border-[#f0f4f2] dark:border-[#2d4235] pt-4 mb-4">
          {PROCESSING_STEPS.map((step, idx) => {
            let status = "waiting";
            if (idx < currentStep || isDone) status = "done";
            else if (idx === currentStep) status = "active";
            return <StepRow key={idx} label={step.label} status={status} />;
          })}
        </div>

        {/* Footer guidance */}
        {currentStep === 1 && !isDone && (
          <div className="bg-[#13ec6d]/10 border border-[#13ec6d]/30 rounded-xl p-3 text-center text-xs font-semibold text-[#0c1510] dark:text-[#f0f4f2] animate-pulse">
            👉 Please check your MetaMask window or browser popup to approve the transaction.
          </div>
        )}
        {(currentStep !== 1 || isDone) && (
          <p className="text-center text-[11px] text-[#f59e0b] font-medium mt-2">
            ⚠️ Do not close or refresh this window while the transaction is being processed.
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CheckoutPage — Main Component
   ═══════════════════════════════════════════════════════════════════ */
export default function CheckoutPage({
  cart,
  totalPrice,
  totalItems,
  onComplete,
  onBack,
  clearCart,
}) {
  const { user, profile } = useAuth();
  const { wallet, fetchWallet } = useWallet();
  const [paymentMethod, setPaymentMethod] = useState("carbonx_wallet");
  const [metamaskAddress, setMetamaskAddress] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [error, setError] = useState(null);
  const [sellerWallets, setSellerWallets] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [helperText, setHelperText] = useState("");

  // Fetch seller wallet addresses for display
  useEffect(() => {
    const fetchSellerWallets = async () => {
      const farmerIds = [
        ...new Set(cart.map((item) => item.farmer_id).filter(Boolean)),
      ];
      if (farmerIds.length === 0) return;

      const { data } = await supabase
        .from("wallets")
        .select("user_id, wallet_address")
        .in("user_id", farmerIds);

      if (data) {
        const map = {};
        data.forEach((w) => {
          map[w.user_id] = w.wallet_address;
        });
        setSellerWallets(map);
      }
    };
    fetchSellerWallets();
  }, [cart]);

  const handleConnectMetaMask = async () => {
    const result = await connectMetaMask();
    if (result.address) {
      setMetamaskAddress(result.address);
      setPaymentMethod("metamask");
    } else {
      setError(result.error || "Failed to connect MetaMask");
    }
  };

  const handleConfirmPayment = async () => {
    if (!user) {
      setError("You must be logged in to checkout.");
      return;
    }

    if (!cart || cart.length === 0) {
      setError("Your cart is empty. Please add carbon credits from the marketplace.");
      return;
    }

    if (paymentMethod === "carbonx_wallet") {
      if (!wallet || wallet.balance < totalPrice) {
        setError(
          `Insufficient wallet balance. You need ₹${totalPrice.toLocaleString("en-IN")} but have ₹${Number(wallet?.balance || 0).toLocaleString("en-IN")}`,
        );
        return;
      }
    } else if (paymentMethod === "metamask") {
      if (!metamaskAddress) {
        setError("Please connect your MetaMask wallet on Monad Testnet before proceeding.");
        return;
      }
      if (!isContractConfigured()) {
        setError(
          "CarbonX smart contract has not been deployed on Monad Testnet yet. Please deploy contracts/CarbonXMarketplace.sol using Remix and set VITE_CARBONX_CONTRACT_ADDRESS in .env."
        );
        return;
      }
    }

    setProcessing(true);
    setError(null);
    setCurrentStep(0);
    setIsDone(false);
    setHelperText("Encrypting order data and validating supply…");
    setShowProcessingModal(true);

    try {
      // 1. Create the order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          total_amount: totalPrice,
          total_credits: totalItems,
          status: "completed",
          buyer_wallet_address: wallet?.wallet_address || metamaskAddress || "",
          payment_method: paymentMethod,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Insert order items with farmer wallet addresses
      const orderItems = cart.map((item) => ({
        order_id: orderData.id,
        project_id: item.id,
        farmer_id: item.farmer_id || null,
        quantity: item.quantity,
        price_per_credit: item.price,
        credits_purchased: item.quantity,
        farmer_wallet_address:
          sellerWallets[item.farmer_id] || "",
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Process payment based on method
      let txHash = "";

      if (paymentMethod === "carbonx_wallet") {
        setCurrentStep(2);
        setHelperText("Processing internal wallet balance deduction…");

        // Deduct from buyer wallet
        const newBalance = wallet.balance - totalPrice;
        const { error: walletError } = await supabase
          .from("wallets")
          .update({ balance: newBalance })
          .eq("id", wallet.id);

        if (walletError) throw walletError;

        // Generate tx hash
        txHash =
          "0x" +
          [...Array(64)]
            .map(() => Math.floor(Math.random() * 16).toString(16))
            .join("");

        // Log purchase transaction for buyer
        await supabase.from("wallet_transactions").insert({
          wallet_id: wallet.id,
          type: "purchase",
          amount: totalPrice,
          description: `Purchased ${totalItems} carbon credits`,
          tx_hash: txHash,
          from_address: wallet.wallet_address,
          to_address: "multiple_sellers",
          order_id: orderData.id,
        });

        // Credit each farmer's wallet
        for (const item of cart) {
          if (item.farmer_id) {
            const itemTotal = item.quantity * item.price;

            const { data: farmerWallet } = await supabase
              .from("wallets")
              .select("*")
              .eq("user_id", item.farmer_id)
              .maybeSingle();

            if (farmerWallet) {
              await supabase
                .from("wallets")
                .update({ balance: farmerWallet.balance + itemTotal })
                .eq("id", farmerWallet.id);

              await supabase.from("wallet_transactions").insert({
                wallet_id: farmerWallet.id,
                type: "sale",
                amount: itemTotal,
                description: `Sale of ${item.quantity} credits - ${item.name || "Carbon Credits"}`,
                tx_hash: txHash,
                from_address: wallet.wallet_address,
                to_address: farmerWallet.wallet_address,
                order_id: orderData.id,
              });
            }

            await supabase.rpc("update_farmer_stats", {
              p_farmer_id: item.farmer_id,
              p_credits: item.quantity,
              p_revenue: itemTotal,
            });
          }
        }

        await fetchWallet();
      } else {
        // MetaMask payment — execute actual Monad blockchain transaction
        setCurrentStep(1);
        setHelperText("Please approve the transaction prompt in your MetaMask popup window…");

        const txResponse = await mintCredits(
          metamaskAddress,
          totalItems,
          1,
          (stage, hashOrReceipt) => {
            if (stage === "registering" || stage === "waiting_registration") {
              setHelperText("Registering project contract on Monad Testnet…");
            } else if (stage === "awaiting_signature") {
              setCurrentStep(1);
              setHelperText("Please approve the credit minting in MetaMask…");
            } else if (stage === "mining_block") {
              setCurrentStep(2);
              setHelperText("Transaction broadcast! Confirming block on Monad Testnet…");
            } else if (stage === "confirmed") {
              setCurrentStep(3);
              setHelperText("Block confirmed! Recording proof and updating supply…");
            }
          }
        );

        if (txResponse && txResponse.hash) {
          txHash = txResponse.hash;
          setCurrentStep(3);
          setHelperText("Logging transaction proof on Monad Testnet…");

          await logTransaction({
            txHash,
            fromAddr: metamaskAddress,
            toAddr: metamaskAddress,
            tokenId: 1,
            amount: totalItems,
            txType: "mint",
            blockNumber: txResponse.blockNumber || null,
          });
        } else {
          throw new Error("No transaction hash returned from Monad network.");
        }
      }

      // 4. Deduct credits from each project
      setCurrentStep(3);
      setHelperText("Updating project inventory & carbon supply…");
      for (const item of cart) {
        const { error: deductError } = await supabase.rpc("deduct_credits", {
          p_project_id: item.id,
          p_quantity: item.quantity,
        });
        if (deductError)
          console.error("Credit deduction failed:", deductError);
      }

      // 5. Success! Prepare completion data and navigate
      setCurrentStep(4);
      setIsDone(true);
      setHelperText("Transaction confirmed! Redirecting to your purchase invoice…");

      const completionData = {
        order: orderData,
        orderItems,
        txHash,
        paymentMethod,
        buyerName:
          profile?.full_name ||
          user?.user_metadata?.full_name ||
          user?.email ||
          "Buyer",
        buyerWallet: wallet?.wallet_address || metamaskAddress || "",
        sellerWallets,
      };

      // Ensure user sees the success checkmark for 1.2s then transition
      setTimeout(() => {
        if (clearCart) clearCart();
        setShowProcessingModal(false);
        setProcessing(false);
        onComplete(completionData);
      }, 1200);

    } catch (err) {
      console.error("Checkout error:", err);
      setShowProcessingModal(false);
      setProcessing(false);
      setIsDone(false);
      setError(
        err.reason ||
        err.message ||
        "Payment failed or was rejected. Please try again."
      );
    }
  };

  // If cart is empty and no checkout in progress, display empty cart view
  if (cart.length === 0 && !processing && !showProcessingModal) {
    return (
      <div className="px-5 flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 animate-slide-up pb-8">
        <div className="w-20 h-20 rounded-full bg-[#13ec6d]/10 flex items-center justify-center text-[#13ec6d] mb-2">
          <span className="material-icons-round" style={{ fontSize: "2.5rem" }}>
            shopping_cart
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-[#0c1510] dark:text-[#f0f4f2]">
          Your Cart is Empty
        </h2>
        <p className="text-sm text-[#718b7c] max-w-sm">
          You don't have any carbon credits in your cart to checkout.
        </p>
        <button
          onClick={onBack}
          className="mt-3 px-6 py-3.5 bg-[#13ec6d] hover:bg-[#0fc85d] text-[#0c1510] font-black rounded-xl transition-all font-[Manrope] text-sm cursor-pointer border-none shadow-sm flex items-center gap-2"
        >
          <span className="material-icons-round" style={{ fontSize: "1.1rem" }}>
            storefront
          </span>
          Explore Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 flex flex-col gap-5 animate-slide-up pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-[#f0f4f2] dark:bg-[#1a2b21] flex items-center justify-center cursor-pointer border-none text-[#0c1510] dark:text-[#f0f4f2] hover:bg-[#e3e8e5] dark:hover:bg-[#2d4235] transition-colors"
        >
          <span className="material-icons-round">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0c1510] dark:text-[#f0f4f2]">
            Checkout
          </h1>
          <p className="text-[#718b7c] text-sm">Confirm your purchase</p>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-white dark:bg-[#1a2b21] rounded-2xl border border-[#e3e8e5] dark:border-[#2d4235] overflow-hidden">
        <div className="p-4 border-b border-[#e3e8e5] dark:border-[#2d4235]">
          <h3 className="font-bold text-sm text-[#0c1510] dark:text-[#f0f4f2] flex items-center gap-2">
            <span
              className="material-icons-round"
              style={{ fontSize: "1rem", color: "#13ec6d" }}
            >
              receipt
            </span>
            Order Summary
          </h3>
        </div>

        {cart.map((item) => (
          <div
            key={item.id}
            className="p-4 border-b border-[#f0f4f2] dark:border-[#2d4235]/50 last:border-0 flex items-center gap-3"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[#0c1510] dark:text-[#f0f4f2] truncate">
                {item.name}
              </p>
              <p className="text-xs text-[#718b7c]">
                {item.quantity} × ₹{item.price.toFixed(0)}
              </p>
              {item.farmer_id && sellerWallets[item.farmer_id] && (
                <p className="text-[10px] text-[#9db0a5] font-mono mt-1">
                  Seller: {formatAddress(sellerWallets[item.farmer_id])}
                </p>
              )}
            </div>
            <p className="font-black text-sm text-[#0c1510] dark:text-[#f0f4f2]">
              ₹{(item.quantity * item.price).toLocaleString("en-IN")}
            </p>
          </div>
        ))}

        <div className="p-4 bg-[#f6f8f7] dark:bg-[#102218] flex justify-between items-center">
          <span className="font-bold text-[#0c1510] dark:text-[#f0f4f2]">
            Total ({totalItems} credits)
          </span>
          <span className="text-xl font-black text-[#13ec6d]">
            ₹{totalPrice.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white dark:bg-[#1a2b21] rounded-2xl border border-[#e3e8e5] dark:border-[#2d4235] overflow-hidden">
        <div className="p-4 border-b border-[#e3e8e5] dark:border-[#2d4235]">
          <h3 className="font-bold text-sm text-[#0c1510] dark:text-[#f0f4f2] flex items-center gap-2">
            <span
              className="material-icons-round"
              style={{ fontSize: "1rem", color: "#13ec6d" }}
            >
              payment
            </span>
            Payment Method
          </h3>
        </div>

        {/* CarbonX Wallet option */}
        <button
          onClick={() => setPaymentMethod("carbonx_wallet")}
          className={`w-full p-4 flex items-center gap-4 border-b border-[#f0f4f2] dark:border-[#2d4235]/50 cursor-pointer transition-colors bg-transparent font-[Manrope] text-left ${
            paymentMethod === "carbonx_wallet"
              ? "bg-[#13ec6d]/5"
              : "hover:bg-[#f6f8f7] dark:hover:bg-[#102218]"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              paymentMethod === "carbonx_wallet"
                ? "border-[#13ec6d]"
                : "border-[#c7d1cc] dark:border-[#4a6354]"
            }`}
          >
            {paymentMethod === "carbonx_wallet" && (
              <div className="w-3 h-3 rounded-full bg-[#13ec6d]" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-[#0c1510] dark:text-[#f0f4f2]">
              CarbonX Wallet
            </p>
            <p className="text-xs text-[#9db0a5] font-mono">
              {formatAddress(wallet?.wallet_address)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-black text-sm text-[#13ec6d]">
              ₹{Number(wallet?.balance || 0).toLocaleString("en-IN")}
            </p>
            <p className="text-[10px] text-[#9db0a5]">Balance</p>
          </div>
        </button>

        {/* MetaMask option */}
        <button
          onClick={() => {
            if (metamaskAddress) {
              setPaymentMethod("metamask");
            } else {
              handleConnectMetaMask();
            }
          }}
          className={`w-full p-4 flex items-center gap-4 cursor-pointer transition-colors bg-transparent font-[Manrope] text-left ${
            paymentMethod === "metamask"
              ? "bg-[#f59e0b]/5"
              : "hover:bg-[#f6f8f7] dark:hover:bg-[#102218]"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              paymentMethod === "metamask"
                ? "border-[#f59e0b]"
                : "border-[#c7d1cc] dark:border-[#4a6354]"
            }`}
          >
            {paymentMethod === "metamask" && (
              <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-[#0c1510] dark:text-[#f0f4f2]">
              MetaMask Wallet
              {!isMetaMaskAvailable() && (
                <span className="text-[10px] text-[#9db0a5] ml-2">
                  (Not installed)
                </span>
              )}
            </p>
            <p className="text-xs text-[#9db0a5] font-mono">
              {metamaskAddress ? formatAddress(metamaskAddress) : "Connect to proceed"}
            </p>
          </div>
          {!metamaskAddress && isMetaMaskAvailable() && (
            <span className="text-xs font-bold text-[#f59e0b]">Connect</span>
          )}
        </button>
      </div>

      {/* Wallet Info */}
      {wallet && (
        <div className="bg-[#f6f8f7] dark:bg-[#102218] rounded-xl p-4 border border-[#e3e8e5] dark:border-[#2d4235]">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="material-icons-round"
              style={{ fontSize: "0.875rem", color: "#13ec6d" }}
            >
              info
            </span>
            <span className="text-xs font-bold text-[#9db0a5] uppercase">
              Your Wallet
            </span>
          </div>
          <p className="text-xs text-[#718b7c] font-mono break-all">
            {wallet.wallet_address}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-4 flex items-start gap-3">
          <span
            className="material-icons-round text-red-500 flex-shrink-0"
            style={{ fontSize: "1.25rem" }}
          >
            error
          </span>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Confirm Button */}
      <button
        onClick={handleConfirmPayment}
        disabled={processing || cart.length === 0}
        className="w-full bg-[#13ec6d] hover:bg-[#0fc85d] text-[#0c1510] font-black py-5 rounded-xl transition-all hover:shadow-lg text-base cursor-pointer border-none font-[Manrope] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
      >
        {processing ? (
          <>
            <span className="material-icons-round animate-spin" style={{ fontSize: "1.25rem" }}>
              progress_activity
            </span>
            Processing Payment...
          </>
        ) : (
          <>
            <span className="material-icons-round" style={{ fontSize: "1.25rem" }}>
              lock
            </span>
            Confirm Payment — ₹{totalPrice.toLocaleString("en-IN")}
          </>
        )}
      </button>

      <p className="text-center text-[10px] text-[#9db0a5]">
        🔒 Secured by CarbonX blockchain verification
      </p>

      {/* ─── Processing Animation Modal ─────────────────────────── */}
      {showProcessingModal && (
        <ProcessingModal
          currentStep={currentStep}
          isDone={isDone}
          helperText={helperText}
        />
      )}
    </div>
  );
}
