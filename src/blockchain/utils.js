// src/blockchain/utils.js
import { ethers } from "ethers";
import { EXPLORER_BASE_URL, MONAD_TESTNET_CHAIN_ID } from "./config";

/**
 * Format a native MON wei value into human-readable MON string.
 * @param {bigint|string|number} weiValue
 * @param {number} [decimals=4]
 * @returns {string}
 */
export function formatMon(weiValue, decimals = 4) {
  if (!weiValue) return "0.0000 MON";
  try {
    const formatted = ethers.formatEther(weiValue);
    const num = parseFloat(formatted);
    return `${num.toFixed(decimals)} MON`;
  } catch {
    return "0.0000 MON";
  }
}

/**
 * Parse a human-readable MON amount string into wei BigInt.
 * @param {string|number} monAmount
 * @returns {bigint}
 */
export function parseMon(monAmount) {
  if (!monAmount) return 0n;
  try {
    return ethers.parseEther(String(monAmount));
  } catch {
    return 0n;
  }
}

/**
 * Format credit quantities.
 * @param {number|string} credits
 * @returns {string}
 */
export function formatCredits(credits) {
  const num = Number(credits) || 0;
  return `${num.toLocaleString("en-US")} tCO₂e`;
}

/**
 * Get Monad Explorer link for a transaction hash.
 * @param {string} txHash
 * @returns {string}
 */
export function getMonadTxUrl(txHash) {
  if (!txHash) return "";
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

/**
 * Get Monad Explorer link for an address.
 * @param {string} address
 * @returns {string}
 */
export function getMonadAddressUrl(address) {
  if (!address) return "";
  return `${EXPLORER_BASE_URL}/address/${address}`;
}

/**
 * Validate whether a given chain ID is Monad Testnet.
 * @param {number|string} chainId
 * @returns {boolean}
 */
export function isMonadTestnet(chainId) {
  return Number(chainId) === MONAD_TESTNET_CHAIN_ID;
}
