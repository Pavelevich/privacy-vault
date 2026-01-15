# Privacy Vault

> **Private transactions with Proof of Innocence on Solana**

Privacy Vault enables anonymous deposits and withdrawals on Solana while allowing users to cryptographically prove their funds are not associated with illicit activity. Built on Vitalik Buterin's Privacy Pools research paper.

## The Problem

Traditional mixers face a critical dilemma:
- **Full privacy** = Criminals can launder money anonymously
- **Full compliance** = Users lose financial privacy

Privacy Vault solves this with **selective transparency**: users can prove innocence without revealing their identity.

## How It Works

```
1. DEPOSIT          2. WITHDRAW             3. PROVE INNOCENCE
   ┌─────────┐         ┌─────────┐            ┌─────────┐
   │ 1 SOL   │  ──▶   │ ZK Proof │   ──▶     │ ZK Proof │
   │ deposit │         │ + secret │            │ + assoc. │
   └─────────┘         │ note     │            │ set      │
        │              └─────────┘            └─────────┘
        ▼                   │                      │
   ┌─────────┐              ▼                      ▼
   │Compressed│         ┌─────────┐          ┌─────────┐
   │ Account  │         │ 1 SOL   │          │ "I'm in │
   │ (Light)  │         │ received│          │  clean  │
   └─────────┘         └─────────┘          │  set"   │
                                             └─────────┘
```

### Zero-Knowledge Magic

- **Deposit**: Creates a cryptographic commitment (hash of secret + nullifier)
- **Withdraw**: Proves you know a valid secret WITHOUT revealing which deposit is yours
- **Prove Innocence**: Proves your deposit is in a "clean" association set WITHOUT revealing your identity

## Key Features

- **ZK Proof Generation** - Groth16 proofs in ~300ms (browser-based)
- **Compressed Accounts** - Uses Light Protocol for scalable on-chain storage
- **Fixed Denomination Pools** - Larger anonymity sets (0.1, 1, 10 SOL pools)
- **Association Sets** - Multiple compliance tiers (verified, institutional, regional)
- **Relayer Support** - Optional relayer pays gas for maximum privacy
- **SPL Token Support** - USDC, TETSUO, BONK pools (coming soon)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│  React + Vite + TailwindCSS + Framer Motion                 │
│  ┌─────────┐  ┌──────────┐  ┌───────────────┐               │
│  │ Deposit │  │ Withdraw │  │ Prove         │               │
│  │   Tab   │  │   Tab    │  │ Innocence Tab │               │
│  └────┬────┘  └────┬─────┘  └───────┬───────┘               │
└───────┼────────────┼────────────────┼───────────────────────┘
        │            │                │
        ▼            ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                      ZK PROOF LAYER                          │
│              snarkjs + Groth16 (Browser WASM)               │
│  ┌─────────────────┐     ┌─────────────────────┐            │
│  │ withdraw.wasm   │     │ innocence.wasm      │            │
│  │ withdraw.zkey   │     │ innocence.zkey      │            │
│  └─────────────────┘     └─────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
        │            │                │
        ▼            ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                    SOLANA BLOCKCHAIN                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Privacy Vault Program                   │    │
│  │  • deposit()      - Create compressed commitment     │    │
│  │  • withdraw()     - Verify ZK proof + send funds     │    │
│  │  • deposit_token() - SPL token deposits              │    │
│  └─────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Light Protocol                          │    │
│  │         Compressed Accounts (ZK State)               │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                      RELAYER SERVICE                         │
│  Express.js + Job Queue                                      │
│  • Submit withdrawals (user pays 0.5% fee)                  │
│  • Association set management                                │
│  • Chain analysis integration                                │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Smart Contract | Anchor 0.31 + Light Protocol |
| ZK Circuits | Circom 2.0 + Groth16 |
| Frontend | React 18 + Vite + TailwindCSS |
| Wallet | Solana Wallet Adapter |
| Relayer | Node.js + Express |

## Deployed Contracts

| Network | Program ID |
|---------|------------|
| Devnet | `9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu` |

[View on Solscan](https://solscan.io/account/9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu?cluster=devnet)

## Association Sets

Users can prove membership in curated "clean" sets:

| Set | Description | Use Case |
|-----|-------------|----------|
| ALL_VERIFIED | All non-flagged addresses | General privacy |
| INSTITUTIONAL | KYC'd institutional users | Compliance-heavy |
| COMMUNITY_CURATED | DAO-governed whitelist | DeFi participation |
| US_COMPLIANT | OFAC-compliant addresses | US users |
| EU_COMPLIANT | MiCA-compliant addresses | EU users |

## Quick Start

```bash
# Clone repository
git clone https://github.com/your-org/privacy-vault
cd privacy-vault

# Install frontend dependencies
cd frontend-lovable
npm install

# Start frontend (port 3000)
npm run dev

# In another terminal, start relayer (port 3001)
cd ../relayer
npm install
npm start
```

## Project Structure

```
privacy-vault/
├── circuits/           # Circom ZK circuits
│   ├── withdraw.circom
│   └── innocence.circom
├── frontend-lovable/   # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   └── public/
│       └── circuits/   # Compiled WASM + zkey files
├── programs/           # Anchor smart contracts
│   └── privacy-vault/
│       └── src/lib.rs
├── relayer/            # Backend relayer service
│   ├── server.js
│   └── association-sets.js
└── tests/              # Integration tests
```

## Demo Flow

1. **Connect Wallet** - Connect Phantom or Solflare
2. **Select Pool** - Choose denomination (0.1, 1, or 10 SOL)
3. **Generate Note** - Create cryptographic commitment
4. **Save Note** - Download the secret note JSON
5. **Deposit** - Send SOL to the privacy pool
6. **Wait** - Let anonymity set grow
7. **Withdraw** - Use secret note + ZK proof to withdraw
8. **Prove Innocence** - Generate proof for compliance

## Security Considerations

- **Secret Note**: Required for withdrawal. Store securely - cannot be recovered!
- **Anonymity Set**: Larger pools = better privacy. Wait for more deposits.
- **Timing Analysis**: Avoid depositing and withdrawing close together.
- **Amount Correlation**: Use fixed denominations to prevent amount-based linking.

## Research References

- [Privacy Pools](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364) - Buterin, Illum, et al.
- [Tornado Cash](https://tornado.cash/audits/TornadoCash_circuit_audit_ABDK.pdf) - Original ZK mixer design
- [Light Protocol](https://www.lightprotocol.com/) - Compressed accounts on Solana

## Hackathon

Built for **Solana Privacy Hack 2026**

## License

MIT License - See [LICENSE](LICENSE) for details.
