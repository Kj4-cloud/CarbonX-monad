// src/blockchain/useBlockchain.js
import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import CarbonXMarketplaceABI from "../abi/CarbonXMarketplace.json";
import {
  CARBON_CREDIT_ADDRESS,
  MONAD_TESTNET_CHAIN_ID,
  MONAD_NETWORK,
  RPC_URL,
  isContractConfigured,
  getExplorerTxUrl,
} from "./config";

/**
 * Human-friendly error translation for Web3 / MetaMask interactions.
 */
export function parseBlockchainError(err) {
  if (!err) return "Unknown blockchain error occurred.";
  const msg = err.message || String(err);

  // User rejected
  if (err.code === 4001 || msg.includes("ACTION_REJECTED") || msg.includes("user rejected")) {
    return "Transaction was cancelled / rejected in your wallet.";
  }

  // Pending request in MetaMask
  if (err.code === -32002) {
    return "MetaMask request is already pending. Please open your MetaMask extension.";
  }

  // Insufficient funds
  if (
    msg.includes("insufficient funds") ||
    msg.includes("INSUFFICIENT_FUNDS") ||
    err.code === "INSUFFICIENT_FUNDS"
  ) {
    return "Insufficient testnet MON funds in your wallet to cover the transaction and gas fees.";
  }

  // Unconfigured contract
  if (msg.includes("not yet configured")) {
    return msg;
  }

  // Execution reverted with reason
  if (err.reason) {
    return `Smart contract reverted: ${err.reason}`;
  }

  if (err.shortMessage) {
    return err.shortMessage;
  }

  return msg.length > 120 ? msg.slice(0, 120) + "…" : msg;
}

