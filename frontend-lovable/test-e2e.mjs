/**
 * End-to-end test for Privacy Vault ZK proofs
 * Run with: node test-e2e.mjs
 */

import * as snarkjs from "snarkjs";
import { buildPoseidon } from "circomlibjs";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const { groth16, zKey } = snarkjs;

const WITHDRAW_WASM = "./public/circuits/withdraw.wasm";
const WITHDRAW_ZKEY = "./public/circuits/withdraw_0000.zkey";
const INNOCENCE_WASM = "./public/circuits/innocence.wasm";
const INNOCENCE_ZKEY = "./public/circuits/innocence_0000.zkey";
const MERKLE_TREE_DEPTH = 10;

let poseidon = null;

async function getPoseidon() {
  if (!poseidon) {
    poseidon = await buildPoseidon();
  }
  return poseidon;
}

function toFieldElement(value) {
  const FIELD_MODULUS = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  return value % FIELD_MODULUS;
}

function generateRandomFieldElement() {
  const bytes = crypto.randomBytes(32);
  let value = BigInt(0);
  for (let i = 0; i < 32; i++) {
    value = (value << BigInt(8)) + BigInt(bytes[i]);
  }
  return toFieldElement(value);
}

async function computeCommitment(nullifier, secret) {
  const poseidonHash = await getPoseidon();
  const hash = poseidonHash([nullifier, secret]);
  return poseidonHash.F.toObject(hash);
}

async function computeNullifierHash(nullifier) {
  const poseidonHash = await getPoseidon();
  const hash = poseidonHash([nullifier]);
  return poseidonHash.F.toObject(hash);
}

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

function getMerkleRoot(tree) {
  return tree[tree.length - 1][0];
}

async function testWithdrawProof() {
  console.log("\n=== Testing Withdraw Proof ===\n");

  // Generate deposit secrets
  const nullifier = generateRandomFieldElement();
  const secret = generateRandomFieldElement();
  const commitment = await computeCommitment(nullifier, secret);
  const nullifierHash = await computeNullifierHash(nullifier);

  console.log("Generated secrets:");
  console.log("  Nullifier:", nullifier.toString().slice(0, 20) + "...");
  console.log("  Secret:", secret.toString().slice(0, 20) + "...");
  console.log("  Commitment:", commitment.toString().slice(0, 20) + "...");

  // Build Merkle tree with this deposit
  const deposits = [commitment];
  const tree = await buildMerkleTree(deposits);
  const root = getMerkleRoot(tree);

  // Get Merkle proof
  const { pathElements, pathIndices } = getMerkleProof(tree, 0);

  // Random recipient
  const recipient = generateRandomFieldElement();

  const circuitInputs = {
    root: root.toString(),
    nullifierHash: nullifierHash.toString(),
    recipient: recipient.toString(),
    relayer: "0",
    fee: "0",
    nullifier: nullifier.toString(),
    secret: secret.toString(),
    pathElements: pathElements.map(e => e.toString()),
    pathIndices: pathIndices,
  };

  console.log("\nGenerating withdraw proof...");
  const startTime = Date.now();

  try {
    const { proof, publicSignals } = await groth16.fullProve(
      circuitInputs,
      WITHDRAW_WASM,
      WITHDRAW_ZKEY
    );

    const proofTime = Date.now() - startTime;
    console.log(`Proof generated in ${proofTime}ms`);

    // Verify proof locally
    console.log("\nVerifying proof locally...");
    const vkeyPath = "./public/circuits/withdraw_verification_key.json";

    let vkey;
    if (fs.existsSync(vkeyPath)) {
      vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
    } else {
      // Export vkey from zkey
      vkey = await zKey.exportVerificationKey(WITHDRAW_ZKEY);
    }

    const verified = await groth16.verify(vkey, publicSignals, proof);
    console.log("Proof verified:", verified ? "✓ VALID" : "✗ INVALID");

    console.log("\nPublic signals:");
    console.log("  Root:", publicSignals[0].slice(0, 20) + "...");
    console.log("  NullifierHash:", publicSignals[1].slice(0, 20) + "...");
    console.log("  Recipient:", publicSignals[2].slice(0, 20) + "...");

    return verified;
  } catch (error) {
    console.error("Error generating/verifying proof:", error.message);
    return false;
  }
}

