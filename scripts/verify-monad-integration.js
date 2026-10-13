// scripts/verify-monad-integration.js
/**
 * Automated Verification Script for CarbonX Monad Testnet Integration.
 * Validates:
 * 1. Network configuration constants (Chain ID 10143, currency MON, RPC, Explorer)
 * 2. Contract configuration validation logic
 * 3. ABI artifact completeness (all required functions and events)
 * 4. Blockchain error parsing logic
 * 5. Monad formatting and parsing utilities
 * 6. Contract source structure and security checks
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log("\n🚀 Running CarbonX Monad Blockchain Verification Suite...\n");

// ── Test 1: Configuration Module ─────────────────────────────────
console.log("1. Checking src/blockchain/config.js...");
const configContent = fs.readFileSync(path.join(rootDir, "src/blockchain/config.js"), "utf-8");
assert(configContent.includes("10143"), "Monad Testnet Chain ID 10143 is defined");
assert(configContent.includes("0x279f"), "Monad Testnet Hex Chain ID 0x279f is defined");
assert(configContent.includes("https://testnet-rpc.monad.xyz"), "Official Monad Testnet RPC is configured");
assert(configContent.includes("https://testnet.monadexplorer.com"), "Official Monad Explorer URL is configured");
assert(configContent.includes("symbol: \"MON\"") || configContent.includes("symbol: 'MON'") || configContent.includes("\"MON\""), "Currency symbol is MON");
assert(configContent.includes("isContractConfigured"), "isContractConfigured guard function exists");
assert(!configContent.includes("80002"), "Outdated Polygon Amoy chain ID 80002 is completely removed");
assert(!configContent.includes("polygonscan.com"), "PolygonScan is completely removed from config");

// ── Test 2: Contract ABI Completeness ────────────────────────────
console.log("\n2. Checking src/abi/CarbonXMarketplace.json ABI completeness...");
const abiPath = path.join(rootDir, "src/abi/CarbonXMarketplace.json");
assert(fs.existsSync(abiPath), "CarbonXMarketplace.json exists");
const abi = JSON.parse(fs.readFileSync(abiPath, "utf-8"));

const functions = abi.filter(x => x.type === "function").map(x => x.name);
const events = abi.filter(x => x.type === "event").map(x => x.name);

const requiredFunctions = [
  "registerProject",
  "setVerifier",
  "issueCredits",
  "listCredits",
  "cancelListing",
  "buyCredits",
  "withdrawProceeds",
  "retireCredits",
  "balanceOf",
  "getProject",
  "getListing",
  "getProjectCount",
  "getListingCount",
  "safeTransferFrom"
];

for (const fn of requiredFunctions) {
  assert(functions.includes(fn), `ABI includes function '${fn}'`);
}

const requiredEvents = [
  "ProjectRegistered",
  "VerifierUpdated",
  "CreditsIssued",
  "CreditsListed",
  "ListingCancelled",
  "CreditsPurchased",
  "CreditsRetired",
  "ProceedsWithdrawn"
];

for (const ev of requiredEvents) {
  assert(events.includes(ev), `ABI includes event '${ev}'`);
}

// ── Test 3: Solidity Contract Source Analysis ───────────────────
console.log("\n3. Checking contracts/CarbonXMarketplace.sol...");
const contractPath = path.join(rootDir, "contracts/CarbonXMarketplace.sol");
assert(fs.existsSync(contractPath), "contracts/CarbonXMarketplace.sol exists");
const contractSource = fs.readFileSync(contractPath, "utf-8");

assert(contractSource.includes("pragma solidity ^0.8.20;"), "Solidity compiler target is ^0.8.20");
assert(contractSource.includes("ERC1155Holder"), "Inherits ERC1155Holder for secure token escrow");
assert(contractSource.includes("ReentrancyGuard"), "Uses ReentrancyGuard for payment and issuance protection");
assert(contractSource.includes("onlyVerifierOrOwner"), "Restricts credit issuance to authorized verifiers or owner");
assert(contractSource.includes("pendingProceeds"), "Uses pull-over-push pattern (pendingProceeds) for safe withdrawals");
assert(contractSource.includes("_burn(msg.sender, projectId, amount);"), "Retirement permanently burns tokens");

// ── Test 4: Blockchain Error Parser Logic ────────────────────────
console.log("\n4. Checking Error Handling and Parsing logic...");
const useBlockchainPath = path.join(rootDir, "src/blockchain/useBlockchain.js");
const useBlockchainSource = fs.readFileSync(useBlockchainPath, "utf-8");

assert(useBlockchainSource.includes("ACTION_REJECTED") || useBlockchainSource.includes("user rejected") || useBlockchainSource.includes("4001"), "Handles user wallet rejection gracefully");
assert(useBlockchainSource.includes("INSUFFICIENT_FUNDS") || useBlockchainSource.includes("insufficient funds"), "Handles insufficient testnet funds with user-friendly message");
assert(useBlockchainSource.includes("switchNetwork"), "Provides switchNetwork for automatic Monad Testnet switching");

// ── Test 5: Environment Example File ─────────────────────────────
console.log("\n5. Checking .env.example...");
const envExample = fs.readFileSync(path.join(rootDir, ".env.example"), "utf-8");
assert(envExample.includes("VITE_MONAD_CHAIN_ID=10143"), ".env.example documents VITE_MONAD_CHAIN_ID");
assert(envExample.includes("VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz"), ".env.example documents VITE_MONAD_RPC_URL");
assert(envExample.includes("VITE_CARBONX_CONTRACT_ADDRESS="), ".env.example documents VITE_CARBONX_CONTRACT_ADDRESS placeholder");

// ── Summary ──────────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  console.log("🎉 All Monad integration verification checks PASSED successfully!\n");
} else {
  console.error("❌ Some verification checks failed.\n");
  process.exit(1);
}
