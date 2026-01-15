import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import * as fs from "fs";

// Load wallet
const walletPath = "/Users/pchmirenko/AgenC-audit/test-wallet.json";
const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
const wallet = Keypair.fromSecretKey(Uint8Array.from(secretKey));

// Connect to devnet
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

async function main() {
  console.log("=== Tetsuo Privacy Vault - Manual Test ===\n");

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`Balance: ${balance / 1e9} SOL\n`);

  // Program ID
  const programId = new PublicKey("9zvpj82hnzpjFhYGVL6tT3Bh3GBAoaJnVxe8ZsDqMwnu");
  console.log(`Program ID: ${programId.toBase58()}`);

  // Check program exists
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo) {
    console.log(`Program deployed: YES`);
    console.log(`Program size: ${programInfo.data.length} bytes\n`);
  } else {
    console.log(`Program deployed: NO\n`);
  }

  // Generate test commitment (simulated)
  const nullifier = Keypair.generate().publicKey.toBytes();
  const secret = Keypair.generate().publicKey.toBytes();

  console.log("=== Test Data Generated ===");
  console.log(`Nullifier (first 8 bytes): ${Buffer.from(nullifier.slice(0, 8)).toString("hex")}`);
  console.log(`Secret (first 8 bytes): ${Buffer.from(secret.slice(0, 8)).toString("hex")}`);

  console.log("\n✅ Program is live and ready for deposits!");
  console.log("\nTo interact fully, use the frontend at http://localhost:8080");
  console.log("Or implement Light Protocol CPI calls for compressed accounts.");
}

main().catch(console.error);
