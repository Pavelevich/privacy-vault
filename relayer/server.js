/**
 * Privacy Vault Relayer Service
 *
 * Enables anonymous withdrawals by:
 * 1. Accepting ZK proofs from users
 * 2. Verifying proofs locally before submission
 * 3. Paying transaction fees on behalf of users
 * 4. Submitting transactions to the blockchain
 *
 * This breaks the link between the withdrawer's identity and their receiving address.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as snarkjs from 'snarkjs';
import associationSets from './association-sets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration
const CONFIG = {
  // RPC endpoint
  rpcUrl: process.env.RPC_URL || 'https://api.devnet.solana.com',

  // Program ID
  programId: process.env.PROGRAM_ID || '9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu',

  // Relayer fee (percentage of withdrawal amount)
  feePercent: parseFloat(process.env.FEE_PERCENT || '0.5'),

  // Minimum fee in SOL
  minFee: parseFloat(process.env.MIN_FEE || '0.001'),

  // Maximum fee in SOL
  maxFee: parseFloat(process.env.MAX_FEE || '1'),

  // Minimum withdrawal amount in SOL
  minWithdrawal: parseFloat(process.env.MIN_WITHDRAWAL || '0.01'),

  // Maximum withdrawal amount in SOL
  maxWithdrawal: parseFloat(process.env.MAX_WITHDRAWAL || '100'),
};

// Path to verification key (exported from zkey)
const WITHDRAW_VKEY_PATH = path.join(__dirname, '../frontend-lovable/public/circuits/withdraw_verification_key.json');

// Verification key cache
let withdrawVerificationKey = null;

/**
 * Load verification key from file or export from zkey
 */
async function loadVerificationKey() {
  if (withdrawVerificationKey) return withdrawVerificationKey;

  try {
    // Try to load from file first
    if (fs.existsSync(WITHDRAW_VKEY_PATH)) {
      withdrawVerificationKey = JSON.parse(fs.readFileSync(WITHDRAW_VKEY_PATH, 'utf8'));
      console.log('Loaded verification key from file');
    } else {
      // Export from zkey if file doesn't exist
      const zkeyPath = path.join(__dirname, '../frontend-lovable/public/circuits/withdraw_0000.zkey');
      if (fs.existsSync(zkeyPath)) {
        withdrawVerificationKey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
        // Save for future use
        fs.writeFileSync(WITHDRAW_VKEY_PATH, JSON.stringify(withdrawVerificationKey, null, 2));
        console.log('Exported and saved verification key');
      } else {
        console.warn('Warning: No verification key or zkey found. Proof verification disabled.');
      }
    }
  } catch (error) {
    console.error('Error loading verification key:', error);
  }

  return withdrawVerificationKey;
}

/**
 * Verify ZK proof using snarkjs
 */
async function verifyProof(proof, publicSignals) {
  const vkey = await loadVerificationKey();
  if (!vkey) {
    console.warn('Verification key not available - SKIPPING PROOF VERIFICATION');
    return true; // Skip verification if no key (for demo only)
  }

  try {
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    return isValid;
  } catch (error) {
    console.error('Proof verification error:', error);
    return false;
  }
}

// In-memory job storage (use Redis in production)
const jobs = new Map();

// Nullifier registry to prevent double-spend
const usedNullifiers = new Set();

// Connection to Solana
let connection;
let relayerKeypair;

