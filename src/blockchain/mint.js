// src/blockchain/mint.js
import { getContract } from "./contract";
import { isContractConfigured } from "./config";

/**
 * Check whether a project is registered on-chain.
 * @param {ethers.Contract} contract
 * @param {number} projectId
 * @returns {Promise<boolean>}
 */
async function isProjectRegistered(contract, projectId) {
  try {
    // projects(uint256) returns the Project struct; the last field is `isRegistered`
    const project = await contract.projects(projectId);
    return Boolean(project.isRegistered);
  } catch {
    return false;
  }
}

/**
 * Register a new carbon project on-chain if it does not already exist.
 * Only the connected wallet (signer) can call this — the wallet becomes the farmer.
 *
 * @param {string} [metadataURI] - Metadata URI for the project
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function registerProject(
  metadataURI = "https://carbonx.app/project/metadata"
) {
  if (!isContractConfigured()) {
    throw new Error(
      "CarbonX contract not configured. Set VITE_CARBONX_CONTRACT_ADDRESS."
    );
  }
  const contract = await getContract();
  const tx = await contract.registerProject(metadataURI);
  await tx.wait();
  return tx;
}

/**
 * Issue or mint verified carbon credits for an address.
 * Automatically registers the project on-chain if it has not been registered yet.
 *
 * @param {string} address - Recipient address (farmer or buyer)
 * @param {number|bigint} amount - Amount of carbon credits (tonnes CO2e)
 * @param {number} [projectId=1] - Project ID (default 1)
 * @returns {Promise<ethers.TransactionResponse>}
 */
export async function mintCredits(
  address,
  amount,
  projectId = 1,
  onStatusChange = null,
) {
  if (!isContractConfigured()) {
    throw new Error(
      "CarbonX smart contract has not been deployed on Monad Testnet yet. Deploy contracts/CarbonXMarketplace.sol and configure VITE_CARBONX_CONTRACT_ADDRESS."
    );
  }

  const contract = await getContract();
  if (!contract) {
    throw new Error("Unable to obtain contract signer. Please connect MetaMask.");
  }

  // ── Auto-register the project if it doesn't exist on-chain yet ──
  const registered = await isProjectRegistered(contract, projectId);
  if (!registered) {
    if (onStatusChange) onStatusChange("registering");
    console.log(
      `CarbonX: Project #${projectId} not registered on-chain. Registering now…`
    );
    const regTx = await contract.registerProject(
      `https://carbonx.app/project/${projectId}/metadata`
    );
    if (onStatusChange) onStatusChange("waiting_registration", regTx.hash);
    await regTx.wait();
    console.log(
      `CarbonX: Project #${projectId} registered on-chain (tx: ${regTx.hash})`
    );
  }

  // ── Issue credits ──
  if (onStatusChange) onStatusChange("awaiting_signature");
  let tx;
  if (typeof contract.issueCredits === "function") {
    tx = await contract.issueCredits(
      projectId,
      address,
      amount,
      "CarbonX Verification Proof — Monad Testnet"
    );
  } else if (typeof contract.mint === "function") {
    tx = await contract.mint(address, amount);
  } else {
    throw new Error("No credit minting method found on the configured contract.");
  }

  if (onStatusChange) onStatusChange("mining_block", tx.hash);
  const receipt = await tx.wait();
  // Attach block number from the mined receipt so callers can log it
  tx.blockNumber = receipt.blockNumber;
  if (onStatusChange) onStatusChange("confirmed", receipt);
  return tx;
}