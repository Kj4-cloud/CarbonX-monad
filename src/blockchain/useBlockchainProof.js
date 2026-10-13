// src/blockchain/useBlockchainProof.js
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { supabase } from "../lib/supabase";
import CarbonXMarketplaceABI from "../abi/CarbonXMarketplace.json";
import {
  CARBON_CREDIT_ADDRESS,
  RPC_URL,
  isContractConfigured,
  MONAD_TESTNET_CHAIN_ID,
  MONAD_NETWORK,
} from "./config";

export function useBlockchainProof() {
  const [latestBlock, setLatestBlock] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [account, setAccount] = useState(null);
  const [networkOk, setNetworkOk] = useState(false);

  // ── Fetch existing txns from Supabase ────────────────────
  const fetchTransactions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) {
        setTransactions(data);
        setTotalCount(data.length);
        setConfirmedCount(data.filter((t) => t.status === "confirmed").length);
      }
    } catch {
      // Supabase table may not exist yet in fresh clone
    }
  }, []);

  // ── Poll Monad latest block every 5 seconds ──────────────
  useEffect(() => {
    let mounted = true;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const poll = async () => {
      try {
        const n = await provider.getBlockNumber();
        if (mounted) {
          setLatestBlock(n.toLocaleString());
        }
      } catch (e) {
        // RPC might be throttled or offline
      }
    };
    poll();
    const iv = setInterval(poll, 5000);
    return () => {
      mounted = false;
      clearInterval(iv);
    };
  }, []);

  // ── Listen to on-chain events live (if contract is deployed) ──
  useEffect(() => {
    if (!isContractConfigured()) {
      setIsListening(false);
      return;
    }

    let contract;
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      contract = new ethers.Contract(
        CARBON_CREDIT_ADDRESS,
        CarbonXMarketplaceABI,
        provider
      );
      setIsListening(true);

      const handle = (type) => async (...args) => {
        const event = args[args.length - 1];
        const newTx = {
          tx_hash: event.log?.transactionHash || "0x",
          tx_type: type,
          status: "confirmed",
          network: "Monad Testnet",
          block_number: event.log?.blockNumber,
          created_at: new Date().toISOString(),
          ...(type === "transfer" && {
            from_addr: args[1],
            to_addr: args[2],
            token_id: Number(args[3]),
            amount: Number(args[4]),
            credit_name: `Project #${Number(args[3])} Credits`,
          }),
          ...(type === "mint" && {
            token_id: Number(args[0]),
            to_addr: args[1],
            amount: Number(args[2]),
            credit_name: `Project #${Number(args[0])} Credits`,
          }),
          ...(type === "retire" && {
            token_id: Number(args[0]),
            from_addr: args[1],
            amount: Number(args[2]),
            credit_name: `Project #${Number(args[0])} Credits`,
          }),
          ...(type === "purchase" && {
            token_id: Number(args[1]),
            to_addr: args[2],
            amount: Number(args[4]),
            credit_name: `Project #${Number(args[1])} Credits`,
          }),
        };

        try {
          await supabase.from("transactions").upsert([newTx], { onConflict: "tx_hash" });
        } catch {}

        setTransactions((p) => [newTx, ...p.filter((t) => t.tx_hash !== newTx.tx_hash)]);
        setTotalCount((p) => p + 1);
        setConfirmedCount((p) => p + 1);
      };

      contract.on("TransferSingle", handle("transfer"));
      contract.on("CreditsIssued", handle("mint"));
      contract.on("CreditsRetired", handle("retire"));
      contract.on("CreditsPurchased", handle("purchase"));
    } catch {
      setIsListening(false);
    }

    return () => {
      if (contract) {
        contract.removeAllListeners();
      }
      setIsListening(false);
    };
  }, []);

  // ── Supabase real-time — sync across all browser tabs ────
  useEffect(() => {
    fetchTransactions();
    try {
      const ch = supabase
        .channel("tx-realtime")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "transactions" },
          (payload) => {
            setTransactions((p) => {
              if (p.find((t) => t.tx_hash === payload.new.tx_hash)) return p;
              return [payload.new, ...p];
            });
            setTotalCount((p) => p + 1);
            if (payload.new.status === "confirmed") setConfirmedCount((p) => p + 1);
          }
        )
        .subscribe();
      return () => supabase.removeChannel(ch);
    } catch {}
  }, [fetchTransactions]);

  // ── MetaMask account & network detection ──────────────────
  useEffect(() => {
    if (!window.ethereum) return;
    const checkNetwork = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const net = await provider.getNetwork();
        setNetworkOk(Number(net.chainId) === MONAD_TESTNET_CHAIN_ID);
      } catch {
        setNetworkOk(false);
      }
    };

    window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
      if (accs && accs[0]) {
        setAccount(accs[0]);
        checkNetwork();
      }
    });

    const onAccs = (accs) => setAccount(accs[0] || null);
    const onChain = () => checkNetwork();

    window.ethereum.on("accountsChanged", onAccs);
    window.ethereum.on("chainChanged", onChain);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccs);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accs[0]);

    // Check chain and switch if needed
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const net = await provider.getNetwork();
      if (Number(net.chainId) !== MONAD_TESTNET_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: MONAD_NETWORK.chainId }],
          });
          setNetworkOk(true);
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [MONAD_NETWORK],
            });
            setNetworkOk(true);
          }
        }
      } else {
        setNetworkOk(true);
      }
    } catch {}
  };

  return {
    latestBlock,
    transactions,
    totalCount,
    confirmedCount,
    isListening,
    account,
    networkOk,
    connectMetaMask,
    fetchTransactions,
  };
}
