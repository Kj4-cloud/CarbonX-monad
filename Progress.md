# CarbonX — Migration Progress & Developer Handover Log

## Purpose
This document logs all changes, architectural decisions, audit results, and testing verification for the **Polygon to Monad Testnet migration and smart contract integration** in CarbonX. Any incoming agent or developer should read this file first to understand what has been completed, why specific decisions were made, and how to operate or extend the system.

---

## Migration Summary
- **Source Chain**: Polygon PoS / Amoy Testnet (Chain ID 80002) — **Completely Removed**
- **Destination Chain**: **Monad Testnet** (Chain ID: `10143` / `0x279f`, Symbol: `MON`, Decimals: `18`)
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Block Explorer**: `https://testnet.monadexplorer.com`
- **Frontend Stack**: React 19, Vite 7, Tailwind CSS v4, Ethers.js v6, Supabase, Leaflet
- **Smart Contract**: `contracts/CarbonXMarketplace.sol` (ERC-1155 Multi-Token + Marketplace + Carbon Retirement + Pull-Payments)

---

## Detailed Phases & What Was Done

### Phase 1: Audit of Existing Codebase
- Identified all Polygon-specific code:
  - Chain IDs (`80002`), network RPCs (`polygon-amoy-bor-rpc.publicnode.com`), explorer URLs (`polygonscan.com`), and test contract addresses.
  - Components with Polygon text, links, and simulated network delays.
- Verified existing Web3 library: Ethers.js (`v6.16.0`) was already installed; reused it without adding redundant libraries.
- Preserved all GIS/mapping polygon geometries (`L.Polygon`, `drawPolygon` in `VegetationMap.jsx`), SVG `<polygon>` elements in `AuditReport.jsx`, Supabase auth, roles, and Sentinel Hub satellite NDVI workflows.

### Phase 2: Centralized Monad Network Configuration
- Created `src/blockchain/config.js` as the single source of truth for:
  - `MONAD_TESTNET_CHAIN_ID` (`10143`) & `MONAD_TESTNET_CHAIN_ID_HEX` (`0x279f`).
  - `MONAD_NETWORK` definition for `window.ethereum` (`wallet_addEthereumChain` / `wallet_switchEthereumChain`).
  - `isContractConfigured()` guard checking for valid, non-placeholder `0x` addresses.
  - Explorer link generators (`getExplorerTxUrl`, `getExplorerAddressUrl`).
  - Safety check: `IS_MAINNET_ENABLED = false`.

### Phase 3: Solidity Contract for Remix IDE
- Created `contracts/CarbonXMarketplace.sol`:
  - **Standard**: ERC-1155 Multi-Token (1 token ID = 1 Project) + `ERC1155Holder` for marketplace escrow.
  - **Security**: OpenZeppelin `ReentrancyGuard`, `Ownable(msg.sender)`, and custom `onlyVerifierOrOwner` modifier.
  - **Decoupled Verification**: Explicitly enforces that satellite NDVI analysis provides auxiliary monitoring, while credit issuance strictly requires authorized verifier confirmation (`issueCredits`).
  - **Marketplace**: Listing in native `MON` (`listCredits`), purchase in native `MON` (`buyCredits`), cancellation (`cancelListing`).
  - **Pull Payments**: Accumulated sales proceeds stored in `pendingProceeds` and claimed via `withdrawProceeds()` (prevents reentrancy/DoS).
  - **Permanent Retirement**: `retireCredits()` burns tokens (`_burn`) so they can never be resold or transferred.
- Generated matching ABI artifact: `src/abi/CarbonXMarketplace.json` (also synced to legacy paths `src/abi/carbonCreditsABI.json` and `src/blockchain/contracts/CarbonCreditERC1155.json`).

### Phase 4: Frontend & Smart Contract Integration
- **`src/blockchain/useBlockchain.js`**:
  - Reusable hook tracking `account`, `chainId`, `isCorrectNetwork`, `isConfigured`, `error`, `txState`.
  - Added user-friendly error translations for MetaMask rejection (code 4001), insufficient testnet MON funds, and unconfigured contract state.
  - Integrated `switchNetwork()`, `buyCredits()`, `listCredits()`, `retireCredits()`, `transferCredits()`, `withdrawProceeds()`, `getBalance()`.
- **`src/blockchain/contract.js`**:
  - `getContract()` returns signer-connected contract with deployment checks.
  - `getReadOnlyContract()` uses `JsonRpcProvider(RPC_URL)` for reading state without prompt.
- **`src/blockchain/useBlockchainProof.js`**:
  - Live event listener for `TransferSingle`, `CreditsRetired`, `CreditsPurchased`.
  - Polling Monad Testnet block height every 5 seconds.
- **`src/blockchain/walletUtils.js` & `src/blockchain/utils.js`**:
  - Automatic Monad Testnet switching on connection.
  - Utility helpers for formatting MON (`formatMon`), wei conversions (`parseMon`), and credits (`formatCredits`).
- **`src/components/ConnectWallet.jsx`**:
  - Displays Monad Testnet status badge (`MONAD`), short address, or prompts network switch when connected to the wrong chain.
- **`src/Buyer/CheckoutPage.jsx`**:
  - Changed processing animation to "Broadcasting to Monad Testnet…".
  - Prohibits fake randomized transaction hashes: requires real on-chain mint/purchase or displays clean setup error if contract address is unconfigured.
- **`src/components/BlockchainProof.jsx`, `RetireCredits.jsx`, `TransferCredits.jsx`, `MintCarbonCredits.js`**:
  - Replaced PolygonScan links and badges with Monad Explorer and Monad Testnet badges.
- **`src/Seller/BlockchainExplorer/` & `AuditReport.jsx` (Buyer & Seller)**:
  - Replaced network name with Monad Testnet and gas display with `MON`.
