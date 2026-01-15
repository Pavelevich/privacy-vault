# Privacy Vault - ZK Circuits

## Overview

These circuits implement a privacy-preserving vault system on Solana using Light Protocol.

**Unique Feature:** Proof of Innocence based on [Vitalik's Privacy Pools paper](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364).

## Circuits

### 1. `commitment.circom`
Base commitment scheme used by all other circuits.

```
Commitment = Poseidon(nullifier, secret)
NullifierHash = Poseidon(nullifier)
```

### 2. `withdraw.circom`
Proves right to withdraw without revealing which deposit.

**Public Inputs:**
- `root` - Merkle root of deposits
- `nullifierHash` - Prevents double-spending
- `recipient` - Where funds go
- `relayer` - Optional privacy relay
- `fee` - Relayer fee

**Private Inputs:**
- `nullifier`, `secret` - The deposit secrets
- `pathElements`, `pathIndices` - Merkle proof

### 3. `innocence.circom` (UNIQUE FEATURE)
Proves funds are NOT from illicit sources.

**Public Inputs:**
- `depositRoot` - Main deposit tree root
- `associationSetRoot` - "Clean deposits" tree root
- `nullifierHash` - Links to specific deposit
- `associationSetId` - Which set we're proving membership in
- `timestamp` - Validity time

**Private Inputs:**
- `nullifier`, `secret` - Deposit secrets
- Two Merkle proofs (one for each tree)

## How Proof of Innocence Works

```
┌─────────────────────────────────────────────────────────────┐
│                     MAIN DEPOSIT TREE                       │
│                                                             │
│   [C1] [C2] [C3] [C4] [C5] [C6] [C7] [C8] ...              │
│         ↑                   ↑                               │
│     Bad Actor            Your Deposit                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   ASSOCIATION SET TREE                      │
│                   ("Clean Deposits Only")                   │
│                                                             │
│   [C1] [C3] [C4] [C5] [C6] [C7] [C8] ...                   │
│                         ↑                                   │
│                    Your Deposit                             │
│     (C2 excluded - known bad actor)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

PROOF: "My deposit is in BOTH trees"
       → I have a valid deposit
       → My deposit is in the 'clean' set
       → You don't know WHICH deposit is mine
```

## Compilation

```bash
# Install dependencies
npm install

# Compile circuits
circom commitment.circom --r1cs --wasm --sym -o ../build/
circom withdraw.circom --r1cs --wasm --sym -o ../build/
circom innocence.circom --r1cs --wasm --sym -o ../build/

# Generate proving keys (requires Powers of Tau)
snarkjs groth16 setup withdraw.r1cs pot_final.ptau withdraw.zkey
snarkjs zkey export verificationkey withdraw.zkey withdraw_vkey.json
```

## Integration with Light Protocol

These circuits are designed to work with Light Protocol's:
- Compressed accounts (59x cheaper nullifier storage)
- State Merkle trees (26 levels)
- Groth16 on-chain verification

## Security Notes

- Circuits are NOT audited - use at your own risk
- For hackathon demonstration only
- Production use requires formal verification
