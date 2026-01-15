# Privacy Vault - Development Plan

## Project Vision: OVERKILL Edition

**Privacy Vault** is not just another mixer. It's the first **Privacy Pools** implementation on Solana, featuring **Proof of Innocence** - allowing users to prove their funds are NOT from illicit sources without revealing their complete transaction history.

Based on [Vitalik Buterin's Privacy Pools Paper](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364) (September 2023).

---

## What Makes This UNIQUE (No One Else Has This)

| Feature | Tornado Cash | Other Mixers | **Privacy Vault** |
|---------|--------------|--------------|-------------------|
| Basic anonymity | ✅ | ✅ | ✅ |
| Nullifier scheme | ✅ | ✅ | ✅ |
| **Proof of Innocence** | ❌ | ❌ | ✅ |
| **Association Sets** | ❌ | ❌ | ✅ |
| **Compliance Layer** | ❌ | ❌ | ✅ |
| Light Protocol (Solana) | ❌ | ❌ | ✅ |
| Compressed accounts (cheap) | ❌ | ❌ | ✅ |

---

## Academic Foundation

### Core Papers

1. **"Blockchain Privacy and Regulatory Compliance: Towards a Practical Equilibrium"**
   - Authors: Vitalik Buterin, Jacob Illum, Matthias Nadler, Fabian Schär, Ameen Soleimani
   - URL: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364
   - Key concept: Privacy Pools with association sets

2. **"Zero-Knowledge Proofs for Set Membership"**
   - URL: https://eprint.iacr.org/2019/1255.pdf
   - Key concept: Efficient set membership proofs with Groth16

3. **"Enhanced Security and Efficiency in Blockchain with Aggregated ZK Proof Mechanisms"**
   - URL: https://arxiv.org/abs/2402.03834
   - Key concept: Merkle tree aggregation for proof efficiency

### Mathematical Primitives

```
Commitment = Poseidon(nullifier || secret)
Nullifier_Hash = Poseidon(nullifier)
Association_Set_Root = Merkle_Root(approved_deposits)

Proof of Innocence:
  - Prove: commitment ∈ Merkle_Tree (all deposits)
  - Prove: commitment ∈ Association_Set (approved deposits)
  - Prove: knowledge of (secret, nullifier) without revealing them
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRIVACY VAULT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   DEPOSIT    │    │   WITHDRAW   │    │   PROVE      │       │
│  │              │    │              │    │  INNOCENCE   │       │
│  │ • Generate   │    │ • ZK Proof   │    │              │       │
│  │   secret +   │    │   of owner   │    │ • Prove NOT  │       │
│  │   nullifier  │    │ • Nullifier  │    │   in bad set │       │
│  │ • Compute    │    │   prevents   │    │ • Association│       │
│  │   commitment │    │   double     │    │   set proof  │       │
│  │ • Add to     │    │   spend      │    │              │       │
│  │   Merkle     │    │              │    │              │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  LIGHT PROTOCOL LAYER                     │   │
│  │  • Compressed accounts (59x cheaper)                      │   │
│  │  • ZK compression for state                               │   │
│  │  • Nullifiers as compressed PDAs                          │   │
│  │  • Groth16 verification (~200k CU)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    HELIUS LAYER                           │   │
│  │  • RPC infrastructure                                     │   │
│  │  • Merkle tree indexing (Photon)                          │   │
│  │  • Transaction monitoring                                 │   │
│  │  • Webhook alerts                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Bounties Target

| Bounty | Prize | Why We Qualify |
|--------|-------|----------------|
| **Open Track** | $18,000 | Privacy Pools innovation |
| **Light Protocol** | $3,000 | Built entirely on Light |
| **Helius** | $5,000 | Uses Helius RPC + indexing |
| **Range** | $1,500 | Compliance features (Proof of Innocence) |
| **Privacy Tooling Track** | $15,000 | Infrastructure for devs |
| **TOTAL POTENTIAL** | **$42,500** | |

---

## Technical Stack

### Solana Program (Rust/Anchor)
- Light SDK v0.17+ with V2 accounts
- Groth16 verification on-chain
- Compressed PDAs for nullifiers
- Address Merkle Tree V2: `amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx`

### ZK Circuits (Circom)
- Poseidon hashing for commitments
- 26-level Merkle proof verification
- Nullifier derivation circuit
- **NEW: Association set membership proof**

### Frontend (Next.js)
- React 18 + TypeScript
- Solana Wallet Adapter
- TailwindCSS
- Helius SDK for RPC

---

## Implementation Phases

### Phase 1: Core Vault (MVP) ⏱️ 3-4 days
- [x] Project setup
- [x] Clone ZK-ID example
- [x] Setup Next.js frontend
- [ ] Adapt circuits for deposit/withdraw
- [ ] Basic deposit instruction
- [ ] Basic withdraw with nullifier
- [ ] Frontend: Connect wallet
- [ ] Frontend: Deposit flow
- [ ] Frontend: Withdraw flow

### Phase 2: Privacy Pools (Differentiator) ⏱️ 2-3 days
- [ ] Association set Merkle tree
- [ ] Proof of Innocence circuit
- [ ] "Good actor" set management
- [ ] Frontend: Prove innocence UI
- [ ] Integration with Range (optional)

### Phase 3: Polish & Demo ⏱️ 1-2 days
- [ ] Deploy to devnet
- [ ] Deploy to mainnet (if possible)
- [ ] Create 3-min demo video
- [ ] Write documentation
- [ ] Prepare submission

---

## Key Files Structure

```
privacy-vault/
├── PLAN.md                          # This file
├── programs/
│   └── privacy-vault/
│       ├── programs/
│       │   └── privacy-vault/       # Renamed from zk-id
│       │       └── src/
│       │           ├── lib.rs       # Main program
│       │           └── verifying_key.rs
│       ├── circuits/
│       │   ├── deposit.circom       # NEW: Deposit circuit
│       │   ├── withdraw.circom      # NEW: Withdraw with nullifier
│       │   └── innocence.circom     # NEW: Proof of innocence
│       └── scripts/
│           └── setup.sh
├── app/                             # Next.js frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # Main page
│       │   ├── deposit/
│       │   └── withdraw/
│       ├── components/
│       │   ├── WalletProvider.tsx
│       │   ├── DepositForm.tsx
│       │   └── WithdrawForm.tsx
│       └── lib/
│           ├── circuits.ts         # Circuit interaction
│           └── program.ts          # Anchor client
├── circuits/
│   └── nullifier-example/          # Reference
└── tests/
```

---

## Cryptographic Design

### Deposit Flow
```
1. User generates:
   - secret: random 31 bytes
   - nullifier: random 31 bytes

2. Compute commitment:
   commitment = Poseidon(nullifier, secret)

3. On-chain:
   - Add commitment to deposit Merkle tree
   - Store as compressed account (Light Protocol)
   - Cost: ~0.000015 SOL per deposit
```

### Withdraw Flow
```
1. User provides:
   - secret (private input)
   - nullifier (private input)
   - Merkle proof (private input)
   - recipient address (public)

2. Circuit verifies:
   - commitment = Poseidon(nullifier, secret)
   - commitment ∈ deposit Merkle tree
   - nullifier_hash = Poseidon(nullifier)

3. On-chain:
   - Verify Groth16 proof
   - Check nullifier_hash not used
   - Store nullifier_hash (prevents double-spend)
   - Transfer funds to recipient
```

### Proof of Innocence (UNIQUE FEATURE)
```
1. Association Set:
   - Merkle tree of "approved" deposits
   - Maintained by trusted attestors or on-chain analysis

2. User proves:
   - My deposit ∈ all_deposits (standard)
   - My deposit ∈ association_set (innocence proof)

3. Result:
   - User proves funds are NOT from bad actors
   - Without revealing WHICH specific deposit is theirs
```

---

## Mainnet Addresses (Ready to Use)

```
Light System Program:     SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7
Compressed Token:         cTokenmWW8bLPjZEBAUgYy3zKxQZW6VKi7bqNFEVv3m
Account Compression:      compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq
Address Merkle Tree V2:   amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx
State Tree #1:            bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU

RPC (Helius):             https://mainnet.helius-rpc.com?api-key=<key>
```

---

## Competition Analysis

| Project | What They Do | Our Advantage |
|---------|--------------|---------------|
| Elusiv (deprecated) | Basic shielded transfers | We have Proof of Innocence |
| Light Protocol examples | Just examples | Full product with UI |
| Other hackathon projects | Unknown | Academic backing + unique feature |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Circuit complexity | Start with simple deposit/withdraw, add innocence later |
| Mainnet deployment | Have devnet demo ready, mainnet as bonus |
| Time constraints | Prioritize MVP + one differentiator |
| Groth16 setup | Use existing Powers of Tau ceremony |

---

## Success Criteria

### Minimum (to submit)
- [ ] Working deposit on devnet
- [ ] Working withdraw with nullifier on devnet
- [ ] Basic frontend
- [ ] 3-min demo video

### Target (competitive)
- [ ] Proof of Innocence circuit
- [ ] Mainnet deployment
- [ ] Polished UI
- [ ] Good documentation

### Stretch (winner material)
- [ ] Multi-asset support
- [ ] Integration with Range
- [ ] Real-time privacy scoring
- [ ] Mobile-friendly UI

---

## Resources

- Light Protocol Docs: https://www.zkcompression.com
- ZK-ID Example: programs/privacy-vault/
- Nullifier Example: circuits/nullifier-example/
- Privacy Pools Paper: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364
- Helius Docs: https://docs.helius.dev
- Circom Docs: https://docs.circom.io

---

## Notes for Future Sessions

If context is compressed, read this file first to understand:
1. What we're building: Privacy Vault with Proof of Innocence
2. Why it's unique: First Privacy Pools on Solana
3. Tech stack: Light Protocol + Groth16 + Next.js
4. Target bounties: Open Track + Light + Helius + Range = $42.5k potential

**Current Progress:** Check the todo list and git status for latest state.
# GitHub Repository
Frontend repo: https://github.com/Pavelevich/glow-your-art
