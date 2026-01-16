/**
 * SPL Token Configuration for Privacy Vault
 *
 * Supported tokens for private deposits and withdrawals.
 * Each token has its own pool with separate anonymity sets.
 */

import { PublicKey } from "@solana/web3.js";

export interface TokenConfig {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoUrl: string;
  denominations: number[];  // Fixed denomination amounts
  color: string;           // Brand color for UI
}

// Supported tokens - Only SOL for now
export const SUPPORTED_TOKENS: TokenConfig[] = [
  {
    symbol: "SOL",
    name: "Solana",
    mint: "So11111111111111111111111111111111111111112", // Native SOL wrapped
    decimals: 9,
    logoUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    denominations: [0.1, 1, 10],
    color: "#9945FF",
  },
];

// Get token by symbol
export function getTokenBySymbol(symbol: string): TokenConfig | undefined {
  return SUPPORTED_TOKENS.find(t => t.symbol === symbol);
}

// Get token by mint address
export function getTokenByMint(mint: string): TokenConfig | undefined {
  return SUPPORTED_TOKENS.find(t => t.mint === mint);
}

// Format token amount for display
export function formatTokenAmount(amount: number, token: TokenConfig): string {
  if (token.decimals <= 2) {
    return amount.toFixed(token.decimals);
  }
  // For high decimal tokens, show fewer decimals
  const displayDecimals = Math.min(4, token.decimals);
  return amount.toFixed(displayDecimals);
}

// Parse token amount from string
export function parseTokenAmount(amountStr: string, token: TokenConfig): number {
  const amount = parseFloat(amountStr);
  if (isNaN(amount)) return 0;
  return amount;
}

// Convert to smallest unit (lamports/token base units)
export function toSmallestUnit(amount: number, decimals: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, decimals)));
}

// Convert from smallest unit to display amount
export function fromSmallestUnit(amount: bigint, decimals: number): number {
  return Number(amount) / Math.pow(10, decimals);
}

// Get vault PDA seed for a specific token
export function getTokenVaultSeed(mint: string): Buffer {
  return Buffer.from(`vault_${mint.slice(0, 16)}`);
}

// Pool statistics per token (would come from on-chain in production)
export interface TokenPoolStats {
  token: TokenConfig;
  totalDeposits: number;
  activeDeposits: number;
  totalVolume: number;
  anonymitySet: {
    [denom: string]: number;
  };
}

// Mock pool stats (would fetch from on-chain)
export function getPoolStats(token: TokenConfig): TokenPoolStats {
  return {
    token,
    totalDeposits: Math.floor(Math.random() * 10000) + 1000,
    activeDeposits: Math.floor(Math.random() * 500) + 100,
    totalVolume: Math.floor(Math.random() * 1000000),
    anonymitySet: token.denominations.reduce((acc, denom) => {
      acc[denom.toString()] = Math.floor(Math.random() * 500) + 50;
      return acc;
    }, {} as { [key: string]: number }),
  };
}
