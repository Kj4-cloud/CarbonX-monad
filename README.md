# CarbonX 🌍

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Blockchain: Monad Testnet](https://img.shields.io/badge/Blockchain-Monad_Testnet-8A2BE2.svg)](https://testnet.monadexplorer.com)
[![Framework: React 19](https://img.shields.io/badge/Framework-React_19-blue.svg)](https://react.dev/)
[![Build: Vite](https://img.shields.io/badge/Bundler-Vite_7-646CFF.svg)](https://vitejs.dev/)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E.svg)](https://supabase.com/)
[![Contracts: OpenZeppelin ERC--1155](https://img.shields.io/badge/Contracts-OpenZeppelin_ERC--1155-orange.svg)](https://www.openzeppelin.com/contracts)

**CarbonX** is a decentralized, transparent, and high-performance carbon credit verification and marketplace platform built on the **Monad Testnet**. It bridges the gap between regenerative agricultural land stewards (Farmers / Sellers) and environmentally conscious organizations and consumers (Buyers), providing tamper-proof issuance, MRV (Measurement, Reporting, and Verification), and permanent retirement of tokenized carbon offsets.

---

## 📑 Table of Contents

- [Vision & Key Features](#-vision--key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Smart Contract Specification](#-smart-contract-specification)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Step-by-Step Setup Instructions](#-step-by-step-setup-instructions)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Setup Supabase Database](#4-setup-supabase-database)
  - [5. Deploy Smart Contracts on Monad Testnet](#5-deploy-smart-contracts-on-monad-testnet)
  - [6. Start the Local Development Server](#6-start-the-local-development-server)
  - [7. Production Build & Preview](#7-production-build--preview)
- [External Code & Library Attribution](#-external-code--library-attribution)
- [License](#-license)

---

## 🌟 Vision & Key Features

Voluntary carbon markets often suffer from opaque verification chains, exorbitant intermediary broker margins, and double-counting risks. CarbonX eliminates these points of failure through smart contract escrow, decentralized on-chain retirement, satellite-assisted MRV, and real-time database tracking.

### 🚜 For Sellers (Farmers & Land Stewards)
- **Farmer Command Dashboard**: Real-time overview of active conservation parcels, verified carbon credit balances, cumulative sales revenue, and tier status.
- **Geospatial Parcel Mapping**: Interactive parcel polygon boundary delineation powered by Leaflet and Geoman.
- **Satellite MRV & NDVI Analysis**: Integrated Copernicus Sentinel-2 satellite pipeline calculating Normalized Difference Vegetation Index (NDVI) baseline values for vegetation health monitoring.
- **On-Site Inspection & Evidence**: Geotagged photo verification and inspector audit workflows.
- **Non-Custodial Escrow Listings & Pull-Payment Withdrawals**: Farmers list credits in native `MON`. Sales proceeds accumulate securely in smart contract escrow and are claimed directly via a reentrancy-safe pull-payment pattern.
- **Automated PDF Audit Reports**: Client-side generation of detailed project performance audits and certification dossiers.

### 🏢 For Buyers (Enterprises & Individuals)
- **Carbon Marketplace**: Explore curated, verified carbon offset projects categorized by methodology (Agroforestry, Soil Carbon, Reforestation).
- **Direct Settlement in Native MON**: Seamless credit purchases using Monad Testnet native currency with automated escrow execution.
- **Permanent On-Chain Retirement**: Token burn mechanism (`retireCredits`) removing tokens from circulation forever, preventing double-counting and providing verifiable offset claims.
- **Tamper-Proof Offset Certificates**: Instant generation of serialized, high-resolution Carbon Offset Certificates (PDF).
- **Live Blockchain Telemetry**: Direct integration with Monad block explorer and contract event listeners (`TransferSingle`, `CreditsRetired`, `CreditsPurchased`).

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite 7](https://vitejs.dev/) |
| **Routing** | [React Router DOM v7](https://reactrouter.com/) |
| **Styling & Design System** | [Tailwind CSS v4](https://tailwindcss.com/) with `@tailwindcss/vite`, CSS Variables, and Manrope Typography |
| **Blockchain Network** | **Monad Testnet** (EVM-compatible, 10,000 TPS, 1-second finality) |
| **Smart Contracts** | [Solidity ^0.8.20](https://soliditylang.org/) leveraging [OpenZeppelin Contracts v5](https://www.openzeppelin.com/contracts) (ERC-1155, ReentrancyGuard, Ownable) |
| **Web3 Provider & RPC** | [Ethers.js v6](https://docs.ethers.org/v6/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL 15 with Row Level Security and Auth triggers) |
| **Geospatial & Mapping** | [Leaflet](https://leafletjs.com/), [React Leaflet v5](https://react-leaflet.js.org/), and [@geoman-io/leaflet-geoman-free](https://geoman.io/) |
| **Satellite Imagery** | European Space Agency (ESA) Copernicus Sentinel-2 / Sentinel Hub API |
| **Document Generation** | [jsPDF](https://parall.ax/products/jspdf) and [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) |

---

## ⛓️ Smart Contract Specification

The smart contract is located at [`contracts/CarbonXMarketplace.sol`](contracts/CarbonXMarketplace.sol).

### Key Architectural Highlights:
1. **ERC-1155 Multi-Token Standard**: Each carbon project is represented as an independent token ID, allowing batch management and distinct methodology tracking.
2. **Independent Verification Protocol**: Satellite NDVI serves as auxiliary baseline data; credit issuance strictly requires authorized verification (`issueCredits`) to prevent fraudulent claims.
3. **Escrow Marketplace**: Sellers deposit tokens into the contract when creating listings (`listCredits`). Buyers purchase directly in native `MON` (`buyCredits`).
4. **Pull-Over-Push Payments**: Sales proceeds are credited to `pendingProceeds[seller]` and withdrawn via `withdrawProceeds()`, mitigating reentrancy and DoS transfer failures.
5. **Irreversible Retirement**: Calling `retireCredits()` permanently burns tokens via OpenZeppelin's `_burn()` and emits a `CreditsRetired` event with retirement reasoning.

### Monad Testnet Network Parameters:
- **Network Name**: Monad Testnet
- **RPC URL**: `https://testnet-rpc.monad.xyz`
- **Chain ID**: `10143` (`0x279f` in hex)
- **Currency Symbol**: `MON`
- **Block Explorer**: [https://testnet.monadexplorer.com](https://testnet.monadexplorer.com)

---

## 📁 Project Directory Structure

```text
carbonX--master/
├── contracts/                     # Solidity smart contracts
│   └── CarbonXMarketplace.sol     # ERC-1155 + Marketplace + Retirement contract
├── public/                        # Static public assets (images, icons, logos)
├── src/
│   ├── abi/                       # Contract ABI JSON artifacts
│   │   └── CarbonXMarketplace.json
│   ├── auth/                      # Supabase authentication screens & context
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   ├── blockchain/                # Monad blockchain integration layer
│   │   ├── config.js              # Centralized chain & contract addresses
│   │   ├── contract.js            # Ethers.js contract instance loaders
│   │   ├── useBlockchain.js       # React hook for wallet & transactions
│   │   ├── useBlockchainProof.js  # Live Monad event & block listener
│   │   └── walletUtils.js         # Network switching & formatting utilities
│   ├── Buyer/                     # Buyer portal & marketplace
│   │   ├── Marketplace/           # Project browsing & purchasing
│   │   ├── Wallet/                # Buyer credit balance & settlement
│   │   └── OffsetCertificate/     # PDF Certificate generation
│   ├── Seller/                    # Farmer portal & project management
│   │   ├── FarmerProfileDashboard/# Analytics, parcel summary, sales
│   │   ├── ProjectSubmission/     # GIS parcel drawing & NDVI telemetry
│   │   └── BlockchainExplorer/    # On-chain project transaction ledger
│   ├── components/                # Reusable UI components & modals
│   ├── context/                   # Global React state (Auth, Wallet, Theme)
│   ├── lib/                       # Supabase client initialization
│   ├── App.jsx                    # Application router
│   ├── index.css                  # Global design tokens and Tailwind v4 setup
│   └── main.jsx                   # React entry point
├── supabase_migration.sql         # Full PostgreSQL schema with RLS policies
├── fix_orders_rls.sql             # Database RLS policy patch script
├── MANUAL_DEPLOYMENT.md           # Step-by-step Remix IDE deployment guide
├── Progress.md                    # Architecture decisions and migration logs
├── package.json                   # Dependencies and scripts
├── vite.config.js                 # Vite bundler configuration
└── LICENSE                        # MIT Open Source License
```

---

## ⚙️ Prerequisites

Before getting started, make sure your development environment has:
- **Node.js**: `v18.x` or `v20.x` or later ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.x` or later (bundled with Node.js)
- **MetaMask Wallet**: Browser extension installed ([Download MetaMask](https://metamask.io/))
- **Supabase Account**: Free account at [supabase.com](https://supabase.com)
- **Testnet MON**: Acquired from the official Monad faucet for transaction gas

---

## 🚀 Step-by-Step Setup Instructions

### 1. Clone Repository

```bash
git clone https://github.com/<your-username>/carbonX-monad.git
cd carbonX-monad
```

### 2. Install Dependencies

Install all required frontend and Web3 packages:

```bash
npm install
```

### 3. Configure Environment Variables

Create a local `.env` file by copying the provided `.env.example`:

```bash
cp .env.example .env
```

Open `.env` in your editor and configure the following parameters:

```env
# ── Supabase Database & Auth ─────────────────────────────────────────────────
# Retrieve from: Supabase Dashboard → Project Settings → API
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# ── Monad Blockchain Integration (Testnet) ──────────────────────────────────
VITE_MONAD_CHAIN_ID=10143
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz/
VITE_MONAD_EXPLORER_URL=https://testnet.monadexplorer.com

# ── CarbonX Deployed Smart Contract Address ─────────────────────────────────
# Leave empty initially. Fill with deployed address from Step 5.
VITE_CARBONX_CONTRACT_ADDRESS=
```

### 4. Setup Supabase Database

1. Log into your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. In the left navigation, open the **SQL Editor**.
3. Open [`supabase_migration.sql`](supabase_migration.sql) from this repository, copy its contents, and run it in the SQL Editor. This initializes:
   - `farmer_profiles` & `buyer_profiles`
   - `land_parcels` & `farmer_projects`
   - `orders` & `order_items`
   - `wallets`, `transactions`, and `blockchain_transactions`
   - Row Level Security (RLS) policies and user creation triggers
4. *(Optional)* If modifying order permissions, execute [`fix_orders_rls.sql`](fix_orders_rls.sql) to apply the latest checkout RLS rules.

### 5. Deploy Smart Contracts on Monad Testnet

You can deploy the contract using **Remix IDE** or **Hardhat/Foundry**. Below is the Remix IDE workflow:

1. Open [https://remix.ethereum.org](https://remix.ethereum.org).
2. Create a file at `contracts/CarbonXMarketplace.sol` and paste the source from [`contracts/CarbonXMarketplace.sol`](contracts/CarbonXMarketplace.sol).
3. Under the **Solidity Compiler** tab:
   - Select compiler version `0.8.20`.
   - Ensure the EVM version is `default` or `paris`.
   - Click **Compile CarbonXMarketplace.sol**.
4. In MetaMask, ensure you are connected to **Monad Testnet** (Chain ID: `10143`).
5. Under the **Deploy & Run Transactions** tab:
   - Set Environment to `Injected Provider - MetaMask`.
   - Select contract `CarbonXMarketplace`.
   - Click **Deploy** and confirm the transaction in MetaMask.
6. Copy the deployed contract address and paste it into your `.env` file:
   ```env
   VITE_CARBONX_CONTRACT_ADDRESS=0xYourDeployedContractAddress
   ```

*(For detailed troubleshooting, refer to [`MANUAL_DEPLOYMENT.md`](MANUAL_DEPLOYMENT.md).)*

### 6. Start the Local Development Server

Run Vite's local development server:

```bash
npm run dev
```

Open your browser at `http://localhost:5173` (or the port displayed in your terminal).

### 7. Production Build & Preview

To validate the production bundle:

```bash
# Build optimized production bundle to /dist
npm run build

# Run local preview of the production build
npm run preview
```

---

## 📚 External Code & Library Attribution

CarbonX proudly incorporates and builds upon high quality open-source software and services. We gratefully acknowledge the authors and maintainers of the following technologies:

| Library / Tool | Author / Maintainer | License | Usage in CarbonX |
| :--- | :--- | :--- | :--- |
| **[React](https://react.dev/)** | Meta Open Source | [MIT](https://github.com/facebook/react/blob/main/LICENSE) | Reactive user interface and component architecture |
| **[Vite](https://vitejs.dev/)** | Evan You & Vite Team | [MIT](https://github.com/vitejs/vite/blob/main/LICENSE) | Fast ESM build tooling and local development server |
| **[React Router](https://reactrouter.com/)** | Remix Software / Shopify | [MIT](https://github.com/remix-run/react-router/blob/main/LICENSE.md) | Client-side routing, navigation, and layout guards |
| **[Tailwind CSS](https://tailwindcss.com/)** | Tailwind Labs | [MIT](https://github.com/tailwindlabs/tailwindcss/blob/master/LICENSE) | Utility-first responsive styling and theme tokens |
| **[Ethers.js](https://docs.ethers.org/)** | Richard Moore | [MIT](https://github.com/ethers-io/ethers.js/blob/main/LICENSE.md) | Web3 RPC interaction, wallet signing, and contract event hooks |
| **[OpenZeppelin Contracts](https://www.openzeppelin.com/)** | OpenZeppelin | [MIT](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/LICENSE) | Standard ERC-1155, ERC1155Holder, Ownable, and ReentrancyGuard modules |
| **[Supabase JS](https://supabase.com/)** | Supabase Inc. | [MIT](https://github.com/supabase/supabase-js/blob/master/LICENSE) | PostgreSQL client, role-based auth, and real-time database SDK |
| **[Leaflet](https://leafletjs.com/)** | Vladimir Agafonkin | [BSD-2-Clause](https://github.com/Leaflet/Leaflet/blob/main/LICENSE) | Core interactive mapping engine |
| **[React Leaflet](https://react-leaflet.js.org/)** | Paul Le Cam | [Hippocratic / MIT](https://github.com/PaulLeCam/react-leaflet/blob/master/LICENSE) | React abstractions for Leaflet maps |
| **[Leaflet-Geoman](https://geoman.io/)** | Geoman.io | [MIT](https://github.com/geoman-io/leaflet-geoman/blob/master/LICENSE) | Parcel boundary drawing, editing, and polygon GeoJSON serialization |
| **[Copernicus Sentinel-2](https://sentinels.copernicus.eu/)** | European Space Agency (ESA) / Sinergise | [Open Access](https://sentinels.copernicus.eu/web/sentinel/terms-conditions) | Earth observation satellite imagery used for NDVI vegetation baseline calculation |
| **[jsPDF](https://parall.ax/products/jspdf)** | Parallax & Contributors | [MIT](https://github.com/parallax/jsPDF/blob/master/LICENSE) | Client-side generation of Offset Certificates and Audit Reports |
| **[jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)** | Simon Bengtsson | [MIT](https://github.com/simonbengtsson/jsPDF-AutoTable/blob/master/LICENSE.txt) | Tabular formatting plugin for PDF transaction reports |
| **[Manrope Font](https://fonts.google.com/specimen/Manrope)** | Mikhail Sharanda | [OFL 1.1](https://scripts.sil.org/OFL) | Modern sans-serif typography |

---

## 📄 License

This project is licensed under the **MIT License** — see the full text in the [LICENSE](LICENSE) file.

```
MIT License

Copyright (c) 2026 CarbonX Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```
