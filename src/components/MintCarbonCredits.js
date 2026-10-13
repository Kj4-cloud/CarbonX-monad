// src/components/MintCarbonCredits.js
import { useState } from "react";
import { useBlockchain } from "../blockchain/useBlockchain";
import { isContractConfigured, BLOCK_EXPLORER } from "../blockchain/config";

export default function MintCarbonCredits() {
  const { account, connectWallet, isCorrectNetwork, switchNetwork } = useBlockchain();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);

  const handleMint = async () => {
    if (!account) {
      await connectWallet();
      return;
    }

    if (!isCorrectNetwork) {
      await switchNetwork();
      return;
    }

    if (!isContractConfigured()) {
      setError(
        "CarbonX smart contract has not been deployed on Monad Testnet yet. Please configure VITE_CARBONX_CONTRACT_ADDRESS in .env."
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { mintCredits } = await import("../blockchain/mint");
      const tx = await mintCredits(account, 10, 1);
      setTxHash(tx.hash);
    } catch (err) {
      setError(err.message || "Minting transaction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, background: "#fff", borderRadius: 12, border: "1px solid #e0e0e0" }}>
      <h3 style={{ margin: "0 0 8px", color: "#13ec6d" }}>Mint Carbon Credits (Monad Testnet)</h3>
      <p style={{ margin: "0 0 16px", color: "#666", fontSize: 13 }}>
        Issue 10 verified carbon credit units to your connected address.
      </p>

      {!isContractConfigured() && (
        <div style={{ padding: 10, background: "#fff3cd", border: "1px solid #ffeeba", borderRadius: 8, marginBottom: 12, fontSize: 12, color: "#856404" }}>
          ⚠️ Contract setup required: Deploy <code>CarbonXMarketplace.sol</code> to Monad Testnet and set <code>VITE_CARBONX_CONTRACT_ADDRESS</code>.
        </div>
      )}

      <button
        onClick={handleMint}
        disabled={loading}
        style={{
          background: "#13ec6d",
          color: "#0c1510",
          border: "none",
          borderRadius: 8,
          padding: "10px 18px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {loading ? "Issuing on Monad..." : "Mint 10 Carbon Credits"}
      </button>

      {txHash && (
        <p style={{ marginTop: 12, color: "#2e7d32", fontSize: 13 }}>
          Mint successful!{" "}
          <a href={`${BLOCK_EXPLORER}${txHash}`} target="_blank" rel="noreferrer" style={{ color: "#836ef9" }}>
            View on Monad Explorer ↗
          </a>
        </p>
      )}

      {error && <p style={{ marginTop: 12, color: "#d32f2f", fontSize: 13 }}>{error}</p>}
    </div>
  );
}