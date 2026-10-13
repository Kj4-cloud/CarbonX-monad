# CarbonX — Monad Testnet Manual Deployment Guide

This guide provides end-to-end instructions for deploying the **CarbonXMarketplace** smart contract onto **Monad Testnet** using **Remix IDE** and **MetaMask**, followed by configuring your CarbonX frontend.

---

## 🌐 1. Monad Testnet Network Parameters

Ensure your MetaMask wallet has the Monad Testnet configured with the following official settings:

| Parameter | Value |
| :--- | :--- |
| **Network Name** | Monad Testnet |
| **New RPC URL** | `https://testnet-rpc.monad.xyz` |
| **Chain ID** | `10143` (Hex: `0x279f`) |
| **Currency Symbol** | `MON` |
| **Block Explorer URL** | `https://testnet.monadexplorer.com` |

> **Tip**: Connecting your wallet inside the CarbonX web application will automatically prompt MetaMask to add and switch to Monad Testnet if it is not already present.

---

## 🚰 2. Acquire Testnet MON

Deployment and transaction gas fees require native testnet `MON`. 
- Visit the official Monad Testnet faucet or Discord faucet bot to request testnet `MON` to your wallet address.
- Verify your balance displays `MON` on Monad Testnet in MetaMask before attempting deployment.

---

## 🛠️ 3. Deploying via Remix IDE

Follow these exact steps to compile and deploy `CarbonXMarketplace.sol`:

### Step 3.1: Open Remix IDE
1. Open your browser and navigate to [https://remix.ethereum.org](https://remix.ethereum.org).
2. In the **File Explorer** pane on the left, create a new file under `contracts/`:
   ```
   contracts/CarbonXMarketplace.sol
   ```
3. Copy the entire source code from `contracts/CarbonXMarketplace.sol` in this repository and paste it into the Remix editor.

### Step 3.2: Compile the Contract
1. Click the **Solidity Compiler** tab in Remix (the `S` icon on the left rail).
2. Select compiler version: **`0.8.20`** (or newer `0.8.2x`).
3. Under **Advanced Configurations**:
   - Ensure EVM Version is set to **default** or **paris/shanghai**.
   - Optional: Enable Optimization (200 runs).
4. Click **Compile contracts/CarbonXMarketplace.sol**.
5. Ensure a green checkmark appears on the compiler tab with no compilation errors.

### Step 3.3: Injected Provider Deployment
1. Click the **Deploy & Run Transactions** tab (Ethereum icon with arrow).
2. In the **ENVIRONMENT** dropdown, choose:
   ```
   Injected Provider - MetaMask
   ```
3. MetaMask will prompt you to connect. Approve the connection.
4. Verify that underneath the Environment dropdown it shows:
   ```
   Custom (10143) network
   ```
5. In the **CONTRACT** dropdown, select:
   ```
   CarbonXMarketplace - contracts/CarbonXMarketplace.sol
   ```
6. Click the orange **Deploy** button.
7. Confirm the transaction in MetaMask.
8. Wait for the transaction receipt in Remix's terminal console.

---

## 📋 4. Updating the Frontend Configuration

Once the deployment transaction confirms:

### Step 4.1: Copy Contract Address
1. In Remix, locate your contract under **Deployed Contracts** at the bottom of the left pane.
2. Click the copy icon next to `CarbonXMarketplace at 0x...`.

### Step 4.2: Update `.env` File
Open or create `.env` in the root of your CarbonX repository:
```env
VITE_MONAD_CHAIN_ID=10143
VITE_MONAD_RPC_URL=https://testnet-rpc.monad.xyz
VITE_MONAD_EXPLORER_URL=https://testnet.monadexplorer.com
VITE_CARBONX_CONTRACT_ADDRESS=0xYourDeployedContractAddressHere
```
Replace `0xYourDeployedContractAddressHere` with your actual address copied from Remix.

### Step 4.3: (Optional) Update ABI
The repository already contains the matching ABI at `src/abi/CarbonXMarketplace.json`. If you made any custom contract modifications in Remix:
1. In Remix's **Solidity Compiler** tab, click **ABI** at the very bottom of the compilation panel to copy the ABI JSON.
2. Paste it into `src/abi/CarbonXMarketplace.json`.

---

## ⚡ 5. Post-Deployment Verification & Testing

1. **Verify on Explorer**:
   Navigate to `https://testnet.monadexplorer.com/address/<YOUR_CONTRACT_ADDRESS>` to see your newly created contract and transaction history.
2. **Restart Dev Server**:
   ```bash
   npm run dev
   ```
3. **Connect in App**:
   - Open CarbonX in your browser (`http://localhost:5173`).
   - Click **Connect Monad** in the header.
   - Verify the green `MONAD` badge and your short address appear.
4. **Test Buyer / Farmer Flows**:
   - Farmers can register projects and mint/list verified credits.
   - Buyers can purchase credits in native `MON` or retire tokens permanently.
   - Retired tokens will immediately reflect in the Blockchain Proof page with Monad Explorer verification links.

---

## 🔒 Security Best Practices
- **Never commit `.env` or `.env.local`** containing private keys or API secrets.
- The contract uses pull-over-push withdrawals (`withdrawProceeds`) to prevent reentrancy attacks.
- Only the contract owner or authorized verifiers (`setVerifier`) can mint verified credits (`issueCredits`).
