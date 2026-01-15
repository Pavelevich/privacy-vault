/**
 * Association Set Provider Service
 *
 * Manages curated lists of "clean" deposits for Privacy Pools compliance.
 * Based on Vitalik Buterin's "Blockchain Privacy and Regulatory Compliance" paper.
 */

import { buildPoseidon } from 'circomlibjs';

const MERKLE_TREE_DEPTH = 10;

let poseidon = null;

async function getPoseidon() {
  if (!poseidon) {
    poseidon = await buildPoseidon();
  }
  return poseidon;
}

// Association Set definitions
export const ASSOCIATION_SETS = {
  // Tier 1: Highest trust - verified by chain analysis providers
  ALL_VERIFIED: {
    id: 0,
    name: "All Verified Deposits",
    description: "Deposits verified by chain analysis providers (Chainalysis, TRM Labs)",
    provider: "Tetsuo Chain Analysis",
    trustLevel: "high",
    criteria: [
      "Source address has no links to sanctioned entities",
      "Funds traceable to legitimate exchanges or businesses",
      "No connection to known hacking incidents",
    ],
  },

  // Tier 1: Institutional KYC
  INSTITUTIONAL: {
    id: 1,
    name: "Institutional Compliant",
    description: "Deposits from KYC-verified institutional participants",
    provider: "Tetsuo KYC Provider",
    trustLevel: "high",
    criteria: [
      "Depositor completed full KYC verification",
      "Source of funds documentation provided",
      "Institutional account holder",
    ],
  },

  // Tier 2: Community curated
  COMMUNITY_CURATED: {
    id: 2,
    name: "Community Clean List",
    description: "Community-governed list of non-malicious deposits",
    provider: "Tetsuo DAO",
    trustLevel: "medium",
    criteria: [
      "Community vote approval",
      "No objections from watchlist monitors",
      "6+ hours without challenge",
    ],
  },

  // Tier 1: Geographic compliance
  US_COMPLIANT: {
    id: 3,
    name: "US Compliant",
    description: "Deposits compliant with US regulatory requirements",
    provider: "Tetsuo Compliance",
    trustLevel: "high",
    criteria: [
      "OFAC sanctions check passed",
      "Not from restricted jurisdiction",
      "FinCEN compliance verified",
    ],
  },

  // Tier 1: EU compliance
  EU_COMPLIANT: {
    id: 4,
    name: "EU MiCA Compliant",
    description: "Deposits compliant with EU MiCA regulations",
    provider: "Tetsuo EU Compliance",
    trustLevel: "high",
    criteria: [
      "EU sanctions list check passed",
      "Travel Rule compliant origin",
      "AML/CFT verified",
    ],
  },
};

// In-memory storage for association set data
const associationSetData = new Map();

// Initialize with empty sets
for (const [key, config] of Object.entries(ASSOCIATION_SETS)) {
  associationSetData.set(config.id, {
    ...config,
    commitments: [],
    root: BigInt(0),
    tree: null,
    lastUpdated: Date.now(),
    stats: {
      totalDeposits: 0,
      addedLast24h: 0,
      removedLast24h: 0,
    },
  });
}

/**
 * Build Merkle tree from commitments
 */
async function buildMerkleTree(commitments) {
  const poseidonHash = await getPoseidon();
  const size = Math.pow(2, MERKLE_TREE_DEPTH);
  const paddedLeaves = [...commitments];

  while (paddedLeaves.length < size) {
    paddedLeaves.push(BigInt(0));
  }

  const tree = [paddedLeaves];

  for (let level = 0; level < MERKLE_TREE_DEPTH; level++) {
    const currentLevel = tree[level];
    const nextLevel = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1];
      const hash = poseidonHash([left, right]);
      nextLevel.push(poseidonHash.F.toObject(hash));
    }

    tree.push(nextLevel);
  }

  return tree;
}

/**
 * Get Merkle root from tree
 */
function getMerkleRoot(tree) {
  return tree[tree.length - 1][0];
}

/**
 * Get Merkle proof for a leaf
 */
function getMerkleProof(tree, leafIndex) {
  const pathElements = [];
  const pathIndices = [];
  let currentIndex = leafIndex;

  for (let level = 0; level < MERKLE_TREE_DEPTH; level++) {
    const isRight = currentIndex % 2 === 1;
    const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

    pathElements.push(tree[level][siblingIndex] || BigInt(0));
    pathIndices.push(isRight ? 1 : 0);

    currentIndex = Math.floor(currentIndex / 2);
  }

  return { pathElements, pathIndices };
}

/**
 * Add a commitment to an association set
 */
