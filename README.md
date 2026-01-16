<p align="center">
  <img src="https://img.shields.io/badge/Solana-Privacy%20Hack%202026-9945FF?style=for-the-badge&logo=solana&logoColor=white" alt="Solana Privacy Hack 2026"/>
  <img src="https://img.shields.io/badge/ZK-Groth16-00D4AA?style=for-the-badge" alt="ZK Proofs"/>
  <img src="https://img.shields.io/badge/Light%20Protocol-Compressed%20Accounts-FF6B6B?style=for-the-badge" alt="Light Protocol"/>
</p>

<h1 align="center">Privacy Vault</h1>

<p align="center">
  <strong>Private Transactions with Proof of Innocence on Solana</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#demo">Demo</a>
</p>

---

## The Problem

Traditional privacy solutions face an impossible choice:

| Approach | Privacy | Compliance | Result |
|----------|---------|------------|--------|
| **Full Transparency** | None | Full | Users exposed |
| **Full Privacy (Mixers)** | Full | None | Criminals exploit |
| **Privacy Vault** | Full | Selective | Best of both worlds |

**Privacy Vault** implements [Vitalik Buterin's Privacy Pools](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364) research: users maintain complete anonymity while being able to cryptographically prove their funds aren't associated with illicit activity.

---

## Features

<table>
<tr>
<td width="50%">

### Zero-Knowledge Proofs
- **Groth16** proof generation (~300ms in browser)
- Withdraw without revealing deposit source
- Prove innocence without revealing identity

</td>
<td width="50%">

### Association Sets
- Multiple compliance tiers
- Chain analysis integration ready
- DAO-governed whitelists support

</td>
</tr>
<tr>
<td width="50%">

### Compressed Accounts
- **Light Protocol** integration
- Scalable on-chain storage
- Reduced transaction costs

</td>
<td width="50%">

### Privacy-First Design
- Fixed denomination pools
- Optional relayer (gas privacy)
- SPL token support

</td>
</tr>
</table>

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRIVACY VAULT FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │   DEPOSIT    │         │   WITHDRAW   │         │    PROVE     │
  │              │         │              │         │  INNOCENCE   │
  │  ┌────────┐  │         │  ┌────────┐  │         │  ┌────────┐  │
  │  │ 1 SOL  │  │         │  │ Secret │  │         │  │ Assoc. │  │
  │  │        │──┼────────▶│  │  Note  │──┼────────▶│  │  Set   │  │
  │  └────────┘  │         │  └────────┘  │         │  └────────┘  │
  │      │       │         │      │       │         │      │       │
  │      ▼       │         │      ▼       │         │      ▼       │
  │  ┌────────┐  │         │  ┌────────┐  │         │  ┌────────┐  │
  │  │Commit- │  │         │  │ZK Proof│  │         │  │ZK Proof│  │
  │  │  ment  │  │         │  │Generated│ │         │  │ "I'm   │  │
  │  │ Hash   │  │         │  │        │  │         │  │ Clean" │  │
  │  └────────┘  │         │  └────────┘  │         │  └────────┘  │
  └──────────────┘         └──────────────┘         └──────────────┘
         │                        │                        │
         │    Compressed          │   Anonymous            │   Verifiable
         │    Account             │   Withdrawal           │   Compliance
         ▼                        ▼                        ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                     SOLANA BLOCKCHAIN                           │
  │                   Light Protocol + ZK Verifier                  │
  └─────────────────────────────────────────────────────────────────┘
```

### The Magic of Zero-Knowledge

| Step | What Happens | What's Proven | What's Hidden |
|------|--------------|---------------|---------------|
| **Deposit** | Create commitment hash | Funds locked | Secret + Nullifier |
| **Withdraw** | Submit ZK proof | Valid deposit exists | Which deposit is yours |
| **Prove** | Submit innocence proof | You're in clean set | Your identity |

---

## Architecture

```
privacy-vault/
├── circuits/                    # Circom ZK Circuits
│   └── vault/
│       ├── withdraw.circom      # Anonymous withdrawal proof
│       └── innocence.circom     # Proof of innocence
│
├── programs/                    # Solana Programs (Anchor)
│   └── privacy-vault/
│       └── src/lib.rs           # On-chain verifier + vault logic
│
├── frontend-lovable/            # React Frontend
│   ├── src/
│   │   ├── components/          # UI Components
│   │   ├── hooks/               # usePrivacyVault hook
│   │   └── lib/                 # ZK proof generation
│   └── public/circuits/         # Compiled WASM + zkey
│
└── relayer/                     # Backend Service
    ├── server.js                # Express API
    └── association-sets.js      # Compliance sets
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Smart Contract** | Anchor 0.31 + Light Protocol | On-chain vault + ZK verification |
| **ZK Circuits** | Circom 2.0 + Groth16 | Proof generation |
| **Frontend** | React 18 + Vite + TailwindCSS | User interface |
| **Wallet** | Solana Wallet Adapter | Phantom, Solflare, etc. |
| **Relayer** | Node.js + Express | Gas abstraction |

---

## Deployed Contracts

| Network | Program ID | Status |
|---------|------------|--------|
| **Devnet** | `9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu` | Live |
| Mainnet | Coming Soon | - |

<a href="https://solscan.io/account/9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu?cluster=devnet">
  <img src="https://img.shields.io/badge/View%20on-Solscan-9945FF?style=for-the-badge&logo=solana" alt="View on Solscan"/>
</a>

---

## Association Sets

Prove membership in curated "clean" sets without revealing identity:

| Set | Description | Use Case |
|-----|-------------|----------|
| `ALL_VERIFIED` | All non-flagged addresses | General privacy |
| `INSTITUTIONAL` | KYC'd institutional users | Compliance-heavy environments |
| `COMMUNITY_CURATED` | DAO-governed whitelist | DeFi participation |
| `US_COMPLIANT` | OFAC-compliant addresses | US regulatory requirements |
| `EU_COMPLIANT` | MiCA-compliant addresses | EU regulatory requirements |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Rust + Anchor CLI (for contract development)
- Solana CLI

### Run Locally

```bash
# Clone the repository
git clone https://github.com/Pavelevich/privacy-vault.git
cd privacy-vault

# Install frontend dependencies
cd frontend-lovable
npm install

# Start the frontend (port 3000)
npm run dev

# In a new terminal, start the relayer (port 3001)
cd ../relayer
npm install
npm start
```

### Get Devnet SOL

```bash
solana airdrop 2 --url devnet
```

Or use the faucet: https://faucet.solana.com

---

## Demo

### User Flow

1. **Connect** - Link your Phantom or Solflare wallet
2. **Select Pool** - Choose denomination (0.1, 1, or 10 SOL)
3. **Generate Note** - Create cryptographic commitment
4. **Save Note** - Download secret note JSON (required for withdrawal!)
5. **Deposit** - Send SOL to privacy pool
6. **Wait** - Let anonymity set grow
7. **Withdraw** - Use secret note + ZK proof
8. **Prove Innocence** - Generate compliance proof if needed

### Supported Tokens

| Token | Denominations | Status |
|-------|---------------|--------|
| SOL | 0.1, 1, 10 | Live |
| USDC | 10, 100, 1000 | Coming Soon |
| TETSUO | 100, 1K, 10K | Coming Soon |
| BONK | 1M, 10M, 100M | Coming Soon |

---

## Security

### Best Practices

| Do | Don't |
|----|-------|
| Save secret note securely | Share your secret note |
| Use fixed denominations | Use custom amounts (smaller anonymity set) |
| Wait between deposit/withdraw | Withdraw immediately after deposit |
| Use relayer for max privacy | Pay gas from same wallet |

### Audits

- [ ] ZK Circuit Audit (Planned)
- [ ] Smart Contract Audit (Planned)

---

## Research & References

This project implements concepts from:

- **[Privacy Pools](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364)** - Buterin, Illum, et al. (2023)
- **[Tornado Cash](https://tornado.cash/audits/TornadoCash_circuit_audit_ABDK.pdf)** - Original ZK mixer design
- **[Light Protocol](https://www.lightprotocol.com/)** - Compressed accounts on Solana

---

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

```bash
# Run tests
cd frontend-lovable
npm test

# Build for production
npm run build
```

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  <strong>Built for Solana Privacy Hack 2026</strong>
</p>

<p align="center">
  <a href="https://github.com/Pavelevich/privacy-vault">
    <img src="https://img.shields.io/github/stars/Pavelevich/privacy-vault?style=social" alt="GitHub Stars"/>
  </a>
</p>
