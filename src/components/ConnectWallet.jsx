// src/components/ConnectWallet.jsx
import { useBlockchain } from "../blockchain/useBlockchain";

export default function ConnectWallet() {
  const { account, isConnecting, chainOk, connectWallet, switchNetwork } =
    useBlockchain();

  const short = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : "");

  if (account) {
    if (!chainOk) {
      return (
        <button
          onClick={switchNetwork}
          title="Click to switch to Monad Testnet"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#FFF3CD",
            border: "1px solid #FFEEBA",
            color: "#856404",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span style={{ color: "#E65100" }}>⚠️</span>
          <span>Switch to Monad Testnet</span>
        </button>
      );
    }

    return (
      <div
        title={`Connected to Monad Testnet: ${account}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(19, 236, 109, 0.12)",
          border: "1px solid rgba(19, 236, 109, 0.3)",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
        }}
      >
        <span style={{ color: "#13ec6d", fontWeight: 700 }}>●</span>
        <span
          style={{
            fontFamily: "monospace",
            color: "#0c1510",
            fontWeight: 600,
          }}
          className="dark:text-[#f0f4f2]"
        >
          {short(account)}
        </span>
        <span
          style={{
            fontSize: 10,
            background: "rgba(19, 236, 109, 0.2)",
            color: "#0c1510",
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 700,
          }}
          className="dark:text-[#13ec6d]"
        >
          MONAD
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
      style={{
        background: "#13ec6d",
        color: "#0c1510",
        border: "none",
        borderRadius: 8,
        padding: "8px 16px",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span>🦊</span>
      <span>{isConnecting ? "Connecting..." : "Connect Monad"}</span>
    </button>
  );
}
