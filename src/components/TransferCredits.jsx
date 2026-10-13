// src/components/TransferCredits.jsx
import { useState } from "react";
import { useBlockchain } from "../blockchain/useBlockchain";
import { logTransaction } from "../blockchain/logTransaction";
import { CREDIT_TYPES, BLOCK_EXPLORER } from "../blockchain/config";

export default function TransferCredits() {
  const { account, connectWallet, transferCredits } = useBlockchain();
  const [to, setTo]         = useState("");
  const [tokenId, setToken] = useState(1);
  const [amount, setAmount] = useState(1);
  const [loading, setLoad]  = useState(false);
  const [txHash, setHash]   = useState(null);
  const [err, setErr]       = useState(null);

  const handle = async () => {
    if (!account) { await connectWallet(); return; }
    setLoad(true); setErr(null);
    try {
      const res = await transferCredits(to, tokenId, amount);
      if (res) {
        setHash(res.txHash);
        await logTransaction({
          txHash: res.txHash, fromAddr: account, toAddr: to,
          tokenId, amount, txType: 'transfer',
          blockNumber: res.receipt?.blockNumber,
        });
      }
    } catch (e) { setErr(e.message); }
    setLoad(false);
  };

  return (
    <div style={{ maxWidth:480, padding:24, background:'#fff',
      borderRadius:12, border:'1px solid #E0E0E0' }}>
      <h3 style={{ margin:'0 0 16px', color:'#1A7A4A' }}>
        Transfer Carbon Credits
      </h3>

      <label style={{ display:'block', marginBottom:12 }}>
        <span style={{ fontSize:13, color:'#666' }}>Credit Type</span>
        <select value={tokenId} onChange={e=>setToken(Number(e.target.value))}
          style={{ display:'block', width:'100%', padding:8, marginTop:4,
            borderRadius:6, border:'1px solid #CCC' }}>
          {Object.entries(CREDIT_TYPES).map(([name,id])=>(
            <option key={id} value={id}>{name.replace(/_/g,' ')}</option>
          ))}
        </select>
      </label>

      <label style={{ display:'block', marginBottom:12 }}>
        <span style={{ fontSize:13, color:'#666' }}>Recipient Address</span>
        <input value={to} onChange={e=>setTo(e.target.value)}
          placeholder='0x...'
          style={{ display:'block', width:'100%', padding:8, marginTop:4,
            borderRadius:6, border:'1px solid #CCC', boxSizing:'border-box' }}/>
      </label>

      <label style={{ display:'block', marginBottom:16 }}>
        <span style={{ fontSize:13, color:'#666' }}>Amount</span>
        <input type='number' min='1' value={amount}
          onChange={e=>setAmount(Number(e.target.value))}
          style={{ display:'block', width:'100%', padding:8, marginTop:4,
            borderRadius:6, border:'1px solid #CCC', boxSizing:'border-box' }}/>
      </label>

      <button onClick={handle} disabled={loading}
        style={{ width:'100%', padding:10, background:'#1A7A4A',
          color:'#fff', border:'none', borderRadius:8, cursor:'pointer',
          fontWeight:600, fontSize:14 }}>
        {loading ? 'Processing...' : 'Transfer Credits'}
      </button>

      {txHash && (
        <p style={{ marginTop:12, color:'#2E7D32', fontSize:13 }}>
          Transfer complete!{' '}
          <a href={BLOCK_EXPLORER+txHash} target='_blank'
            rel='noreferrer' style={{ color:'#836EF9', fontWeight:600 }}>
            View on Monad Explorer ↗
          </a>
        </p>
      )}
      {err && <p style={{ marginTop:12, color:'#B71C1C', fontSize:13 }}>{err}</p>}
    </div>
  );
}
