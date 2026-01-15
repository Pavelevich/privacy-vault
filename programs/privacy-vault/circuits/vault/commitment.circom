pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Privacy Vault - Commitment Scheme
 * Based on Tornado Cash design, adapted for Solana/Light Protocol
 *
 * Commitment = Poseidon(nullifier, secret)
 *
 * The commitment is what gets stored on-chain in the Merkle tree.
 * Only the person who knows both nullifier and secret can withdraw.
 */

// Computes the commitment from nullifier and secret
template CommitmentHasher() {
    signal input nullifier;
    signal input secret;
    signal output commitment;
    signal output nullifierHash;

    // Commitment = Poseidon(nullifier, secret)
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;
    commitment <== commitmentHasher.out;

    // NullifierHash = Poseidon(nullifier)
    // This is revealed during withdrawal to prevent double-spending
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash <== nullifierHasher.out;
}

// Verifies that a commitment was correctly computed
template CommitmentVerifier() {
    signal input nullifier;
    signal input secret;
    signal input expectedCommitment;

    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.secret <== secret;

    // Verify the commitment matches
    expectedCommitment === hasher.commitment;
}
