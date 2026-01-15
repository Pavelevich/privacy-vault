import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Upload,
  Shield,
  ChevronDown,
  Loader2,
  Copy,
  FileDown,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type TabType = "deposit" | "withdraw" | "prove";

interface VaultWidgetProps {
  isConnected: boolean;
  onConnect: () => void;
}

export const VaultWidget = ({ isConnected, onConnect }: VaultWidgetProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("deposit");
  const [amount, setAmount] = useState("");
  const [secretNote, setSecretNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [noteGenerated, setNoteGenerated] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [associationSet, setAssociationSet] = useState("verified");

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "deposit", label: "DEPOSIT", icon: <Download className="h-4 w-4" /> },
    { id: "withdraw", label: "WITHDRAW", icon: <Upload className="h-4 w-4" /> },
    { id: "prove", label: "PROVE", icon: <Shield className="h-4 w-4" />, badge: "NEW" },
  ];

  const generateNote = () => {
    // Generate a mock secret note (in production this would be cryptographic)
    const mockNote = `pv-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
    setSecretNote(mockNote);
    setNoteGenerated(true);
  };

  const copyNote = async () => {
    await navigator.clipboard.writeText(secretNote);
  };

  const downloadNote = () => {
    const blob = new Blob([secretNote], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `privacy-vault-note-${Date.now()}.txt`;
    a.click();
  };

  const handleSubmit = () => {
    if (!isConnected) {
      onConnect();
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      if (activeTab === "prove") {
        setProofGenerated(true);
      }
    }, 2000);
  };

  const renderDepositTab = () => (
    <div className="space-y-4">
      {/* Amount Input */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <button className="text-xs text-primary hover:underline">MAX</button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-transparent border-0 text-2xl font-medium flex-1 p-0 h-auto focus-visible:ring-0"
          />
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold">
              ◎
            </div>
            <span className="font-medium">SOL</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Balance: 0.00 SOL
        </div>
      </div>

      {/* Generate Note Button */}
      {!noteGenerated ? (
        <Button
          onClick={generateNote}
          variant="outline"
          className="w-full h-12 border-dashed border-2"
        >
          Generate Secret Note
        </Button>
      ) : (
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Secret Note</span>
            <button
              onClick={() => setShowNote(!showNote)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showNote ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="font-mono text-sm bg-background/50 p-3 rounded-lg break-all">
            {showNote ? secretNote : "••••••••••••••••••••••••••••••••"}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={copyNote} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button variant="outline" size="sm" onClick={downloadNote} className="flex-1">
              <FileDown className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      )}

      {/* Warning */}
      {noteGenerated && (
        <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200">
            Save this note securely! You need it to withdraw your funds. We cannot recover it.
          </p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isProcessing || !noteGenerated || !amount}
        className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 glow-button"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Depositing...
          </>
        ) : !isConnected ? (
          "Connect Wallet"
        ) : (
          "Deposit to Privacy Pool"
        )}
      </Button>
    </div>
  );

  const renderWithdrawTab = () => (
    <div className="space-y-4">
      {/* Note Input */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <span className="text-sm text-muted-foreground">Your Secret Note</span>
        <Textarea
          placeholder="Paste your secret note here..."
          value={secretNote}
          onChange={(e) => setSecretNote(e.target.value)}
          className="bg-background/50 min-h-[80px] font-mono text-sm"
        />
        <Button variant="outline" size="sm" className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          Upload Note File
        </Button>
      </div>

      {/* Recipient Address */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <span className="text-sm text-muted-foreground">Recipient Address</span>
        <Input
          placeholder="Solana wallet address"
          value={recipientAddress}
          onChange={(e) => setRecipientAddress(e.target.value)}
          className="bg-background/50 font-mono text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="rounded" defaultChecked />
          Use connected wallet
        </label>
      </div>

      {/* Privacy Shield Info */}
      <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
        <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-primary-foreground">
          Your withdrawal will be completely unlinkable from your original deposit.
        </p>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isProcessing || !secretNote}
        className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 glow-button"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Withdrawing...
          </>
        ) : !isConnected ? (
          "Connect Wallet"
        ) : (
          "Withdraw Privately"
        )}
      </Button>
    </div>
  );

  const renderProveTab = () => (
    <div className="space-y-4">
      {/* Explanation Card */}
      <div className="bg-gradient-to-r from-primary/20 to-cyan-500/20 rounded-xl p-4 border border-primary/30">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold">Proof of Innocence</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Prove your funds are NOT from illicit sources - without revealing your identity or which deposit is yours.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Based on Vitalik's Privacy Pools paper.
        </p>
      </div>

      {/* Note Input */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <span className="text-sm text-muted-foreground">Your Secret Note</span>
        <Textarea
          placeholder="Paste your secret note here..."
          value={secretNote}
          onChange={(e) => setSecretNote(e.target.value)}
          className="bg-background/50 min-h-[60px] font-mono text-sm"
        />
      </div>

      {/* Association Set Selector */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <span className="text-sm text-muted-foreground">Association Set</span>
        <select
          value={associationSet}
          onChange={(e) => setAssociationSet(e.target.value)}
          className="w-full bg-background/50 border border-border rounded-lg p-3 text-sm"
        >
          <option value="verified">All Verified Deposits (Default)</option>
          <option value="institutional">Institutional Only</option>
          <option value="custom">Custom Set</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Prove membership in a curated set of "clean" deposits.
        </p>
      </div>

      {/* Proof Result */}
      {proofGenerated && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-green-400">Proof Generated</span>
          </div>
          <p className="text-sm text-muted-foreground">
            This proves your funds are in the "{associationSet === 'verified' ? 'Verified Deposits' : associationSet === 'institutional' ? 'Institutional' : 'Custom'}" set without revealing which specific deposit is yours.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1">
              <FileDown className="h-4 w-4 mr-2" />
              Download Proof
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isProcessing || !secretNote}
        className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 glow-button"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating Proof...
          </>
        ) : !isConnected ? (
          "Connect Wallet"
        ) : proofGenerated ? (
          "Regenerate Proof"
        ) : (
          "Generate Innocence Proof"
        )}
      </Button>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="glass-card w-full max-w-md mx-auto overflow-hidden"
      style={{ minHeight: "580px" }}
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-border/30">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 text-xs font-semibold tracking-wider transition-colors relative flex items-center justify-center gap-1.5 ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.5 text-[9px] bg-primary text-white rounded-full ml-1">
                {tab.badge}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-6" style={{ minHeight: "480px" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === "deposit" && renderDepositTab()}
            {activeTab === "withdraw" && renderWithdrawTab()}
            {activeTab === "prove" && renderProveTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
