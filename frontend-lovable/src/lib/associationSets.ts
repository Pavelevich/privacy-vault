/**
 * Association Set Provider System
 *
 * Based on Vitalik Buterin's Privacy Pools paper:
 * "Blockchain Privacy and Regulatory Compliance: Towards a Practical Equilibrium"
 *
 * Association sets are curated Merkle trees containing "approved" or "clean" deposits.
 * Users can prove their deposit is in an association set without revealing which deposit.
 */

import { buildMerkleTree, getMerkleRoot, getMerkleProof } from "./zkProofs";

// API endpoint - connect to local relayer in dev
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_BASE = isDev ? "http://localhost:3001" : "https://relayer.tetsuo.ai";

// Association set types based on Privacy Pools paper
export interface AssociationSet {
  id: number;
  name: string;
  description: string;
  provider: string;
  commitments: bigint[];
  root: bigint;
  lastUpdated: number;
  trustLevel: "high" | "medium" | "low";
}

// Pre-defined association set IDs
export const ASSOCIATION_SET_IDS = {
  ALL_VERIFIED: 0,         // All deposits verified by chain analysis
  INSTITUTIONAL: 1,        // KYC'd institutional deposits
  COMMUNITY_CURATED: 2,    // Community-governed clean list
  GEOGRAPHIC_COMPLIANT: 3, // Complies with specific jurisdiction
} as const;

// Demo association sets
const demoAssociationSets: Omit<AssociationSet, "commitments" | "root">[] = [
  {
    id: ASSOCIATION_SET_IDS.ALL_VERIFIED,
    name: "All Verified Deposits",
    description: "Deposits verified by chain analysis providers (Chainalysis, TRM Labs)",
    provider: "Tetsuo Chain Analysis",
    lastUpdated: Date.now(),
    trustLevel: "high",
  },
  {
    id: ASSOCIATION_SET_IDS.INSTITUTIONAL,
    name: "Institutional Compliant",
    description: "Deposits from KYC-verified institutional participants",
    provider: "Tetsuo KYC Provider",
    lastUpdated: Date.now(),
    trustLevel: "high",
  },
  {
    id: ASSOCIATION_SET_IDS.COMMUNITY_CURATED,
    name: "Community Clean List",
    description: "Community-governed list of non-malicious deposits",
    provider: "Tetsuo DAO",
    lastUpdated: Date.now(),
    trustLevel: "medium",
  },
  {
    id: ASSOCIATION_SET_IDS.GEOGRAPHIC_COMPLIANT,
    name: "US Compliant",
    description: "Deposits compliant with US regulatory requirements",
    provider: "Tetsuo Compliance",
    lastUpdated: Date.now(),
    trustLevel: "high",
  },
];

// In-memory store for association set data
let associationSetData: Map<number, AssociationSet> = new Map();

/**
 * Initialize association sets with deposit commitments
 * In production, this would fetch from on-chain data or an API
 */
export async function initializeAssociationSets(
  depositCommitments: bigint[]
): Promise<void> {
  for (const setMeta of demoAssociationSets) {
    // For demo, all sets contain the same commitments
    // In production, each set would have its own curated list
    const tree = await buildMerkleTree(depositCommitments);
    const root = getMerkleRoot(tree);

    associationSetData.set(setMeta.id, {
      ...setMeta,
      commitments: [...depositCommitments],
      root,
    });
  }
}

/**
 * Add a commitment to an association set
 * Called when a new deposit is verified as "clean"
 */
export async function addCommitmentToSet(
  setId: number,
  commitment: bigint
): Promise<void> {
  const set = associationSetData.get(setId);
  if (!set) {
    throw new Error(`Association set ${setId} not found`);
  }

  // Add commitment if not already present
  if (!set.commitments.includes(commitment)) {
    set.commitments.push(commitment);

    // Rebuild tree with new commitment
    const tree = await buildMerkleTree(set.commitments);
    set.root = getMerkleRoot(tree);
    set.lastUpdated = Date.now();
  }
}

/**
 * Get association set metadata
 */
export function getAssociationSet(setId: number): AssociationSet | undefined {
  return associationSetData.get(setId);
}

/**
 * Get all available association sets
 */
export function getAllAssociationSets(): AssociationSet[] {
  return Array.from(associationSetData.values());
}

/**
 * Check if a commitment is in an association set
 */
export function isCommitmentInSet(setId: number, commitment: bigint): boolean {
  const set = associationSetData.get(setId);
  if (!set) return false;
  return set.commitments.includes(commitment);
}

