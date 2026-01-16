import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Download, Link, Loader2, Check, Upload, Info, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrivacyVault } from "@/hooks/usePrivacyVault";
import { useToast } from "@/hooks/use-toast";
import { ASSOCIATION_SET_IDS } from "@/lib/associationSets";

interface ProveTabProps {
  isConnected: boolean;
  onConnect: () => void;
}

const ASSOCIATION_SETS = {
  all: {
    id: ASSOCIATION_SET_IDS.ALL_VERIFIED,
    name: "All Verified Deposits",
    description: "Chain analysis verified - excludes flagged addresses",
    provider: "Tetsuo Chain Analysis",
    trustLevel: "high" as const,
  },
  institutional: {
    id: ASSOCIATION_SET_IDS.INSTITUTIONAL,
    name: "Institutional Compliant",
    description: "KYC verified institutional participants only",
    provider: "Tetsuo KYC Provider",
    trustLevel: "high" as const,
  },
  community: {
    id: ASSOCIATION_SET_IDS.COMMUNITY_CURATED,
    name: "Community Curated",
    description: "DAO-governed list of verified clean deposits",
    provider: "Tetsuo DAO",
    trustLevel: "medium" as const,
  },
  us_compliant: {
    id: ASSOCIATION_SET_IDS.GEOGRAPHIC_COMPLIANT,
    name: "US Regulatory Compliant",
    description: "Meets US regulatory requirements (OFAC, FinCEN)",
    provider: "Tetsuo Compliance",
    trustLevel: "high" as const,
  },
};

export const ProveTab = ({ isConnected, onConnect }: ProveTabProps) => {
  const [secretNote, setSecretNote] = useState("");
  const [associationSet, setAssociationSet] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [proofGenerated, setProofGenerated] = useState(false);
  const [proofData, setProofData] = useState<{
    nullifierHash: string;
    associationSetId: number;
    proofHex: string;
    provenAt: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { proveInnocence, isLoading } = usePrivacyVault();
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSecretNote(content);
        toast({
          title: "Note Loaded",
          description: `Loaded secret note from ${file.name}`,
        });
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const handleGenerateProof = async () => {
    if (!isConnected) {
      onConnect();
      return;
    }

    if (!secretNote) {
      toast({
        title: "Missing Secret Note",
        description: "Please paste or upload your secret note.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      toast({
        title: "Generating Proof of Innocence...",
        description: "This may take 60-90 seconds. Please wait.",
      });

      const selectedSet = ASSOCIATION_SETS[associationSet as keyof typeof ASSOCIATION_SETS];
      const result = await proveInnocence(secretNote, selectedSet.id);

      if (result.success) {
        // Convert proof to hex for display
        const proofHex = Array.from(result.proof.a)
          .concat(Array.from(result.proof.b))
          .concat(Array.from(result.proof.c))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        setProofData({
          nullifierHash: result.nullifierHash,
          associationSetId: result.associationSetId,
          proofHex: proofHex.slice(0, 64) + '...',
          provenAt: result.provenAt,
        });
        setProofGenerated(true);

        toast({
          title: "Proof Generated!",
          description: "Your Proof of Innocence is ready.",
        });
      }
    } catch (error) {
      console.error("Proof generation error:", error);
      toast({
        title: "Proof Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyProof = async () => {
    if (!proofData) return;

    const proofJson = JSON.stringify(proofData, null, 2);
    await navigator.clipboard.writeText(proofJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: "Copied!",
      description: "Proof data copied to clipboard.",
    });
  };

  const handleDownload = () => {
    if (!proofData) return;

    const fullProof = {
      type: "proof_of_innocence",
      ...proofData,
      associationSetName: ASSOCIATION_SETS[associationSet as keyof typeof ASSOCIATION_SETS].name,
      timestamp: new Date(proofData.provenAt).toISOString(),
    };

    const blob = new Blob([JSON.stringify(fullProof, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proof-of-innocence-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded!",
      description: "Proof saved to file.",
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Explanation Card */}
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-6 w-6 text-primary flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground mb-1">Proof of Innocence</h3>
              <p className="text-sm text-muted-foreground">
                Prove your funds are NOT from illicit sources without revealing your identity.
                Based on Vitalik Buterin's Privacy Pools paper.
              </p>
            </div>
          </div>
        </div>

        {/* Secret Note Input */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <span className="text-sm font-medium">Secret Note</span>
          <Textarea
            placeholder="Paste your secret note JSON..."
            value={secretNote}
            onChange={(e) => setSecretNote(e.target.value)}
            className="bg-muted/50 border-0 min-h-[80px] resize-none focus-visible:ring-0 font-mono text-xs"
          />
          <div className="flex justify-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt,.json"
              className="hidden"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </div>
        </div>

        {/* Association Set Dropdown */}
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Association Set</span>
          </div>
          <Select value={associationSet} onValueChange={setAssociationSet}>
            <SelectTrigger className="bg-muted/50 border-0 focus:ring-0">
              <SelectValue placeholder="Select association set" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <span>All Verified Deposits</span>
                  <span className="text-xs text-emerald-700 font-medium">(Recommended)</span>
                </div>
              </SelectItem>
              <SelectItem value="institutional">Institutional Compliant</SelectItem>
              <SelectItem value="community">Community Curated</SelectItem>
              <SelectItem value="us_compliant">US Regulatory Compliant</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {ASSOCIATION_SETS[associationSet as keyof typeof ASSOCIATION_SETS].description}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Provider:</span>
              <span>{ASSOCIATION_SETS[associationSet as keyof typeof ASSOCIATION_SETS].provider}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                ASSOCIATION_SETS[associationSet as keyof typeof ASSOCIATION_SETS].trustLevel === "high"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {ASSOCIATION_SETS[associationSet as keyof typeof ASSOCIATION_SETS].trustLevel.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Proof Generated Result */}
        <AnimatePresence>
          {proofGenerated && proofData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="h-5 w-5" />
                <span className="font-semibold">Proof Generated</span>
              </div>
              <div className="text-xs text-emerald-800/80 space-y-1">
                <p>Nullifier: {proofData.nullifierHash.slice(0, 20)}...</p>
                <p>Association Set: {ASSOCIATION_SETS[associationSet as keyof typeof ASSOCIATION_SETS].name}</p>
                <p>Proof: {proofData.proofHex}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyProof}
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Copy Proof
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Generate Proof Button - Always at bottom */}
      <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} className="mt-4">
        <Button
          onClick={handleGenerateProof}
          disabled={isGenerating || isLoading || (!secretNote && isConnected)}
          className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 glow-button uppercase tracking-wide"
        >
          {isGenerating || isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating ZK Proof...
            </>
          ) : isConnected ? (
            "GENERATE PROOF"
          ) : (
            "Connect Wallet"
          )}
        </Button>
      </motion.div>
    </div>
  );
};
