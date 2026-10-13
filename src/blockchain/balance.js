// src/blockchain/balance.js
import { getContract, getReadOnlyContract } from "./contract";
import { isContractConfigured } from "./config";

/**
 * Get on-chain carbon credit balance for a user address.
 *
 * @param {string} userAddress - Wallet address to query
 * @param {number} [tokenId=1] - ERC-1155 Token ID (default 1)
 * @returns {Promise<string>}
 */
export async function getCreditBalance(userAddress, tokenId = 1) {
  if (!isContractConfigured() || !userAddress) {
    return "0";
  }

  try {
    const readContract = getReadOnlyContract();
    if (readContract) {
      const balance = await readContract.balanceOf(userAddress, tokenId);
      return balance.toString();
    }

    const contract = await getContract();
    if (contract) {
      const balance = await contract.balanceOf(userAddress, tokenId);
      return balance.toString();
    }
  } catch (err) {
    console.warn("Could not fetch on-chain credit balance:", err.message);
  }

  return "0";
}