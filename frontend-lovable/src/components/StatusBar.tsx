import { Circle, MessageCircle, FileText, Twitter } from "lucide-react";

export const StatusBar = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-3 border-t border-border/30 bg-background/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Live Status */}
        <div className="flex items-center gap-2">
          <Circle className="h-2 w-2 fill-success text-success animate-pulse" />
          <span className="text-sm text-muted-foreground">Live</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Talk to us</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Docs</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Twitter className="h-4 w-4" />
            <span className="hidden sm:inline">Socials</span>
          </a>
        </div>
      </div>
    </div>
  );
};
