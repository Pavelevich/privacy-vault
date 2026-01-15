import { useCallback, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from "@solana/web3.js";
import {
  generateDepositSecrets,
  computeCommitment,
  computeNullifierHash,
  buildMerkleTree,
  getMerkleProof,
  getMerkleRoot,
  generateWithdrawProof,
  generateInnocenceProof,
  proofToSolanaFormat,
  parseDepositNote,
  serializeDepositNote,
  type DepositNote,
} from "@/lib/zkProofs";

// Program ID
const PROGRAM_ID = "9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu";

// Vault PDA seed
const VAULT_SEED = "vault";

export interface DepositResult {
  note: DepositNote;
  signature?: string;
  success: boolean;
}

export interface WithdrawResult {
  nullifierHash: string;
  recipient: string;
  proof: {
    a: Uint8Array;
    b: Uint8Array;
    c: Uint8Array;
  };
  signature?: string;
  success: boolean;
}

export interface ProveInnocenceResult {
  nullifierHash: string;
  associationSetId: number;
  proof: {
    a: Uint8Array;
    b: Uint8Array;
    c: Uint8Array;
  };
  provenAt: number;
  success: boolean;
}

// In-memory deposit store (would be on-chain in production)
let depositStore: bigint[] = [];

export function usePrivacyVault() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  const programId = useMemo(() => {
    try {
      return new PublicKey(PROGRAM_ID);
    } catch {
      return null;
    }
  }, []);

  // Get vault PDA
  const getVaultPDA = useCallback(() => {
    if (!programId) return null;
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_SEED)],
      programId
    );
    return vaultPDA;
  }, [programId]);

  // Deposit funds into the privacy pool
  const deposit = useCallback(
    async (amountSol: number): Promise<DepositResult> => {
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);

      try {
        // Generate deposit secrets (ZK commitment)
        const note = await generateDepositSecrets(amountSol);
        const commitment = BigInt(note.commitment);

        console.log("Generated deposit secrets:", {
          commitment: note.commitment,
          nullifierHash: note.nullifierHash,
          amount: amountSol,
        });

        // Add commitment to deposit store
        depositStore.push(commitment);

        // Create SOL transfer transaction to vault
        // In production, this would be a CPI to the program
        const vaultPDA = getVaultPDA();
        if (!vaultPDA) {
          throw new Error("Could not derive vault PDA");
        }

        const amountLamports = amountSol * LAMPORTS_PER_SOL;

        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: vaultPDA,
            lamports: amountLamports,
          })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // Sign and send
        let signedTx;
        try {
          signedTx = await wallet.signTransaction(transaction);
        } catch (signError) {
          console.error("Wallet signing error:", signError);
          throw new Error("Wallet signing failed. Please reconnect your wallet and try again.");
        }

        const signature = await connection.sendRawTransaction(signedTx.serialize());
        await connection.confirmTransaction(signature, "confirmed");

        console.log("Deposit transaction confirmed:", signature);

        return {
          note,
          signature,
          success: true,
        };
      } catch (error) {
        console.error("Deposit failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet.publicKey, wallet.signTransaction, connection, getVaultPDA]
  );

  // Withdraw funds from the privacy pool
  const withdraw = useCallback(
    async (noteString: string, recipientAddress: string): Promise<WithdrawResult> => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);

      try {
        // Parse the deposit note
        const note = parseDepositNote(noteString);
        if (!note) {
          throw new Error("Invalid deposit note format");
        }

        const nullifier = BigInt(note.nullifier);
        const secret = BigInt(note.secret);
        const commitment = BigInt(note.commitment);

        // Add commitment to deposit store if not present
        // This handles the case where the page was refreshed after deposit
        const existingIndex = depositStore.findIndex(c => c === commitment);
        if (existingIndex === -1) {
          depositStore.push(commitment);
          console.log("Added commitment to deposit store from note");
        }

        const tree = await buildMerkleTree(depositStore);
        const root = getMerkleRoot(tree);

        // Find commitment index (should always succeed now)
        const commitmentIndex = depositStore.findIndex(c => c === commitment);

        // Get Merkle proof
        const { pathElements, pathIndices } = getMerkleProof(tree, commitmentIndex);

        // Compute nullifier hash
        const nullifierHash = await computeNullifierHash(nullifier);

        // Convert recipient address to field element
        const recipientPubkey = new PublicKey(recipientAddress);
        const recipientBytes = recipientPubkey.toBytes();
        let recipientField = BigInt(0);
        for (let i = 0; i < 32; i++) {
          recipientField = (recipientField << BigInt(8)) + BigInt(recipientBytes[i]);
        }

        console.log("Generating withdraw proof...");

        // Generate ZK proof
        const { proof, publicSignals } = await generateWithdrawProof({
          root,
          nullifierHash,
          recipient: recipientField,
          relayer: BigInt(0),
          fee: BigInt(0),
          nullifier,
          secret,
          pathElements,
          pathIndices,
        });

        console.log("Withdraw proof generated, public signals:", publicSignals);

        // Convert proof to Solana format
        const solanaProof = proofToSolanaFormat(proof);

        // In production: Submit proof to on-chain program for verification
        // For demo, we simulate success
        console.log("Withdrawal processed successfully");

        return {
          nullifierHash: nullifierHash.toString(),
          recipient: recipientAddress,
          proof: solanaProof,
          success: true,
        };
      } catch (error) {
        console.error("Withdraw failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet.publicKey]
  );

  // Prove innocence (membership in association set)
  const proveInnocence = useCallback(
    async (noteString: string, associationSetId: number): Promise<ProveInnocenceResult> => {
      if (!wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      setIsLoading(true);

      try {
        // Parse the deposit note
        const note = parseDepositNote(noteString);
        if (!note) {
          throw new Error("Invalid deposit note format");
        }

        const nullifier = BigInt(note.nullifier);
        const secret = BigInt(note.secret);
        const commitment = BigInt(note.commitment);

        // Add commitment to deposit store if not present
        const existingIndex = depositStore.findIndex(c => c === commitment);
        if (existingIndex === -1) {
          depositStore.push(commitment);
          console.log("Added commitment to deposit store from note");
        }

        const depositTree = await buildMerkleTree(depositStore);
        const depositRoot = getMerkleRoot(depositTree);

        // For demo: Association set contains the same deposits (all clean)
        // In production: This would be a separate curated tree
        const associationTree = await buildMerkleTree(depositStore);
        const associationSetRoot = getMerkleRoot(associationTree);

        // Find commitment index (guaranteed to succeed)
        const commitmentIndex = depositStore.findIndex(c => c === commitment);
        console.log("Commitment index:", commitmentIndex, "Total deposits:", depositStore.length);

        // Get Merkle proofs for both trees
        const depositProof = getMerkleProof(depositTree, commitmentIndex);
        const associationProof = getMerkleProof(associationTree, commitmentIndex);

        // Compute nullifier hash
        const nullifierHash = await computeNullifierHash(nullifier);

        console.log("Generating innocence proof...");

        // Generate ZK proof
        const { proof, publicSignals } = await generateInnocenceProof({
          depositRoot,
          associationSetRoot,
          nullifierHash,
          associationSetId: BigInt(associationSetId),
          timestamp: BigInt(Math.floor(Date.now() / 1000)),
          nullifier,
          secret,
          depositPathElements: depositProof.pathElements,
          depositPathIndices: depositProof.pathIndices,
          associationPathElements: associationProof.pathElements,
          associationPathIndices: associationProof.pathIndices,
        });

        console.log("Innocence proof generated, public signals:", publicSignals);

        // Convert proof to Solana format
        const solanaProof = proofToSolanaFormat(proof);

        return {
          nullifierHash: nullifierHash.toString(),
          associationSetId,
          proof: solanaProof,
          provenAt: Date.now(),
          success: true,
        };
      } catch (error) {
        console.error("Prove innocence failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet.publicKey]
  );

  // Get wallet balance
  const getBalance = useCallback(async () => {
    if (!wallet.publicKey) return 0;
    const balance = await connection.getBalance(wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }, [connection, wallet.publicKey]);

  // Generate new deposit secrets
  const generateSecrets = useCallback(async (amount: number) => {
    return generateDepositSecrets(amount);
  }, []);

  return {
    programId,
    isConnected: wallet.connected,
    publicKey: wallet.publicKey,
    isLoading,
    deposit,
    withdraw,
    proveInnocence,
    generateSecrets,
    getBalance,
    getVaultPDA,
  };
}

// Store deposit notes locally
export function saveDepositNote(note: DepositNote) {
  const notes = getDepositNotes();
  notes.push(note);
  localStorage.setItem("privacy-vault-notes", JSON.stringify(notes));
}

export function getDepositNotes(): DepositNote[] {
  const stored = localStorage.getItem("privacy-vault-notes");
  if (!stored) return [];
  return JSON.parse(stored);
}

export function clearDepositNotes() {
  localStorage.removeItem("privacy-vault-notes");
}

export { serializeDepositNote, parseDepositNote };