async function testInnocenceProof() {
  console.log("\n=== Testing Innocence Proof ===\n");

  // Generate deposit secrets
  const nullifier = generateRandomFieldElement();
  const secret = generateRandomFieldElement();
  const commitment = await computeCommitment(nullifier, secret);
  const nullifierHash = await computeNullifierHash(nullifier);

  console.log("Generated secrets:");
  console.log("  Commitment:", commitment.toString().slice(0, 20) + "...");

  // Build deposit Merkle tree
  const deposits = [commitment];
  const depositTree = await buildMerkleTree(deposits);
  const depositRoot = getMerkleRoot(depositTree);

  // Build association set tree (same deposits for demo)
  const associationTree = await buildMerkleTree(deposits);
  const associationSetRoot = getMerkleRoot(associationTree);

  // Get Merkle proofs
  const depositProof = getMerkleProof(depositTree, 0);
  const associationProof = getMerkleProof(associationTree, 0);

  const circuitInputs = {
    depositRoot: depositRoot.toString(),
    associationSetRoot: associationSetRoot.toString(),
    nullifierHash: nullifierHash.toString(),
    associationSetId: "1",
    timestamp: Math.floor(Date.now() / 1000).toString(),
    nullifier: nullifier.toString(),
    secret: secret.toString(),
    depositPathElements: depositProof.pathElements.map(e => e.toString()),
    depositPathIndices: depositProof.pathIndices,
    associationPathElements: associationProof.pathElements.map(e => e.toString()),
    associationPathIndices: associationProof.pathIndices,
  };

  console.log("\nGenerating innocence proof...");
  const startTime = Date.now();

  try {
    const { proof, publicSignals } = await groth16.fullProve(
      circuitInputs,
      INNOCENCE_WASM,
      INNOCENCE_ZKEY
    );

    const proofTime = Date.now() - startTime;
    console.log(`Proof generated in ${proofTime}ms`);

    // Verify proof locally
    console.log("\nVerifying proof locally...");
    const vkeyPath = "./public/circuits/innocence_verification_key.json";

    let vkey;
    if (fs.existsSync(vkeyPath)) {
      vkey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"));
    } else {
      vkey = await zKey.exportVerificationKey(INNOCENCE_ZKEY);
    }

    const verified = await groth16.verify(vkey, publicSignals, proof);
    console.log("Proof verified:", verified ? "✓ VALID" : "✗ INVALID");

    console.log("\nPublic signals:");
    console.log("  DepositRoot:", publicSignals[0].slice(0, 20) + "...");
    console.log("  AssociationSetRoot:", publicSignals[1].slice(0, 20) + "...");
    console.log("  NullifierHash:", publicSignals[2].slice(0, 20) + "...");
    console.log("  AssociationSetId:", publicSignals[3]);
    console.log("  Timestamp:", publicSignals[4]);

    return verified;
  } catch (error) {
    console.error("Error generating/verifying proof:", error.message);
    return false;
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════════╗");
  console.log("║          Privacy Vault - End-to-End ZK Proof Test             ║");
  console.log("╚═══════════════════════════════════════════════════════════════╝");

  // Check circuit files exist
  const files = [WITHDRAW_WASM, WITHDRAW_ZKEY, INNOCENCE_WASM, INNOCENCE_ZKEY];
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.error(`Missing circuit file: ${file}`);
      process.exit(1);
    }
  }
  console.log("✓ All circuit files found");

  const withdrawOk = await testWithdrawProof();
  const innocenceOk = await testInnocenceProof();

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("RESULTS:");
  console.log(`  Withdraw Proof:   ${withdrawOk ? "✓ PASS" : "✗ FAIL"}`);
  console.log(`  Innocence Proof:  ${innocenceOk ? "✓ PASS" : "✗ FAIL"}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (withdrawOk && innocenceOk) {
    console.log("All tests passed! ZK proofs are working correctly.\n");
    process.exit(0);
  } else {
    console.log("Some tests failed.\n");
    process.exit(1);
  }
}

main().catch(console.error);
