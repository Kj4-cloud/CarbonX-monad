/**
 * Wallet utility functions for CarbonX on Monad Testnet.
 * Handles address generation, formatting, clipboard operations, and MetaMask integration.
 */
import { MONAD_TESTNET_CHAIN_ID, MONAD_NETWORK } from "./config";

/**
 * Generate a random Ethereum-style wallet address (0x + 40 hex chars).
 * This is a simulated address for the in-app wallet system.
 */
export function generateWalletAddress() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `0x${hex}`;
}

/**
 * Format a wallet address for display: 0x1a2b...9f0e
 */
export function formatAddress(address) {
  if (!address || address.length < 12) return address || "—";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    return true;
  }
}

/**
 * Request network switch to Monad Testnet (Chain ID 10143).
 */
export async function switchOrAddMonadNetwork() {
  if (!window.ethereum) return false;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MONAD_NETWORK.chainId }],
    });
    return true;
  } catch (err) {
    if (err.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [MONAD_NETWORK],
        });
        return true;
      } catch (addErr) {
        console.error("Failed to add Monad Testnet:", addErr);
        return false;
      }
    }
    return false;
  }
}

/**
 * Connect MetaMask and return the connected account address.
 * Automatically requests Monad Testnet switch.
 */
export async function connectMetaMask() {
  if (!window.ethereum) {
    return { address: null, error: "MetaMask is not installed" };
  }
  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    // Check chain
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainIdHex, 16) !== MONAD_TESTNET_CHAIN_ID) {
      await switchOrAddMonadNetwork();
    }

    return { address: accounts[0], error: null };
  } catch (err) {
    return { address: null, error: err.message };
  }
}

/**
 * Check if MetaMask is available in the current browser.
 */
export function isMetaMaskAvailable() {
  return typeof window !== "undefined" && !!window.ethereum;
}
