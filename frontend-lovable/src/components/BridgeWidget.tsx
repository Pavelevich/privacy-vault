import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DepositTab } from "@/components/bridge/DepositTab";
import { WithdrawTab } from "@/components/bridge/WithdrawTab";
import { ProveTab } from "@/components/bridge/ProveTab";

type TabType = "deposit" | "withdraw" | "prove";

interface BridgeWidgetProps {
  isConnected: boolean;
  walletAddress?: string;
  onConnect: () => void;
}

const tabVariants = {
  initial: { 
    opacity: 0, 
    y: 8,
    scale: 0.98
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const
    }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    scale: 0.98,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const
    }
  }
};

export const BridgeWidget = ({ isConnected, walletAddress, onConnect }: BridgeWidgetProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("deposit");

  const tabs: { id: TabType; label: string }[] = [
    { id: "deposit", label: "DEPOSIT" },
    { id: "withdraw", label: "WITHDRAW" },
    { id: "prove", label: "PROVE" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg mx-auto overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100 mx-2 sm:mx-auto"
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-4 text-sm font-semibold tracking-wider transition-all duration-200 relative ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/70"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-6 h-[calc(100dvh-220px)] sm:h-[680px] max-h-[680px] bg-white relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "deposit" && (
            <motion.div
              key="deposit"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-6 overflow-y-auto"
            >
              <DepositTab isConnected={isConnected} onConnect={onConnect} />
            </motion.div>
          )}
          {activeTab === "withdraw" && (
            <motion.div
              key="withdraw"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-6 overflow-y-auto"
            >
              <WithdrawTab
                isConnected={isConnected}
                walletAddress={walletAddress}
                onConnect={onConnect}
              />
            </motion.div>
          )}
          {activeTab === "prove" && (
            <motion.div
              key="prove"
              variants={tabVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-6 overflow-y-auto"
            >
              <ProveTab isConnected={isConnected} onConnect={onConnect} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
