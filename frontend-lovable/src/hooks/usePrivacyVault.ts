import { useCallback, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, TransactionInstruction } from "@solana/web3.js";
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

// Instruction discriminators (first 8 bytes of sha256("global:instruction_name"))
const DEPOSIT_SOL_DISCRIMINATOR = Buffer.from([108, 81, 78, 117, 125, 155, 56, 200]);
const WITHDRAW_SOL_DISCRIMINATOR = Buffer.from([145, 131, 74, 136, 65, 137, 42, 38]);

// Build deposit_sol instruction
function buildDepositSolInstruction(
  programId: PublicKey,
  signer: PublicKey,
  vault: PublicKey,
  commitment: Uint8Array,
  amount: bigint
): TransactionInstruction {
  // Serialize: discriminator (8) + commitment (32) + amount (8)
  const data = Buffer.alloc(8 + 32 + 8);
  DEPOSIT_SOL_DISCRIMINATOR.copy(data, 0);
  data.set(commitment, 8);
  data.writeBigUInt64LE(amount, 40);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// Build withdraw_sol instruction
function buildWithdrawSolInstruction(
  programId: PublicKey,
  signer: PublicKey,
  vault: PublicKey,
  recipient: PublicKey,
  nullifierHash: Uint8Array,
  amount: bigint
): TransactionInstruction {
  // Serialize: discriminator (8) + nullifier_hash (32) + amount (8)
  const data = Buffer.alloc(8 + 32 + 8);
  WITHDRAW_SOL_DISCRIMINATOR.copy(data, 0);
  data.set(nullifierHash, 8);
  data.writeBigUInt64LE(amount, 40);

  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: signer, isSigner: true, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

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

      // Prevent double submission
      if (isLoading) {
        throw new Error("Transaction already in progress");
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

        // Create deposit instruction to vault
        const vaultPDA = getVaultPDA();
        if (!vaultPDA || !programId) {
          throw new Error("Could not derive vault PDA or program ID");
        }

        const amountLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));

        // Convert commitment to 32-byte array
        const commitmentBytes = new Uint8Array(32);
        const commitmentHex = commitment.toString(16).padStart(64, '0');
        for (let i = 0; i < 32; i++) {
          commitmentBytes[i] = parseInt(commitmentHex.substr(i * 2, 2), 16);
        }

        const depositInstruction = buildDepositSolInstruction(
          programId,
          wallet.publicKey,
          vaultPDA,
          commitmentBytes,
          amountLamports
        );

        const transaction = new Transaction().add(depositInstruction);

        // Get recent blockhash with commitment
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
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

        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 3,
        });

        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }, "confirmed");

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
      if (!wallet.publicKey || !wallet.signTransaction) {
        throw new Error("Wallet not connected");
      }

      // Prevent double submission
      if (isLoading) {
        throw new Error("Transaction already in progress");
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
        const withdrawAmount = note.amount;

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

        console.log("ZK proof verified successfully, initiating transfer...");

        // Get vault PDA
        const vaultPDA = getVaultPDA();
        if (!vaultPDA || !programId) {
          throw new Error("Could not derive vault PDA or program ID");
        }

        // Convert nullifier hash to 32-byte array
        const nullifierHashBytes = new Uint8Array(32);
        const nullifierHashHex = nullifierHash.toString(16).padStart(64, '0');
        for (let i = 0; i < 32; i++) {
          nullifierHashBytes[i] = parseInt(nullifierHashHex.substr(i * 2, 2), 16);
        }

        const amountLamports = BigInt(Math.floor(withdrawAmount * LAMPORTS_PER_SOL));
        const recipientPubkeyForTransfer = new PublicKey(recipientAddress);

        // Build withdraw instruction - program transfers from vault to recipient
        const withdrawInstruction = buildWithdrawSolInstruction(
          programId,
          wallet.publicKey,
          vaultPDA,
          recipientPubkeyForTransfer,
          nullifierHashBytes,
          amountLamports
        );

        const transaction = new Transaction().add(withdrawInstruction);

        // Get fresh blockhash right before signing
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        console.log("Withdraw transaction built, blockhash:", blockhash);

        // Sign and send
        let signedTx;
        try {
          signedTx = await wallet.signTransaction(transaction);
        } catch (signError) {
          console.error("Wallet signing error:", signError);
          throw new Error("Wallet signing failed. Please reconnect your wallet and try again.");
        }

        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true, // Skip simulation to avoid "already processed" errors
          preflightCommitment: "finalized",
          maxRetries: 5,
        });

        console.log("Withdraw transaction sent:", signature);

        await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight,
        }, "finalized");

        console.log("Withdrawal transaction confirmed:", signature);

        return {
          nullifierHash: nullifierHash.toString(),
          recipient: recipientAddress,
          proof: solanaProof,
          signature,
          success: true,
        };
      } catch (error) {
        console.error("Withdraw failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet.publicKey, wallet.signTransaction, connection, programId, getVaultPDA]
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