- **`src/i18n/en.js`, `src/i18n/hi.js`, `src/auth/`**:
  - Updated localization strings and trust indicators from Polygon to Monad.

### Phase 5: Environment & Secret Configuration
- Updated `.env.example`:
  ```env
  VITE_MONAD_CHAIN_ID=10143
  VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
  VITE_MONAD_EXPLORER_URL=https://testnet.monadexplorer.com
  VITE_CARBONX_CONTRACT_ADDRESS=
  ```
- Verified `.gitignore` ensures `.env` and `*.local` remain uncommitted.

### Phase 6: Automated Verification & Testing
- Created `scripts/verify-monad-integration.js` checking 44 assertions across network constants, ABI functions, Solidity security patterns, error parsers, and environment examples.
  - **Result**: `44 / 44 tests passed`.
- Ran `npm run build`: Production bundle succeeded with zero errors (`built in 8.31s`).

### Phase 7: Deployment Documentation
- Created `MANUAL_DEPLOYMENT.md` providing step-by-step instructions for:
  1. Adding Monad Testnet to MetaMask.
  2. Obtaining testnet MON from the faucet.
  3. Compiling and deploying `CarbonXMarketplace.sol` via Remix IDE.
  4. Updating `VITE_CARBONX_CONTRACT_ADDRESS` in `.env`.

---

## File Modification Index

| File Path | Action | Description |
| :--- | :--- | :--- |
| `contracts/CarbonXMarketplace.sol` | Created | Complete ERC-1155 marketplace & retirement Solidity contract for Remix |
| `src/abi/CarbonXMarketplace.json` | Created | Contract ABI artifact matching CarbonXMarketplace |
| `src/blockchain/config.js` | Updated | Centralized Monad Testnet parameters, RPC, explorer, and address guard |
| `src/blockchain/contract.js` | Updated | Ethers v6 contract getters with setup checks |
| `src/blockchain/useBlockchain.js` | Updated | Full Monad wallet hook, network switcher, and marketplace actions |
| `src/blockchain/useBlockchainProof.js` | Updated | Monad block poller and on-chain event listeners |
| `src/blockchain/mint.js` | Updated | Contract issueCredits execution with unconfigured protection |
| `src/blockchain/balance.js` | Updated | Read-only Monad credit balance query |
| `src/blockchain/wallet.js` | Updated | Connects wallet with auto-switch to Monad Testnet |
| `src/blockchain/walletUtils.js` | Updated | Added `switchOrAddMonadNetwork()` utility |
| `src/blockchain/utils.js` | Updated | MON formatting, credit calculations, explorer URL helpers |
| `src/blockchain/logTransaction.js` | Updated | Logs transactions as Monad Testnet in Supabase |
| `src/components/ConnectWallet.jsx` | Updated | Added Monad badge and Wrong Network switch button |
| `src/components/BlockchainProof.jsx` | Updated | Changed badge to Monad Testnet and updated explorer links |
| `src/components/RetireCredits.jsx` | Updated | Replaced PolygonScan link with Monad Explorer |
| `src/components/TransferCredits.jsx` | Updated | Replaced PolygonScan link with Monad Explorer |
| `src/components/MintCarbonCredits.js` | Updated | Added Monad Testnet minting and setup guidance |
| `src/Buyer/CheckoutPage.jsx` | Updated | Monad network broadcast, disabled fake tx hashes |
| `src/Seller/BlockchainExplorer/BlockchainExplorer.jsx` | Updated | Changed network to Monad Testnet, currency to MON |
| `src/Seller/AuditReport.jsx` | Updated | Changed network to Monad Testnet, explorer to Monad Explorer |
| `src/Buyer/AuditReport.jsx` | Updated | Changed network to Monad Testnet, explorer to Monad Explorer |
| `src/auth/WelcomeLoginSelection.jsx` | Updated | Trust badge updated to Monad Chain |
| `src/auth/UnifiedLoginScreen.jsx` | Updated | Secured badge updated to Monad |
| `src/i18n/en.js` & `src/i18n/hi.js` | Updated | English & Hindi strings updated from Polygon to Monad |
| `supabase_migration.sql` | Updated | Updated default transaction network to Monad Testnet |
| `.env.example` | Updated | Added Monad Testnet placeholders |
| `README.md` | Updated | Documented Monad Testnet and smart contract architecture |
| `MANUAL_DEPLOYMENT.md` | Created | Complete guide for human deployment via Remix IDE |
| `scripts/verify-monad-integration.js` | Created | Test script for automated integration verification |
| `Progress.md` | Created | This persistent log for ongoing tracking and agent handovers |

---

## Deployed Contract Verification (Monad Testnet)
- **Contract Address**: `0x4032f564e2783914b8d297A8f850634411fb95eD`
- **Compiler-Generated ABI**: Pasted into `src/abi/CarbonXMarketplace.json` and mirrored to `src/abi/carbonCreditsABI.json` & `src/blockchain/contracts/CarbonCreditERC1155.json`.
- **Live RPC Bytecode Check**: Verified on `https://testnet-rpc.monad.xyz` (Bytecode size: 40,684 bytes).
- **Verified Read Methods**:
  - `owner()` returns deployer: `0x85C895e09888a29E650a1b67D1787c4E99E54faD`
  - `isVerifier(owner)` returns `true`
  - `getProjectCount()` returns `0`
  - `getListingCount()` returns `0`

## Remaining Developer Testing Action
- The read methods are verified live on-chain.
- The remaining manual step is to perform live **write transactions** in the UI (connecting MetaMask with testnet `MON`, registering a project, issuing credits, and executing a test purchase/retirement) to confirm wallet transaction signatures end-to-end.
