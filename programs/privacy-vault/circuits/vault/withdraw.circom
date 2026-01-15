pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/bitify.circom";
include "./commitment.circom";

/*
 * Privacy Vault - Withdraw Circuit
 *
 * Proves:
 * 1. Knowledge of (nullifier, secret) that produces a valid commitment
 * 2. The commitment exists in the deposit Merkle tree
 * 3. Outputs nullifierHash to prevent double-spending
 *
 * Privacy guarantees:
 * - Withdrawal cannot be linked to any specific deposit
 * - Only nullifierHash is revealed (not nullifier or secret)
 * - Recipient address is public but unlinkable to deposit
 */

// Merkle Proof for Withdraw (inline to avoid path issues)
template MerkleProofWithdraw(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    signal hashes[levels + 1];
    hashes[0] <== leaf;

    component hashers[levels];

    // Declare signal arrays outside the loop
    signal left[levels];
    signal right[levels];

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);

        // If pathIndices[i] == 0, leaf is on left
        // If pathIndices[i] == 1, leaf is on right
        left[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
        right[i] <== pathElements[i] + pathIndices[i] * (hashes[i] - pathElements[i]);

        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        hashes[i + 1] <== hashers[i].out;
    }

    root <== hashes[levels];
}

template Withdraw(levels) {
    // ============ PUBLIC INPUTS ============
    // Merkle root of the deposit tree (verified on-chain)
    signal input root;

    // Nullifier hash - prevents double spending
    // This is stored on-chain after withdrawal
    signal input nullifierHash;

    // Recipient address (where funds go)
    // Included to prevent front-running
    signal input recipient;

    // Relayer address (optional, for privacy)
    signal input relayer;

    // Fee for relayer (optional)
    signal input fee;

    // ============ PRIVATE INPUTS ============
    // The secret values only the depositor knows
    signal input nullifier;
    signal input secret;

    // Merkle proof data
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // ============ CIRCUIT LOGIC ============

    // Step 1: Compute commitment from nullifier and secret
    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.secret <== secret;

    // Step 2: Verify nullifierHash matches
    nullifierHash === hasher.nullifierHash;

    // Step 3: Verify commitment exists in Merkle tree
    component merkleProof = MerkleProofWithdraw(levels);
    merkleProof.leaf <== hasher.commitment;
    for (var i = 0; i < levels; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }
    root === merkleProof.root;

    // Step 4: Add recipient and fee to circuit
    // These are included to prevent front-running attacks
    // (someone can't intercept the proof and change recipient)
    signal recipientSquare;
    signal feeSquare;
    signal relayerSquare;
    recipientSquare <== recipient * recipient;
    feeSquare <== fee * fee;
    relayerSquare <== relayer * relayer;
}

// Main component - 10 levels for browser demo (faster proof generation)
// Production would use 26 levels for Light Protocol compatibility
component main {
    public [
        root,
        nullifierHash,
        recipient,
        relayer,
        fee
    ]
} = Withdraw(10);