/**
 * Get Merkle proof for a commitment in an association set
 */
export async function getAssociationProof(
  setId: number,
  commitment: bigint
): Promise<{
  root: bigint;
  pathElements: bigint[];
  pathIndices: number[];
} | null> {
  const set = associationSetData.get(setId);
  if (!set) return null;

  const index = set.commitments.findIndex(c => c === commitment);
  if (index === -1) return null;

  const tree = await buildMerkleTree(set.commitments);
  const { pathElements, pathIndices } = getMerkleProof(tree, index);

  return {
    root: set.root,
    pathElements,
    pathIndices,
  };
}

/**
 * Fetch association set updates from provider API
 * In production, this would poll or subscribe to updates
 */
export async function fetchAssociationSetUpdates(): Promise<void> {
  // In production, this would fetch from:
  // - Chain analysis API (Chainalysis, TRM Labs)
  // - On-chain attestation records
  // - DAO governance decisions

  console.log("Fetching association set updates...");
  // For demo, we just update timestamps
  for (const set of associationSetData.values()) {
    set.lastUpdated = Date.now();
  }
}

/**
 * Get recommended association set for a user
 * Based on their requirements and the sets they're eligible for
 */
export function getRecommendedSet(
  commitment: bigint,
  requirements: {
    needsInstitutional?: boolean;
    jurisdiction?: string;
  }
): AssociationSet | undefined {
  // Check eligibility in order of preference
  const priorities = requirements.needsInstitutional
    ? [ASSOCIATION_SET_IDS.INSTITUTIONAL, ASSOCIATION_SET_IDS.ALL_VERIFIED]
    : [ASSOCIATION_SET_IDS.ALL_VERIFIED, ASSOCIATION_SET_IDS.COMMUNITY_CURATED];

  for (const setId of priorities) {
    if (isCommitmentInSet(setId, commitment)) {
      return getAssociationSet(setId);
    }
  }

  return undefined;
}

// ============================================
// API INTEGRATION
// ============================================

/**
 * Fetch all association sets from the API
 */
export async function fetchAssociationSetsFromAPI(): Promise<AssociationSet[]> {
  try {
    const response = await fetch(`${API_BASE}/api/association-sets`);
    if (!response.ok) {
      throw new Error('Failed to fetch association sets');
    }
    const data = await response.json();
    return data.sets.map((set: any) => ({
      id: set.id,
      name: set.name,
      description: set.description,
      provider: set.provider,
      commitments: [],
      root: BigInt(set.root),
      lastUpdated: set.lastUpdated,
      trustLevel: set.trustLevel,
      criteria: set.criteria,
      totalDeposits: set.totalDeposits,
    }));
  } catch (error) {
    console.error('Failed to fetch association sets:', error);
    return [];
  }
}

/**
 * Get proof from API that a commitment is in an association set
 */
export async function getAssociationProofFromAPI(
  setId: number,
  commitment: string
): Promise<{
  root: string;
  pathElements: string[];
  pathIndices: number[];
  setName: string;
  trustLevel: string;
  provider: string;
} | null> {
  try {
    const response = await fetch(`${API_BASE}/api/association-sets/${setId}/proof`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commitment }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get association proof:', error);
    return null;
  }
}

/**
 * Find which association sets contain a commitment
 */
export async function findCommitmentSetsFromAPI(commitment: string): Promise<{
  setId: number;
  setName: string;
  trustLevel: string;
  provider: string;
}[]> {
  try {
    const response = await fetch(`${API_BASE}/api/association-sets/find`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commitment }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.sets;
  } catch (error) {
    console.error('Failed to find commitment sets:', error);
    return [];
  }
}

/**
 * Verify a deposit with chain analysis (simulated)
 */
export async function verifyDepositWithAPI(
  depositAddress: string,
  commitment: string
): Promise<{
  verified: boolean;
  sets: { setId: number; setName: string; trustLevel: string }[];
  reason: string | null;
}> {
  try {
    const response = await fetch(`${API_BASE}/api/association-sets/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ depositAddress, commitment }),
    });

    if (!response.ok) {
      throw new Error('Verification failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to verify deposit:', error);
    return {
      verified: false,
      sets: [],
      reason: 'API error: ' + (error instanceof Error ? error.message : 'Unknown'),
    };
  }
}

// Export types
export type AssociationSetId = typeof ASSOCIATION_SET_IDS[keyof typeof ASSOCIATION_SET_IDS];