export async function addCommitment(setId, commitment, metadata = {}) {
  const set = associationSetData.get(setId);
  if (!set) {
    throw new Error(`Association set ${setId} not found`);
  }

  const commitmentBigInt = BigInt(commitment);

  // Check if already exists
  if (set.commitments.some(c => c === commitmentBigInt)) {
    return { added: false, reason: 'Already in set' };
  }

  // Add commitment
  set.commitments.push(commitmentBigInt);

  // Rebuild tree
  set.tree = await buildMerkleTree(set.commitments);
  set.root = getMerkleRoot(set.tree);
  set.lastUpdated = Date.now();
  set.stats.totalDeposits++;
  set.stats.addedLast24h++;

  console.log(`Added commitment to set ${setId}:`, commitment.toString().slice(0, 20) + '...');

  return {
    added: true,
    setId,
    root: set.root.toString(),
    totalDeposits: set.stats.totalDeposits,
  };
}

/**
 * Remove a commitment from an association set (flagged as malicious)
 */
export async function removeCommitment(setId, commitment, reason) {
  const set = associationSetData.get(setId);
  if (!set) {
    throw new Error(`Association set ${setId} not found`);
  }

  const commitmentBigInt = BigInt(commitment);
  const index = set.commitments.findIndex(c => c === commitmentBigInt);

  if (index === -1) {
    return { removed: false, reason: 'Not in set' };
  }

  // Remove commitment
  set.commitments.splice(index, 1);

  // Rebuild tree
  set.tree = await buildMerkleTree(set.commitments);
  set.root = getMerkleRoot(set.tree);
  set.lastUpdated = Date.now();
  set.stats.totalDeposits--;
  set.stats.removedLast24h++;

  console.log(`Removed commitment from set ${setId}:`, commitment.toString().slice(0, 20) + '...', 'Reason:', reason);

  return {
    removed: true,
    setId,
    reason,
    root: set.root.toString(),
    totalDeposits: set.stats.totalDeposits,
  };
}

/**
 * Get proof that a commitment is in an association set
 */
export async function getProof(setId, commitment) {
  const set = associationSetData.get(setId);
  if (!set) {
    throw new Error(`Association set ${setId} not found`);
  }

  const commitmentBigInt = BigInt(commitment);
  const index = set.commitments.findIndex(c => c === commitmentBigInt);

  if (index === -1) {
    return null;
  }

  // Rebuild tree if needed
  if (!set.tree) {
    set.tree = await buildMerkleTree(set.commitments);
    set.root = getMerkleRoot(set.tree);
  }

  const { pathElements, pathIndices } = getMerkleProof(set.tree, index);

  return {
    setId,
    setName: set.name,
    root: set.root.toString(),
    pathElements: pathElements.map(e => e.toString()),
    pathIndices,
    trustLevel: set.trustLevel,
    provider: set.provider,
  };
}

/**
 * Check if commitment is in any association set
 */
export function findCommitmentSets(commitment) {
  const commitmentBigInt = BigInt(commitment);
  const results = [];

  for (const [setId, set] of associationSetData.entries()) {
    if (set.commitments.some(c => c === commitmentBigInt)) {
      results.push({
        setId,
        setName: set.name,
        trustLevel: set.trustLevel,
        provider: set.provider,
      });
    }
  }

  return results;
}

/**
 * Get all association sets metadata
 */
export function getAllSets() {
  const sets = [];
  for (const [setId, set] of associationSetData.entries()) {
    sets.push({
      id: setId,
      name: set.name,
      description: set.description,
      provider: set.provider,
      trustLevel: set.trustLevel,
      criteria: set.criteria,
      root: set.root.toString(),
      totalDeposits: set.stats.totalDeposits,
      lastUpdated: set.lastUpdated,
    });
  }
  return sets;
}

/**
 * Get specific set info
 */
export function getSet(setId) {
  const set = associationSetData.get(setId);
  if (!set) return null;

  return {
    id: setId,
    name: set.name,
    description: set.description,
    provider: set.provider,
    trustLevel: set.trustLevel,
    criteria: set.criteria,
    root: set.root.toString(),
    totalDeposits: set.stats.totalDeposits,
    lastUpdated: set.lastUpdated,
  };
}

/**
 * Simulate chain analysis verification
 * In production, this would call Chainalysis/TRM Labs APIs
 */
export async function verifyDeposit(depositAddress, commitment) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // For demo, randomly approve most deposits
  const isClean = Math.random() > 0.1;

  if (isClean) {
    // Add to verified sets
    await addCommitment(0, commitment); // ALL_VERIFIED
    await addCommitment(2, commitment); // COMMUNITY_CURATED

    // 50% chance of institutional approval
    if (Math.random() > 0.5) {
      await addCommitment(1, commitment); // INSTITUTIONAL
    }

    // 80% chance of US compliant
    if (Math.random() > 0.2) {
      await addCommitment(3, commitment); // US_COMPLIANT
    }

    // 90% chance of EU compliant
    if (Math.random() > 0.1) {
      await addCommitment(4, commitment); // EU_COMPLIANT
    }
  }

  return {
    verified: isClean,
    sets: isClean ? findCommitmentSets(commitment) : [],
    reason: isClean ? null : 'Failed chain analysis verification',
  };
}

export default {
  addCommitment,
  removeCommitment,
  getProof,
  findCommitmentSets,
  getAllSets,
  getSet,
  verifyDeposit,
  ASSOCIATION_SETS,
};
