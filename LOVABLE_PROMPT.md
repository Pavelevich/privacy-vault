# Lovable Prompt for Privacy Vault Frontend

## Project Overview

Build a **Privacy Vault** - a single-page zero-knowledge privacy app for Solana. Style inspiration: https://app.encifher.io/

## Tech Stack

- **Framework:** Next.js 14+ with App Router
- **Styling:** TailwindCSS (dark mode only)
- **Wallet:** Solana Wallet Adapter
- **UI:** shadcn/ui components
- **Animations:** Framer Motion
- **Icons:** Lucide React

---

## SINGLE PAGE DESIGN

Everything on ONE page with tabs. No routing between pages.

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: Privacy Vault]              [Connect Wallet Button] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     YOUR TRANSACTIONS. YOUR PRIVACY. YOUR PROOF.            │
│     ─────────────────────────────────────────────           │
│     First Privacy Pools on Solana with Proof of Innocence   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ┌─────────┐  ┌─────────┐  ┌─────────────────┐          │
│     │ DEPOSIT │  │WITHDRAW │  │ PROVE INNOCENCE │          │
│     └─────────┘  └─────────┘  └─────────────────┘          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │                                                    │    │
│  │              [Active Tab Content Here]             │    │
│  │                                                    │    │
│  │                                                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                        STATS BAR                            │
│   Total Deposited: $XXX    |    Transactions: XXX    |     │
│   Anonymity Set: XXX       |    Powered by Light Protocol   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     HOW IT WORKS        FAQ        BUILT WITH               │
│     ────────────        ───        ──────────               │
│     3 step cards        Accordion  Light Protocol           │
│                                    Helius                   │
│                                    Solana                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Design Specifications

### Colors
```css
--background: #09090b (zinc-950)
--card: #18181b (zinc-900)
--card-hover: #27272a (zinc-800)
--border: #3f3f46 (zinc-700)
--primary: #a855f7 (purple-500)
--primary-glow: #a855f7/20
--secondary: #06b6d4 (cyan-500)
--success: #22c55e (green-500)
--text: #fafafa (zinc-50)
--text-muted: #a1a1aa (zinc-400)
```

### Typography
- Font: Inter or Space Grotesk
- Hero headline: 48px bold
- Subheadline: 20px regular
- Body: 16px
- Small: 14px

---

## Components Detail

### Header
- Logo left: "Privacy Vault" with lock icon
- Network badge: "Devnet" or "Mainnet" pill
- Connect Wallet button right (purple glow on hover)
- When connected: Show truncated address + disconnect dropdown

### Hero Section
- Headline: "YOUR TRANSACTIONS. YOUR PRIVACY. YOUR PROOF."
- Subheadline: "First Privacy Pools on Solana with Proof of Innocence"
- Subtle animated gradient background or particles

### Tab Navigation
Three tabs in a pill/segment control style:
1. **DEPOSIT** - Default active
2. **WITHDRAW**
3. **PROVE INNOCENCE** - With "NEW" badge

Active tab: Purple background, white text
Inactive: Transparent, gray text

### Tab Content Card
Large card with rounded corners, subtle border glow on the active tab color.

---

## TAB 1: DEPOSIT

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Amount                                            │
│  ┌──────────────────────────────────┐  ┌───────┐ │
│  │ 0.0                              │  │  MAX  │ │
│  └──────────────────────────────────┘  └───────┘ │
│                                         SOL ▼    │
│                                                    │
│  Balance: 0.00 SOL                                │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │           [ GENERATE SECRET NOTE ]            │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  Your Secret Note (click to reveal)           │ │
│  │  ••••••••••••••••••••••••••••••••            │ │
│  │                        [Copy] [Download]      │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ⚠️ Save this note! You need it to withdraw.      │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │              [ DEPOSIT ]                      │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

**States:**
1. Initial: Generate Note button visible
2. After generate: Note displayed (hidden), Deposit button enabled
3. Processing: Loading spinner in button
4. Success: Checkmark + "Deposited!" + tx link

---

