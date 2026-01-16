import { FC, ReactNode, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { WalletConnectWalletAdapter } from "@solana/wallet-adapter-walletconnect";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

interface WalletProviderProps {
  children: ReactNode;
}

// Network configuration - use devnet for testing, mainnet-beta for production
const NETWORK = WalletAdapterNetwork.Devnet;

// WalletConnect Project ID - get yours at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = "e899c82be21d4acca2c8aec45e893598";

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
  // You can also use a custom RPC endpoint
  const endpoint = useMemo(() => {
    // For production, use a private RPC like Helius
    // return "https://rpc.helius.xyz/?api-key=YOUR_KEY";
    return clusterApiUrl(NETWORK);
  }, []);

  // Configure supported wallets
  // WalletConnect added for mobile browser support (Safari/Chrome on iOS)
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new WalletConnectWalletAdapter({
        network: NETWORK,
        options: {
          relayUrl: "wss://relay.walletconnect.com",
          projectId: WALLETCONNECT_PROJECT_ID,
          metadata: {
            name: "CleanProof",
            description: "Private transactions with Proof of Innocence on Solana",
            url: "https://cleanproof.xyz",
            icons: ["https://cleanproof.xyz/favicon.jpg"],
          },
        },
      }),
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
