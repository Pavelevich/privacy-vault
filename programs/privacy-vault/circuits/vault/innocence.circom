pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./commitment.circom";

/*
 * Privacy Vault - Proof of Innocence Circuit
 *
 * Based on Vitalik Buterin's Privacy Pools paper:
 * "Blockchain Privacy and Regulatory Compliance: Towards a Practical Equilibrium"
 * https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364
 *
 * This circuit proves:
 * 1. User has a valid deposit in the main deposit tree
 * 2. User's deposit is ALSO in an "association set" of approved deposits
 * 3. Without revealing WHICH specific deposit is theirs
 *
 * Association Sets:
 * - Curated Merkle trees of "clean" deposits
 * - Maintained by trusted attestors or on-chain analysis
 * - Examples: "All deposits not from OFAC addresses"
 *            "Deposits from KYC'd entities"
 *            "Deposits verified by Chainalysis"
 *
 * Privacy Properties:
 * - Proves "I'm not a bad actor" without revealing identity
 * - Enables compliance without sacrificing privacy
 * - User chooses which association set to prove membership in
 */

// Merkle Proof for Innocence (inline to avoid path issues)
template MerkleProofInnocence(levels) {
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

        left[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
        right[i] <== pathElements[i] + pathIndices[i] * (hashes[i] - pathElements[i]);

        hashers[i].inputs[0] <== left[i];
        hashers[i].inputs[1] <== right[i];
        hashes[i + 1] <== hashers[i].out;
    }

    root <== hashes[levels];
}

template ProofOfInnocence(levels) {
    // ============ PUBLIC INPUTS ============

    // Root of the main deposit Merkle tree
    signal input depositRoot;

    // Root of the association set Merkle tree
    // This represents "approved" or "clean" deposits
    signal input associationSetRoot;

    // Nullifier hash (same as in withdraw, links to a specific deposit)
    signal input nullifierHash;

    // Association set identifier (which set are we proving membership in)
    signal input associationSetId;

    // Timestamp or block number (proves the set was valid at this time)
    signal input timestamp;

    // ============ PRIVATE INPUTS ============

    // The secret values
    signal input nullifier;
    signal input secret;

    // Merkle proof for main deposit tree
    signal input depositPathElements[levels];
    signal input depositPathIndices[levels];

    // Merkle proof for association set tree
    signal input associationPathElements[levels];
    signal input associationPathIndices[levels];

    // ============ CIRCUIT LOGIC ============

    // Step 1: Compute commitment from secrets
    component hasher = CommitmentHasher();
    hasher.nullifier <== nullifier;
    hasher.secret <== secret;

    // Step 2: Verify nullifierHash matches
    nullifierHash === hasher.nullifierHash;

    // Step 3: Verify commitment exists in MAIN deposit tree
    component depositProof = MerkleProofInnocence(levels);
    depositProof.leaf <== hasher.commitment;
    for (var i = 0; i < levels; i++) {
        depositProof.pathElements[i] <== depositPathElements[i];
        depositProof.pathIndices[i] <== depositPathIndices[i];
    }
    depositRoot === depositProof.root;

    // Step 4: Verify commitment exists in ASSOCIATION SET tree
    // This is the key innovation - same commitment must exist in both trees
    component associationProof = MerkleProofInnocence(levels);
    associationProof.leaf <== hasher.commitment;
    for (var i = 0; i < levels; i++) {
        associationProof.pathElements[i] <== associationPathElements[i];
        associationProof.pathIndices[i] <== associationPathIndices[i];
    }
    associationSetRoot === associationProof.root;

    // Step 5: Bind to association set ID and timestamp
    // Prevents proof from being reused with different parameters
    signal associationSetIdSquare;
    signal timestampSquare;
    associationSetIdSquare <== associationSetId * associationSetId;
    timestampSquare <== timestamp * timestamp;
}

// Main component - 10 levels for browser demo (faster proof generation)
// Production would use 26 levels for Light Protocol compatibility
component main {
    public [
        depositRoot,
        associationSetRoot,
        nullifierHash,
        associationSetId,
        timestamp
    ]
} = ProofOfInnocence(10);

/*
 * USAGE EXAMPLE:
 *
 * 1. User makes a deposit (commitment added to main tree)
 * 2. Attestor adds commitment to "clean" association set
 * 3. User generates proof of innocence:
 *    - Proves deposit in main tree
 *    - Proves deposit in association set
 *    - Neither proof reveals WHICH deposit
 * 4. Verifier sees:
 *    - User has valid deposit
 *    - User's deposit is "approved"
 *    - No idea which specific deposit
 *
 * ASSOCIATION SET TYPES:
 *
 * 1. "All Clean" - All deposits except known bad actors
 *    - Maintained by chain analysis providers
 *    - Most inclusive, easiest to prove
 *
 * 2. "Institutional" - Only KYC'd entities
 *    - Maintained by compliance providers
 *    - Required for some institutional interactions
 *
 * 3. "Custom" - User-defined or DAO-governed
 *    - Community-maintained lists
 *    - Flexible for various use cases
 */
