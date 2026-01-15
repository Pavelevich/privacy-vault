import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

// Network configuration - use devnet for testing, mainnet-beta for production
const NETWORK = "devnet";

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  // You can also use a custom RPC endpoint
  const endpoint = useMemo(() => {
    // For production, use a private RPC like Helius
    // return "https://rpc.helius.xyz/?api-key=YOUR_KEY";
    return clusterApiUrl(NETWORK);
  }, []);

  // Configure supported wallets
  // Note: Phantom is auto-detected via Wallet Standard, no need to add explicitly
  const wallets = useMemo(
    () => [
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
