import { useCallback } from "react";
import { motion } from "framer-motion";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import { Starfield } from "@/components/Starfield";
import { Header } from "@/components/Header";
import { BridgeWidget } from "@/components/BridgeWidget";
import { Partners } from "@/components/Partners";
import { StatusBar } from "@/components/StatusBar";
const Index = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const walletAddress = publicKey?.toBase58() || "";

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return <div className="min-h-screen min-h-[100dvh] bg-background relative overflow-hidden">
      {/* Starfield Background */}
      <Starfield />

      {/* Header */}
      <Header isConnected={connected} walletAddress={walletAddress} onConnect={handleConnect} onDisconnect={handleDisconnect} />

      {/* Main Content */}
      <main className="relative z-10 min-h-screen min-h-[100dvh] flex flex-col items-center justify-start sm:justify-center px-3 sm:px-4 pt-20 sm:pt-20 pb-20 sm:pb-24">
        {/* Hero Text - Hidden on mobile for app-like experience */}
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5
      }} className="hidden sm:block text-center mb-8 px-2">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-tight">
            HIDE TRANSACTIONS. PROVE INNOCENCE.
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Prove your funds are clean — without revealing your deposit.
          </p>
        </motion.div>

        {/* Bridge Widget */}
        <BridgeWidget isConnected={connected} walletAddress={walletAddress} onConnect={handleConnect} />

        {/* Partners Section */}
        <Partners />
      </main>

      {/* Status Bar */}
      <StatusBar />
    </div>;
};
export default Index;