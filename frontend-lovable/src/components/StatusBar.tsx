import { Circle } from "lucide-react";

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const StatusBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 safe-area-bottom border-t border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Live Status */}
        <div className="flex items-center gap-2">
          <Circle className="h-2 w-2 fill-success text-success animate-pulse" />
          <span className="text-sm text-muted-foreground">Devnet</span>
        </div>

        {/* X Social Link */}
        <a
          href="https://x.com/tetsuoarena"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <XIcon className="h-4 w-4" />
          <span className="hidden sm:inline">@tetsuoarena</span>
        </a>
      </div>
    </div>
  );
};
