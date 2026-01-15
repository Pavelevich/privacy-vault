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
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg">
            <img src={logo} alt="Tetsuo" className="h-full w-full object-cover" />
          </div>
          <span className="text-lg font-semibold text-foreground tracking-tight">Tetsuo Privacy Vault</span>
        </div>

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
              className="gap-2 bg-primary hover:bg-primary/90 glow-button uppercase font-semibold tracking-wide"
            >
              Connect Wallet
            </Button>
          </motion.div>
        )}
      </div>
    </header>
  );
};
