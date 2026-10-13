// src/blockchain/contract.js
import { ethers } from "ethers";
import CarbonXMarketplaceABI from "../abi/CarbonXMarketplace.json";
import { CARBON_CREDIT_ADDRESS, isContractConfigured, RPC_URL } from "./config";

/**
 * Get an ethers Contract instance connected to the user's signer.
 * @returns {Promise<ethers.Contract>}
 */
export async function getContract() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install a Web3 wallet.");
  }

  if (!isContractConfigured()) {
    throw new Error(
      "CarbonX contract is not yet configured. Please deploy via Remix on Monad Testnet and set VITE_CARBONX_CONTRACT_ADDRESS in your .env file."
    );
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  return new ethers.Contract(CARBON_CREDIT_ADDRESS, CarbonXMarketplaceABI, signer);
}

/**
 * Get a read-only ethers Contract instance connected to the Monad RPC provider.
 * @returns {ethers.Contract|null}
 */
export function getReadOnlyContract() {
  if (!isContractConfigured()) {
    return null;
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(CARBON_CREDIT_ADDRESS, CarbonXMarketplaceABI, provider);
}