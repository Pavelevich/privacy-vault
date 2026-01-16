import { Circle, Github } from "lucide-react";

// X (Twitter) icon component
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const StatusBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 safe-area-bottom border-t border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Live Status */}
        <div className="flex items-center gap-3">
          <Circle className="h-2.5 w-2.5 fill-success text-success animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">Devnet</span>
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/Pavelevich/privacy-vault"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            href="https://x.com/tetsuoarena"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <XIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
};
