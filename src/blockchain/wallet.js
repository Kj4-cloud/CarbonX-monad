// src/blockchain/wallet.js
import { MONAD_TESTNET_CHAIN_ID, MONAD_NETWORK } from "./config";

/**
 * Connect MetaMask wallet and ensure user is on Monad Testnet.
 * @returns {Promise<string|null>} The connected 0x wallet address or null.
 */
export async function connectWallet() {
  if (!window.ethereum) {
    window.open("https://metamask.io/download/", "_blank");
    alert("Please install MetaMask to interact with Monad Testnet.");
    return null;
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const activeAccount = accounts[0];

    // Check chain ID
    const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    const currentChainId = parseInt(chainIdHex, 16);

    if (currentChainId !== MONAD_TESTNET_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: MONAD_NETWORK.chainId }],
        });
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [MONAD_NETWORK],
          });
        } else {
          console.warn("Failed to switch to Monad Testnet:", switchErr);
        }
      }
    }

    return activeAccount;
  } catch (err) {
    console.error("Wallet connection failed:", err);
    return null;
  }
}