export function useBlockchain() {
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setConnecting] = useState(false);
  const [chainOk, setChainOk] = useState(false);
  const [error, setError] = useState(null);
  const [txState, setTxState] = useState("idle"); // idle | pending | confirmed | failed
  const [lastTxHash, setLastTxHash] = useState(null);

  // ── Auto-detect wallet & active chain on load ──────────────────
  const checkCurrentNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);
      const isMonad = currentChainId === MONAD_TESTNET_CHAIN_ID;
      setChainOk(isMonad);
      return isMonad;
    } catch {
      setChainOk(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
      if (accs && accs.length > 0) {
        setAccount(accs[0]);
        checkCurrentNetwork();
      }
    });

    const handleAccountsChanged = (accs) => {
      setAccount(accs && accs.length > 0 ? accs[0] : null);
    };

    const handleChainChanged = () => {
      checkCurrentNetwork();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [checkCurrentNetwork]);

  // ── Switch or Add Monad Testnet ────────────────────────────────
  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) {
      window.open("https://metamask.io/download/", "_blank");
      return false;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: MONAD_NETWORK.chainId }],
      });
      setChainOk(true);
      setError(null);
      return true;
    } catch (switchErr) {
      // 4902: Chain not yet added to wallet
      if (switchErr.code === 4902 || switchErr.message?.includes("Unrecognized chain")) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [MONAD_NETWORK],
          });
          setChainOk(true);
          setError(null);
          return true;
        } catch (addErr) {
          setError(parseBlockchainError(addErr));
          return false;
        }
      }
      setError(parseBlockchainError(switchErr));
      return false;
    }
  }, []);

  // ── Connect MetaMask + Auto-switch to Monad Testnet ────────────
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      window.open("https://metamask.io/download/", "_blank");
      setError("MetaMask is not installed. Please install MetaMask to use Web3 features.");
      return null;
    }

    setConnecting(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const activeAddress = accounts[0];
      setAccount(activeAddress);

      // Verify network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);

      if (currentChainId !== MONAD_TESTNET_CHAIN_ID) {
        const switched = await switchNetwork();
        if (!switched) {
          setConnecting(false);
          return null;
        }
      }

      setChainOk(true);
      setConnecting(false);
      return await provider.getSigner();
    } catch (err) {
      const parsed = parseBlockchainError(err);
      setError(parsed);
      setConnecting(false);
      return null;
    }
  }, [switchNetwork]);

  // ── Get contract instance with signer ──────────────────────────
  const getContract = useCallback(async () => {
    if (!isContractConfigured()) {
      throw new Error(
        "CarbonX smart contract has not been deployed or configured yet. Deploy via Remix to Monad Testnet and set VITE_CARBONX_CONTRACT_ADDRESS."
      );
    }

    const signer = await connectWallet();
    if (!signer) return null;

    return new ethers.Contract(CARBON_CREDIT_ADDRESS, CarbonXMarketplaceABI, signer);
  }, [connectWallet]);

  // ── Get read-only contract instance with Monad RPC ─────────────
  const getReadOnlyContract = useCallback(() => {
    if (!isContractConfigured()) return null;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    return new ethers.Contract(CARBON_CREDIT_ADDRESS, CarbonXMarketplaceABI, provider);
  }, []);

  // ── Transfer credits to another wallet ─────────────────────────
  const transferCredits = useCallback(
    async (toAddress, projectId, amount) => {
      setTxState("pending");
      setError(null);
      try {
        const contract = await getContract();
        if (!contract) throw new Error("Wallet not connected");

        const tx = await contract.safeTransferFrom(
          account,
          toAddress,
          projectId,
          amount,
          "0x"
        );
        setLastTxHash(tx.hash);
        const receipt = await tx.wait();
        setTxState("confirmed");
        return { txHash: tx.hash, receipt };
      } catch (err) {
        setTxState("failed");
        const parsed = parseBlockchainError(err);
        setError(parsed);
        throw new Error(parsed);
      }
    },
    [account, getContract]
  );

  // ── Permanently retire (burn) credits ──────────────────────────
  const retireCredits = useCallback(
    async (projectId, amount, reason = "Voluntary Carbon Offset") => {
      setTxState("pending");
      setError(null);
      try {
        const contract = await getContract();
        if (!contract) throw new Error("Wallet not connected");

        const tx = await contract.retireCredits(projectId, amount, reason);
        setLastTxHash(tx.hash);
        const receipt = await tx.wait();
        setTxState("confirmed");
        return { txHash: tx.hash, receipt };
      } catch (err) {
        setTxState("failed");
        const parsed = parseBlockchainError(err);
        setError(parsed);
        throw new Error(parsed);
      }
    },
    [getContract]
  );

  // ── Purchase credits on marketplace with native MON ────────────
  const buyCredits = useCallback(
    async (listingId, amount, totalCostWei) => {
      setTxState("pending");
      setError(null);
      try {
        const contract = await getContract();
        if (!contract) throw new Error("Wallet not connected");

        const tx = await contract.buyCredits(listingId, amount, {
          value: totalCostWei,
        });
        setLastTxHash(tx.hash);
        const receipt = await tx.wait();
        setTxState("confirmed");
        return { txHash: tx.hash, receipt };
      } catch (err) {
        setTxState("failed");
        const parsed = parseBlockchainError(err);
        setError(parsed);
        throw new Error(parsed);
      }
    },
    [getContract]
  );

  // ── List credits for sale ──────────────────────────────────────
  const listCredits = useCallback(
    async (projectId, amount, pricePerCreditInWei) => {
      setTxState("pending");
      setError(null);
      try {
        const contract = await getContract();
        if (!contract) throw new Error("Wallet not connected");

        const tx = await contract.listCredits(projectId, amount, pricePerCreditInWei);
        setLastTxHash(tx.hash);
        const receipt = await tx.wait();
        setTxState("confirmed");
        return { txHash: tx.hash, receipt };
      } catch (err) {
        setTxState("failed");
        const parsed = parseBlockchainError(err);
        setError(parsed);
        throw new Error(parsed);
      }
    },
    [getContract]
  );

  // ── Withdraw accumulated sales proceeds in native MON ──────────
  const withdrawProceeds = useCallback(async () => {
    setTxState("pending");
    setError(null);
    try {
      const contract = await getContract();
      if (!contract) throw new Error("Wallet not connected");

      const tx = await contract.withdrawProceeds();
      setLastTxHash(tx.hash);
      const receipt = await tx.wait();
      setTxState("confirmed");
      return { txHash: tx.hash, receipt };
    } catch (err) {
      setTxState("failed");
      const parsed = parseBlockchainError(err);
      setError(parsed);
      throw new Error(parsed);
    }
  }, [getContract]);

  // ── Read balance for a wallet address + token ID ───────────────
  const getBalance = useCallback(
    async (address, tokenId) => {
      if (!isContractConfigured() || !address) return "0";
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(
          CARBON_CREDIT_ADDRESS,
          CarbonXMarketplaceABI,
          provider
        );
        const bal = await contract.balanceOf(address, tokenId);
        return bal.toString();
      } catch (err) {
        console.warn("Could not read on-chain balance:", err.message);
        return "0";
      }
    },
    []
  );

  // ── Read pending seller proceeds ───────────────────────────────
  const getPendingProceeds = useCallback(async (address) => {
    if (!isContractConfigured() || !address) return "0";
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(
        CARBON_CREDIT_ADDRESS,
        CarbonXMarketplaceABI,
        provider
      );
      const proceeds = await contract.pendingProceeds(address);
      return proceeds.toString();
    } catch {
      return "0";
    }
  }, []);

  return {
    account,
    chainId,
    isConnecting,
    chainOk,
    isCorrectNetwork: chainOk,
    isConfigured: isContractConfigured(),
    contractAddress: CARBON_CREDIT_ADDRESS,
    error,
    txState,
    lastTxHash,
    explorerTxUrl: getExplorerTxUrl(lastTxHash),
    connectWallet,
    switchNetwork,
    transferCredits,
    retireCredits,
    buyCredits,
    listCredits,
    withdrawProceeds,
    getBalance,
    getPendingProceeds,
    getContract,
    getReadOnlyContract,
  };
}
