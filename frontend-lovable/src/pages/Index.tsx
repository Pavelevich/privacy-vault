import { useCallback, useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Smartphone } from "lucide-react";
import { hapticFeedback } from "@/lib/utils";

// Check if on mobile
const isMobile = () => {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// Check if Phantom is available (injected in browser)
const isPhantomAvailable = () => {
  return typeof window !== "undefined" && window.phantom?.solana?.isPhantom;
};

// Check if we're inside Phantom's browser
const isInPhantomBrowser = () => {
  return typeof window !== "undefined" &&
    (window.phantom?.solana?.isPhantom || navigator.userAgent.includes('Phantom'));
};

// Get Phantom deep link to open current URL in Phantom browser
const getPhantomBrowseLink = () => {
  const currentUrl = encodeURIComponent(window.location.href);
  return `https://phantom.app/ul/browse/${currentUrl}?ref=${currentUrl}`;
};

const Index = () => {
  const { publicKey, connected, disconnect, wallets } = useWallet();
  const { setVisible } = useWalletModal();
  const [showMobileDialog, setShowMobileDialog] = useState(false);

  const walletAddress = publicKey?.toBase58() || "";

  // Log environment for debugging
  useEffect(() => {
    console.log("[CleanProof] Environment:", {
      isMobile: isMobile(),
      isInPhantom: isInPhantomBrowser(),
      phantomAvailable: isPhantomAvailable(),
      connected,
      walletsCount: wallets.length,
      walletNames: wallets.map(w => w.adapter.name)
    });
  }, [wallets, connected]);

  const handleConnect = useCallback(() => {
    hapticFeedback('light');
    // Always show wallet modal - WalletConnect works on mobile browsers
    setVisible(true);
  }, [setVisible]);

  const handleOpenInPhantom = useCallback(() => {
    hapticFeedback('medium');
    window.location.href = getPhantomBrowseLink();
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return <div className="min-h-screen min-h-[100dvh] bg-background relative overflow-hidden">
      {/* Mobile Wallet Dialog */}
      <Dialog open={showMobileDialog} onOpenChange={setShowMobileDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Connect on Mobile
            </DialogTitle>
            <DialogDescription className="text-left">
              Safari and Chrome on iOS cannot connect directly to wallets. Tap below to open this app in Phantom where your wallet will connect automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Button
              onClick={handleOpenInPhantom}
              className="w-full h-12 bg-[#AB9FF2] hover:bg-[#9580FF] text-black font-semibold"
            >
              <img
                src="https://phantom.app/img/phantom-logo.svg"
                alt="Phantom"
                className="h-5 w-5 mr-2 invert"
              />
              Continue in Phantom App
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Don't have Phantom?{" "}
              <a
                href="https://phantom.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Download here
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>

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