/**
 * ZK Proof Generation Service
 *
 * Handles client-side proof generation using snarkjs and circomlibjs
 * for the Privacy Vault system.
 */

// Dynamic imports to avoid bundling issues
let groth16Module: typeof import("snarkjs").groth16 | null = null;
let buildPoseidonModule: typeof import("circomlibjs").buildPoseidon | null = null;

async function getGroth16() {
  if (!groth16Module) {
    const snarkjs = await import("snarkjs");
    groth16Module = snarkjs.groth16;
  }
  return groth16Module;
}

async function getBuildPoseidon() {
  if (!buildPoseidonModule) {
    const circomlibjs = await import("circomlibjs");
    buildPoseidonModule = circomlibjs.buildPoseidon;
  }
  return buildPoseidonModule;
}

type Poseidon = Awaited<ReturnType<typeof import("circomlibjs").buildPoseidon>>;

// Circuit file paths (relative to public folder)
const WITHDRAW_WASM = "/circuits/withdraw.wasm";
const WITHDRAW_ZKEY = "/circuits/withdraw_0000.zkey";
const INNOCENCE_WASM = "/circuits/innocence.wasm";
const INNOCENCE_ZKEY = "/circuits/innocence_0000.zkey";

// Merkle tree depth (10 levels for browser demo, 26 for production)
const MERKLE_TREE_DEPTH = 10;

let poseidon: Poseidon | null = null;

/**
 * Initialize Poseidon hasher (lazy initialization)
 */
async function getPoseidon(): Promise<Poseidon> {
  if (!poseidon) {
    const buildPoseidon = await getBuildPoseidon();
    poseidon = await buildPoseidon();
  }
  return poseidon;
}

/**
 * Convert a bigint to a field element (ensure it's within BN254 field)
 */
function toFieldElement(value: bigint): bigint {
  const FIELD_MODULUS = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  return value % FIELD_MODULUS;
}

/**
 * Generate random field element for nullifier or secret
 */
export function generateRandomFieldElement(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let value = BigInt(0);
  for (let i = 0; i < 32; i++) {
    value = (value << BigInt(8)) + BigInt(bytes[i]);
  }
  return toFieldElement(value);
}

/**
 * Compute commitment = Poseidon(nullifier, secret)
 */
export async function computeCommitment(nullifier: bigint, secret: bigint): Promise<bigint> {
  const poseidonHash = await getPoseidon();
  const hash = poseidonHash([nullifier, secret]);
  return poseidonHash.F.toObject(hash);
}

/**
 * Compute nullifier hash = Poseidon(nullifier)
 */
export async function computeNullifierHash(nullifier: bigint): Promise<bigint> {
  const poseidonHash = await getPoseidon();
  const hash = poseidonHash([nullifier]);
  return poseidonHash.F.toObject(hash);
}

/**
 * Generate a simple Merkle tree from commitments
 * Returns the tree layers (leaves to root)
 */