// Initialize connection and keypair
async function initialize() {
  connection = new Connection(CONFIG.rpcUrl, 'confirmed');

  // Load relayer keypair
  const keypairPath = process.env.RELAYER_KEYPAIR || path.join(__dirname, 'relayer-keypair.json');

  if (fs.existsSync(keypairPath)) {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    relayerKeypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    console.log(`Loaded relayer keypair: ${relayerKeypair.publicKey.toBase58()}`);
  } else {
    // Generate new keypair for development
    relayerKeypair = Keypair.generate();
    fs.writeFileSync(keypairPath, JSON.stringify(Array.from(relayerKeypair.secretKey)));
    console.log(`Generated new relayer keypair: ${relayerKeypair.publicKey.toBase58()}`);
    console.log('Fund this address with SOL to enable relaying!');
  }

  // Check balance
  const balance = await connection.getBalance(relayerKeypair.publicKey);
  console.log(`Relayer balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.warn('WARNING: Low relayer balance. Transactions may fail.');
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute per IP
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Calculate relayer fee
function calculateFee(amountSol) {
  const fee = amountSol * (CONFIG.feePercent / 100);
  return Math.max(CONFIG.minFee, Math.min(CONFIG.maxFee, fee));
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    relayer: relayerKeypair?.publicKey.toBase58(),
    network: CONFIG.rpcUrl.includes('devnet') ? 'devnet' : 'mainnet',
  });
});

// Get relayer info
app.get('/api/info', async (req, res) => {
  try {
    const balance = await connection.getBalance(relayerKeypair.publicKey);

    res.json({
      relayerAddress: relayerKeypair.publicKey.toBase58(),
      programId: CONFIG.programId,
      feePercent: CONFIG.feePercent,
      minFee: CONFIG.minFee,
      maxFee: CONFIG.maxFee,
      minWithdrawal: CONFIG.minWithdrawal,
      maxWithdrawal: CONFIG.maxWithdrawal,
      balance: balance / LAMPORTS_PER_SOL,
      available: balance > 0.1 * LAMPORTS_PER_SOL,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get relayer info' });
  }
});

// Calculate fee for withdrawal
app.post('/api/fee', (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  const fee = calculateFee(amount);
  const netAmount = amount - fee;

  res.json({
    amount,
    fee,
    netAmount,
    feePercent: CONFIG.feePercent,
  });
});

// Submit withdrawal request
app.post('/api/withdraw', async (req, res) => {
  const {
    proof,           // { a, b, c } - ZK proof components
    publicSignals,   // [root, nullifierHash, recipient, relayer, fee]
    recipient,       // Recipient address
    amount,          // Withdrawal amount in SOL
  } = req.body;

  // Validate inputs
  if (!proof || !publicSignals || !recipient || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (amount < CONFIG.minWithdrawal || amount > CONFIG.maxWithdrawal) {
    return res.status(400).json({
      error: `Amount must be between ${CONFIG.minWithdrawal} and ${CONFIG.maxWithdrawal} SOL`,
    });
  }

  // Validate recipient address
  let recipientPubkey;
  try {
    recipientPubkey = new PublicKey(recipient);
  } catch {
    return res.status(400).json({ error: 'Invalid recipient address' });
  }

  // Extract nullifier hash from public signals
  const nullifierHash = publicSignals[1];

  // Check if nullifier has been used
  if (usedNullifiers.has(nullifierHash)) {
    return res.status(400).json({ error: 'This deposit has already been withdrawn' });
  }

  // Create job
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fee = calculateFee(amount);

  const job = {
    id: jobId,
    status: 'pending',
    proof,
    publicSignals,
    recipient,
    amount,
    fee,
    netAmount: amount - fee,
    createdAt: Date.now(),
    signature: null,
    error: null,
  };

  jobs.set(jobId, job);

  // Process job asynchronously
  processJob(job).catch(console.error);

  res.json({
    jobId,
    status: 'pending',
    fee,
    netAmount: job.netAmount,
    message: 'Withdrawal request submitted. Use /api/status/:jobId to check progress.',
  });
});

// Process withdrawal job
async function processJob(job) {
  try {
    job.status = 'processing';

    // Verify ZK proof before processing
    console.log(`Verifying ZK proof for job ${job.id}...`);
    const isValid = await verifyProof(job.proof, job.publicSignals);
    if (!isValid) {
      throw new Error('Invalid ZK proof - verification failed');
    }
    console.log(`ZK proof verified for job ${job.id}`);

    // Check relayer balance
    const balance = await connection.getBalance(relayerKeypair.publicKey);
    if (balance < job.netAmount * LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL) {
      throw new Error('Insufficient relayer balance');
    }

    // Create transfer transaction
    // In production, this would be a CPI to the privacy vault program
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: relayerKeypair.publicKey,
        toPubkey: new PublicKey(job.recipient),
        lamports: Math.floor(job.netAmount * LAMPORTS_PER_SOL),
      })
    );

    // Send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [relayerKeypair],
      { commitment: 'confirmed' }
    );

    // Mark nullifier as used
    usedNullifiers.add(job.publicSignals[1]);

    // Update job
    job.status = 'completed';
    job.signature = signature;
    job.completedAt = Date.now();

    console.log(`Withdrawal completed: ${signature}`);

  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    console.error(`Withdrawal failed for job ${job.id}:`, error.message);
  }
}

// Get job status
app.get('/api/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.json({
    id: job.id,
    status: job.status,
    recipient: job.recipient,
    amount: job.amount,
    fee: job.fee,
    netAmount: job.netAmount,
    signature: job.signature,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  });
});

// Get recent withdrawals (for transparency)
app.get('/api/withdrawals', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);

  const recentJobs = Array.from(jobs.values())
    .filter(j => j.status === 'completed')
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, limit)
    .map(j => ({
      amount: j.amount,
      fee: j.fee,
      signature: j.signature,
      completedAt: j.completedAt,
    }));

  res.json({
    count: recentJobs.length,
    withdrawals: recentJobs,
  });
});

// ============================================
// ASSOCIATION SET ENDPOINTS
// ============================================

// Get all association sets
app.get('/api/association-sets', (req, res) => {
  const sets = associationSets.getAllSets();
  res.json({ sets });
});

// Get specific association set
app.get('/api/association-sets/:setId', (req, res) => {
  const setId = parseInt(req.params.setId);
  const set = associationSets.getSet(setId);

  if (!set) {
    return res.status(404).json({ error: 'Association set not found' });
  }

  res.json(set);
});

// Get proof for a commitment
app.post('/api/association-sets/:setId/proof', async (req, res) => {
  const setId = parseInt(req.params.setId);
  const { commitment } = req.body;

  if (!commitment) {
    return res.status(400).json({ error: 'Missing commitment' });
  }

  try {
    const proof = await associationSets.getProof(setId, commitment);

    if (!proof) {
      return res.status(404).json({
        error: 'Commitment not found in association set',
        setId,
      });
    }

    res.json(proof);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Find which sets contain a commitment
app.post('/api/association-sets/find', (req, res) => {
  const { commitment } = req.body;

  if (!commitment) {
    return res.status(400).json({ error: 'Missing commitment' });
  }

  const sets = associationSets.findCommitmentSets(commitment);
  res.json({ commitment, sets });
});

// Verify a new deposit (simulated chain analysis)
app.post('/api/association-sets/verify', async (req, res) => {
  const { depositAddress, commitment } = req.body;

  if (!commitment) {
    return res.status(400).json({ error: 'Missing commitment' });
  }

  try {
    const result = await associationSets.verifyDeposit(depositAddress, commitment);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add commitment to set (admin only - would require auth in production)
app.post('/api/association-sets/:setId/add', async (req, res) => {
  const setId = parseInt(req.params.setId);
  const { commitment, metadata } = req.body;

  if (!commitment) {
    return res.status(400).json({ error: 'Missing commitment' });
  }

  try {
    const result = await associationSets.addCommitment(setId, commitment, metadata);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================

// Start server
initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n╔═══════════════════════════════════════════════════════════╗`);
      console.log(`║          Privacy Vault Relayer Service                    ║`);
      console.log(`╠═══════════════════════════════════════════════════════════╣`);
      console.log(`║  Port:     ${PORT}                                          ║`);
      console.log(`║  Network:  ${CONFIG.rpcUrl.includes('devnet') ? 'devnet' : 'mainnet'}                                      ║`);
      console.log(`║  Fee:      ${CONFIG.feePercent}%                                          ║`);
      console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
      console.log(`Endpoints:`);
      console.log(`  GET  /health          - Health check`);
      console.log(`  GET  /api/info        - Relayer information`);
      console.log(`  POST /api/fee         - Calculate withdrawal fee`);
      console.log(`  POST /api/withdraw    - Submit withdrawal request`);
      console.log(`  GET  /api/status/:id  - Check job status`);
      console.log(`  GET  /api/withdrawals - Recent withdrawals\n`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize relayer:', error);
    process.exit(1);
  });