## TAB 2: WITHDRAW

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  Your Secret Note                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │                                              │ │
│  │  Paste your note here...                     │ │
│  │                                              │ │
│  └──────────────────────────────────────────────┘ │
│                      or  [Upload File]            │
│                                                    │
│  Recipient Address                                │
│  ┌──────────────────────────────────────────────┐ │
│  │ [Connected wallet address]          [Paste]  │ │
│  └──────────────────────────────────────────────┘ │
│  ☑️ Use connected wallet                          │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  🔒 Privacy Shield                            │ │
│  │  Your withdrawal will be unlinkable from     │ │
│  │  your original deposit.                      │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │              [ WITHDRAW ]                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## TAB 3: PROVE INNOCENCE (Unique Feature!)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  🛡️ PROOF OF INNOCENCE                        │ │
│  │                                              │ │
│  │  Prove your funds are NOT from illicit       │ │
│  │  sources - without revealing your identity   │ │
│  │  or which deposit is yours.                  │ │
│  │                                              │ │
│  │  Based on Vitalik's Privacy Pools paper.     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Your Secret Note                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │  Paste your note here...                     │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  Association Set                                  │
│  ┌──────────────────────────────────────────────┐ │
│  │  All Verified Deposits (Default)         ▼  │ │
│  └──────────────────────────────────────────────┘ │
│  Options: All Verified, Institutional Only,      │
│           Custom Set                             │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │           [ GENERATE PROOF ]                  │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │  ✅ Proof Generated                           │ │
│  │                                              │ │
│  │  This proves your funds are in the          │ │
│  │  "Verified Deposits" set without revealing  │ │
│  │  which specific deposit is yours.           │ │
│  │                                              │ │
│  │  [Download Proof]  [Copy Link]  [Verify]    │ │
│  └──────────────────────────────────────────────┘ │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Stats Bar

Horizontal bar below main card:

```
Total Deposited        Transactions        Anonymity Set        Network
    $12.5M                 1,247              856 users          Devnet
```

Use animated count-up numbers on load.

---

## How It Works Section

Three cards in a row:

**Card 1: Deposit**
- Icon: Download/arrow-down
- "Generate a secret note and deposit SOL into the privacy pool"

**Card 2: Withdraw**
- Icon: Upload/arrow-up
- "Use your note to withdraw to any address. Completely unlinkable."

**Card 3: Prove Innocence**
- Icon: Shield with checkmark
- "Prove your funds aren't from bad actors - without revealing your identity"
- Badge: "UNIQUE FEATURE"

---

## FAQ Section (Accordion)

Q: "How is this different from Tornado Cash?"
A: "Privacy Vault adds Proof of Innocence - you can prove your funds are clean without revealing which deposit is yours."

Q: "Is this legal?"
A: "Yes. Unlike mixers that only hide, we enable compliance through zero-knowledge proofs."

Q: "What is an Association Set?"
A: "A curated list of verified 'clean' deposits. By proving membership, you demonstrate innocence."

Q: "What happens to my note?"
A: "Your note is generated locally and never leaves your device. We can't access it."

---

## Built With Section

Logo row: Light Protocol | Helius | Solana | Groth16

---

## Footer

"Privacy Vault - Built for Solana Privacy Hack 2026"
Links: GitHub | Docs | Twitter

---

## Animations

1. **Tab switch:** Fade content with slight slide
2. **Button hover:** Scale 1.02 + glow intensify
3. **Card hover:** Subtle lift shadow
4. **Stats numbers:** Count up on scroll into view
5. **Success state:** Checkmark with confetti burst
6. **Note reveal:** Blur to clear transition

---

## Mobile Responsive

- Stack tabs vertically on mobile
- Full-width cards
- Sticky header with hamburger menu if needed
- Touch-friendly button sizes (min 44px)

---

## Important Notes

1. **Single page only** - No routing, use state for tabs
2. **Dark mode only** - No light mode toggle needed
3. **Placeholder data** - All numbers are mock
4. **No blockchain logic** - Just UI, I'll add logic later
5. **Wallet connection** - Use Solana Wallet Adapter modal

---

## File Structure (Simple)

```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx          # Everything here
├── components/
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── TabNavigation.tsx
│   ├── DepositTab.tsx
│   ├── WithdrawTab.tsx
│   ├── ProveInnocenceTab.tsx
│   ├── StatsBar.tsx
│   ├── HowItWorks.tsx
│   ├── FAQ.tsx
│   └── Footer.tsx
├── providers/
│   └── WalletProvider.tsx
└── lib/
    └── constants.ts
```

---

## Quick Reference - Copy Text

**Hero:** "YOUR TRANSACTIONS. YOUR PRIVACY. YOUR PROOF."

**Subhero:** "First Privacy Pools on Solana with Proof of Innocence. Deposit anonymously. Withdraw privately. Prove you're not a bad actor."

**CTA Button:** "Connect Wallet to Start"

**Deposit button:** "Deposit to Privacy Pool"

**Withdraw button:** "Withdraw Privately"

**Prove button:** "Generate Innocence Proof"