export async function buildMerkleTree(commitments: bigint[]): Promise<bigint[][]> {
  const poseidonHash = await getPoseidon();

  // Pad to power of 2
  const size = Math.pow(2, MERKLE_TREE_DEPTH);
  const paddedLeaves = [...commitments];
  while (paddedLeaves.length < size) {
    paddedLeaves.push(BigInt(0));
  }

  const tree: bigint[][] = [paddedLeaves];

  // Build tree layers
  for (let level = 0; level < MERKLE_TREE_DEPTH; level++) {
    const currentLevel = tree[level];
    const nextLevel: bigint[] = [];

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
 * Get Merkle proof for a leaf at given index
 */
export function getMerkleProof(tree: bigint[][], leafIndex: number): {
  pathElements: bigint[];
  pathIndices: number[];
} {
  const pathElements: bigint[] = [];
  const pathIndices: number[] = [];

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
 * Get Merkle root from tree
 */
export function getMerkleRoot(tree: bigint[][]): bigint {
  return tree[tree.length - 1][0];
}

/**
 * Deposit note containing all secrets needed for withdrawal
 */
export interface DepositNote {
  nullifier: string;
  secret: string;
  commitment: string;
  nullifierHash: string;
  amount: number;
  timestamp: number;
}

/**
 * Generate secrets for a new deposit
 */
export async function generateDepositSecrets(amount: number): Promise<DepositNote> {
  const nullifier = generateRandomFieldElement();
  const secret = generateRandomFieldElement();
  const commitment = await computeCommitment(nullifier, secret);
  const nullifierHash = await computeNullifierHash(nullifier);

  return {
    nullifier: nullifier.toString(),
    secret: secret.toString(),
    commitment: commitment.toString(),
    nullifierHash: nullifierHash.toString(),
    amount,
    timestamp: Date.now(),
  };
}

/**
 * Withdraw proof inputs
 */
export interface WithdrawProofInput {
  // Public inputs
  root: bigint;
  nullifierHash: bigint;
  recipient: bigint;
  relayer: bigint;
  fee: bigint;
  // Private inputs
  nullifier: bigint;
  secret: bigint;
  pathElements: bigint[];
  pathIndices: number[];
}

/**
 * Generate a withdraw proof
 */
export async function generateWithdrawProof(input: WithdrawProofInput): Promise<{
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
}> {
  const circuitInputs = {
    root: input.root.toString(),
    nullifierHash: input.nullifierHash.toString(),
    recipient: input.recipient.toString(),
    relayer: input.relayer.toString(),
    fee: input.fee.toString(),
    nullifier: input.nullifier.toString(),
    secret: input.secret.toString(),
    pathElements: input.pathElements.map(e => e.toString()),
    pathIndices: input.pathIndices,
  };

  console.log("Generating withdraw proof...");
  console.time("Withdraw proof generation");

  const groth16 = await getGroth16();
  const { proof, publicSignals } = await groth16.fullProve(
    circuitInputs,
    WITHDRAW_WASM,
    WITHDRAW_ZKEY
  );

  console.timeEnd("Withdraw proof generation");
  console.log("Withdraw proof generated successfully");

  return { proof, publicSignals };
}

/**
 * Innocence proof inputs
 */
export interface InnocenceProofInput {
  // Public inputs
  depositRoot: bigint;
  associationSetRoot: bigint;
  nullifierHash: bigint;
  associationSetId: bigint;
  timestamp: bigint;
  // Private inputs
  nullifier: bigint;
  secret: bigint;
  depositPathElements: bigint[];
  depositPathIndices: number[];
  associationPathElements: bigint[];
  associationPathIndices: number[];
}

/**
 * Generate a proof of innocence
 */
export async function generateInnocenceProof(input: InnocenceProofInput): Promise<{
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
  };
  publicSignals: string[];
}> {
  const circuitInputs = {
    depositRoot: input.depositRoot.toString(),
    associationSetRoot: input.associationSetRoot.toString(),
    nullifierHash: input.nullifierHash.toString(),
    associationSetId: input.associationSetId.toString(),
    timestamp: input.timestamp.toString(),
    nullifier: input.nullifier.toString(),
    secret: input.secret.toString(),
    depositPathElements: input.depositPathElements.map(e => e.toString()),
    depositPathIndices: input.depositPathIndices,
    associationPathElements: input.associationPathElements.map(e => e.toString()),
    associationPathIndices: input.associationPathIndices,
  };

  console.log("Generating innocence proof...");
  console.time("Innocence proof generation");

  const groth16 = await getGroth16();
  const { proof, publicSignals } = await groth16.fullProve(
    circuitInputs,
    INNOCENCE_WASM,
    INNOCENCE_ZKEY
  );

  console.timeEnd("Innocence proof generation");
  console.log("Innocence proof generated successfully");

  return { proof, publicSignals };
}

/**
 * Convert proof to Solana format (compressed points)
 */
export function proofToSolanaFormat(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}): {
  a: Uint8Array;
  b: Uint8Array;
  c: Uint8Array;
} {
  // Convert G1 point (pi_a) to compressed format
  const a = compressG1Point(
    BigInt(proof.pi_a[0]),
    BigInt(proof.pi_a[1])
  );

  // Convert G2 point (pi_b) to compressed format
  const b = compressG2Point(
    BigInt(proof.pi_b[0][0]),
    BigInt(proof.pi_b[0][1]),
    BigInt(proof.pi_b[1][0]),
    BigInt(proof.pi_b[1][1])
  );

  // Convert G1 point (pi_c) to compressed format
  const c = compressG1Point(
    BigInt(proof.pi_c[0]),
    BigInt(proof.pi_c[1])
  );

  return { a, b, c };
}

/**
 * Compress G1 point to 32 bytes
 */
function compressG1Point(x: bigint, y: bigint): Uint8Array {
  const FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
  const bytes = new Uint8Array(32);

  // Convert x to bytes (big-endian)
  let temp = x;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(temp & BigInt(0xff));
    temp = temp >> BigInt(8);
  }

  // Set high bit if y > p/2
  if (y > FIELD_MODULUS / BigInt(2)) {
    bytes[0] |= 0x80;
  }

  return bytes;
}

/**
 * Compress G2 point to 64 bytes
 */
function compressG2Point(x1: bigint, x2: bigint, y1: bigint, y2: bigint): Uint8Array {
  const FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
  const bytes = new Uint8Array(64);

  // Convert x2 to first 32 bytes (big-endian)
  let temp = x2;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(temp & BigInt(0xff));
    temp = temp >> BigInt(8);
  }

  // Convert x1 to next 32 bytes (big-endian)
  temp = x1;
  for (let i = 63; i >= 32; i--) {
    bytes[i] = Number(temp & BigInt(0xff));
    temp = temp >> BigInt(8);
  }

  // Set high bit based on y2 (or y1 if y2 == 0)
  const yForSign = y2 !== BigInt(0) ? y2 : y1;
  if (yForSign > FIELD_MODULUS / BigInt(2)) {
    bytes[0] |= 0x80;
  }

  return bytes;
}

/**
 * Parse a deposit note from JSON string
 */
export function parseDepositNote(noteString: string): DepositNote | null {
  try {
    const parsed = JSON.parse(noteString);
    if (parsed.nullifier && parsed.secret && parsed.commitment) {
      return parsed as DepositNote;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Serialize deposit note to JSON string
 */
export function serializeDepositNote(note: DepositNote): string {
  return JSON.stringify(note, null, 2);
}
