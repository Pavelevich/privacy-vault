import { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ChevronDown, LogOut, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo.jpg";

interface HeaderProps {
  isConnected: boolean;
  walletAddress: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const Header = ({ isConnected, walletAddress, onConnect, onDisconnect }: HeaderProps) => {
  const [copied, setCopied] = useState(false);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-background/60 backdrop-blur-xl border-b border-border/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <a
          href="https://dexscreener.com/solana/8i51xnnpgakaj4g4nddmqh95v4fkaxw8mhtarokd9te8"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <img src={logo} alt="Tetsuo" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">Tetsuo Privacy Vault</span>
        </a>

        {/* Wallet Button */}
        {isConnected ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card"
              >
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                {truncateAddress(walletAddress)}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 glass-card">
              <DropdownMenuItem onClick={copyAddress} className="cursor-pointer">
                {copied ? <Check className="mr-2 h-4 w-4 text-success" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copied!" : "Copy Address"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDisconnect} className="cursor-pointer text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={onConnect}
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary/90 glow-button uppercase font-semibold tracking-wide text-xs sm:text-sm sm:gap-2 px-3 sm:px-4 h-9 sm:h-10"
            >
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </Button>
          </motion.div>
        )}
      </div>
    </header>
  );
};
