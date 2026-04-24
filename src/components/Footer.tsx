import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-[#1da828] bg-[#9deda3] backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Made with ❤️ by</span>
            <a
              href="https://github.com/KrrishSR4"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Krish Mishra
            </a>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/KrrishSR4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[#1da828] bg-[#1da828] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#9deda3] hover:text-[#1da828] transition-all hover:shadow-md"
            >
              <Github className="h-4 w-4" />
              github.com/KrrishSR4
            </a>

            <a
              href="https://github.com/KrrishSR4/RepoXray"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[#1da828] bg-[#1da828] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#9deda3] hover:text-[#1da828] transition-all hover:shadow-md"
            >
              <Github className="h-4 w-4" />
              RepoXray
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            © 2026 RepoXray. No rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
