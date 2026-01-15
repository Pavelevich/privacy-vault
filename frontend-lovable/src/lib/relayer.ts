/**
 * Relayer Service
 *
 * Enables private withdrawals by having a third party submit transactions.
 * The relayer pays gas fees and gets reimbursed from the withdrawal amount.
 *
 * This breaks the link between withdrawal recipient and transaction payer,
 * providing maximum privacy.
 */

// Relayer configuration - connect to local relayer in dev, production in prod
const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

export const RELAYER_CONFIG = {
  endpoint: isDev ? "http://localhost:3001" : "https://relayer.tetsuo.ai",
  feePercent: 0.5,           // 0.5% fee
  minFee: 0.001,             // Minimum 0.001 SOL fee
  maxFee: 1,                 // Maximum 1 SOL fee
  timeout: 60000,            // 60 second timeout
  retries: 3,
};

export interface RelayerInfo {
  relayerAddress: string;
  programId: string;
  feePercent: number;
  minFee: number;
  maxFee: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  balance: number;
  available: boolean;
}

export interface RelayerJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  recipient: string;
  amount: number;
  fee: number;
  netAmount: number;
  proof?: {
    a: number[];
    b: number[];
    c: number[];
  };
  nullifierHash?: string;
  root?: string;
  createdAt: number;
  completedAt?: number;
  signature?: string;
  error?: string;
}

export interface RelayerStatus {
  online: boolean;
  queueLength: number;
  avgProcessingTime: number;
  balance: number;
}

/**
 * Calculate relayer fee for a given withdrawal amount
 */
export function calculateRelayerFee(amountSol: number): number {
  const percentFee = amountSol * (RELAYER_CONFIG.feePercent / 100);
  return Math.min(
    Math.max(percentFee, RELAYER_CONFIG.minFee),
    RELAYER_CONFIG.maxFee
  );
}

/**
 * Get relayer info from the service
 */
export async function getRelayerInfo(): Promise<RelayerInfo | null> {
  try {
    const response = await fetch(`${RELAYER_CONFIG.endpoint}/api/info`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch relayer info');
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get relayer info:', error);
    return null;
  }
}

/**
 * Check relayer service status
 */
export async function checkRelayerStatus(): Promise<RelayerStatus> {
  try {
    const response = await fetch(`${RELAYER_CONFIG.endpoint}/health`, {
      method: 'GET',
    });

    if (!response.ok) {
      return { online: false, queueLength: 0, avgProcessingTime: 0, balance: 0 };
    }

    const info = await getRelayerInfo();

    return {
      online: true,
      queueLength: 0,
      avgProcessingTime: 15000,
      balance: info?.balance || 0,
    };
  } catch {
    return {
      online: false,
      queueLength: 0,
      avgProcessingTime: 0,
      balance: 0,
    };
  }
}

/**
 * Calculate fee from relayer API
 */
export async function getRelayerFee(amountSol: number): Promise<{
  amount: number;
  fee: number;
  netAmount: number;
  feePercent: number;
}> {
  try {
    const response = await fetch(`${RELAYER_CONFIG.endpoint}/api/fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountSol }),
    });

    if (!response.ok) {
      throw new Error('Failed to calculate fee');
    }

    return await response.json();
  } catch {
    // Fallback to local calculation
    const fee = calculateRelayerFee(amountSol);
    return {
      amount: amountSol,
      fee,
      netAmount: amountSol - fee,
      feePercent: RELAYER_CONFIG.feePercent,
    };
  }
}

/**
 * Submit withdrawal to relayer
 */
export async function submitToRelayer(
  proof: { a: Uint8Array; b: Uint8Array; c: Uint8Array },
  publicSignals: string[],
  recipient: string,
  amount: number
): Promise<RelayerJob> {
  try {
    const response = await fetch(`${RELAYER_CONFIG.endpoint}/api/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proof: {
          a: Array.from(proof.a),
          b: Array.from(proof.b),
          c: Array.from(proof.c),
        },
        publicSignals,
        recipient,
        amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit withdrawal');
    }

    const result = await response.json();

    return {
      id: result.jobId,
      status: result.status,
      recipient,
      amount,
      fee: result.fee,
      netAmount: result.netAmount,
      createdAt: Date.now(),
    };
  } catch (error) {
    console.error('Failed to submit to relayer:', error);
    throw error;
  }
}

/**
 * Check job status
 */
export async function checkJobStatus(jobId: string): Promise<RelayerJob | null> {
  try {
    const response = await fetch(`${RELAYER_CONFIG.endpoint}/api/status/${jobId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Poll for job completion
 */
export async function waitForJobCompletion(
  jobId: string,
  onStatusUpdate?: (status: RelayerJob["status"]) => void
): Promise<RelayerJob> {
  const maxAttempts = 30;
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const job = await checkJobStatus(jobId);

    if (job) {
      onStatusUpdate?.(job.status);

      if (job.status === "completed" || job.status === "failed") {
        return job;
      }
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error("Job timed out waiting for confirmation");
}

/**
 * Get recent withdrawals from relayer (for transparency)
 */
export async function getRecentWithdrawals(limit: number = 10): Promise<{
  count: number;
  withdrawals: Array<{
    amount: number;
    fee: number;
    signature: string;
    completedAt: number;
  }>;
}> {
  try {
    const response = await fetch(`${RELAYER_CONFIG.endpoint}/api/withdrawals?limit=${limit}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return { count: 0, withdrawals: [] };
    }

    return await response.json();
  } catch {
    return { count: 0, withdrawals: [] };
  }
}

/**
 * Estimate gas cost for direct withdrawal (without relayer)
 */
export function estimateDirectGasCost(): number {
  return 0.000005; // ~5000 lamports
}

/**
 * Compare costs: relayer vs direct
 */
export function compareCosts(amountSol: number): {
  relayerFee: number;
  directGas: number;
  relayerTotal: number;
  directTotal: number;
  recommendation: "relayer" | "direct";
  privacyNote: string;
} {
  const relayerFee = calculateRelayerFee(amountSol);
  const directGas = estimateDirectGasCost();

  const relayerTotal = amountSol - relayerFee;
  const directTotal = amountSol - directGas;

  return {
    relayerFee,
    directGas,
    relayerTotal,
    directTotal,
    recommendation: "relayer",
    privacyNote: "Relayer provides maximum privacy by hiding the transaction payer",
  };
}
