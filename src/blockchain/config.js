// src/blockchain/config.js

/**
 * Centralized Monad Blockchain Configuration for CarbonX.
 *
 * Configured for Monad Testnet:
 * - Chain ID: 10143 (0x279f)
 * - Native Currency: MON (18 decimals)
 * - RPC URL: https://testnet-rpc.monad.xyz
 * - Block Explorer: https://testnet.monadexplorer.com
 */

// ── Network Definitions ──────────────────────────────────────────
export const MONAD_TESTNET_CHAIN_ID = 10143;
export const MONAD_TESTNET_CHAIN_ID_HEX = "0x" + Number(10143).toString(16); // 0x279f

export const RPC_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_MONAD_RPC_URL) ||
  "https://testnet-rpc.monad.xyz";

export const EXPLORER_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_MONAD_EXPLORER_URL) ||
  "https://testnet.monadexplorer.com";

export const BLOCK_EXPLORER = `${EXPLORER_BASE_URL}/tx/`;

// ── Contract Address ─────────────────────────────────────────────
// Set via VITE_CARBONX_CONTRACT_ADDRESS in .env / .env.local
// Left empty until the contract is deployed via Remix on Monad Testnet.
export const CARBON_CREDIT_ADDRESS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_CARBONX_CONTRACT_ADDRESS) ||
  "";

/**
 * Check if the contract is configured with a valid 0x Ethereum address.
 */
export function isContractConfigured() {
  return Boolean(
    CARBON_CREDIT_ADDRESS &&
      CARBON_CREDIT_ADDRESS.startsWith("0x") &&
      CARBON_CREDIT_ADDRESS.length === 42 &&
      CARBON_CREDIT_ADDRESS !== "0xYOUR_DEPLOYED_CONTRACT_ADDRESS"
  );
}

// ── Safety Guard: Mainnet disabled until testnet audit is verified ──
export const IS_MAINNET_ENABLED = false;

// ── Monad Testnet Object for window.ethereum ─────────────────────
export const MONAD_NETWORK = {
  chainId: MONAD_TESTNET_CHAIN_ID_HEX,
  chainName: "Monad Testnet",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: [RPC_URL],
  blockExplorerUrls: [EXPLORER_BASE_URL],
};

// ── Standard Credit Types Mapping ────────────────────────────────
export const CREDIT_TYPES = {
  SOLAR_2023: 1,
  WIND_2023: 2,
  FOREST_2023: 3,
  SOLAR_2024: 4,
  WIND_2024: 5,
};

// ── Explorer URL Helpers ─────────────────────────────────────────
export function getExplorerTxUrl(txHash) {
  if (!txHash) return "";
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

export function getExplorerAddressUrl(address) {
  if (!address) return "";
  return `${EXPLORER_BASE_URL}/address/${address}`;
}
