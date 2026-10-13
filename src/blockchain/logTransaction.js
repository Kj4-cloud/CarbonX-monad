// src/blockchain/logTransaction.js
import { supabase } from "../lib/supabase";
import { BLOCK_EXPLORER, CREDIT_TYPES } from "./config";

export const logTransaction = async ({
  txHash,
  fromAddr,
  toAddr = null,
  tokenId,
  amount,
  txType,
  blockNumber = null,
}) => {
  const creditName =
    Object.keys(CREDIT_TYPES).find((k) => CREDIT_TYPES[k] === tokenId) ||
    `Project #${tokenId} Credits`;

  const { error } = await supabase.from("transactions").insert([
    {
      tx_hash: txHash,
      from_addr: fromAddr,
      to_addr: toAddr,
      token_id: tokenId,
      amount: amount,
      tx_type: txType,
      credit_name: creditName,
      status: "confirmed",
      network: "Monad Testnet",
      block_number: blockNumber,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("Supabase log error:", error);
  } else {
    console.log(`Logged on Monad Testnet: ${BLOCK_EXPLORER}${txHash}`);
  }
};
