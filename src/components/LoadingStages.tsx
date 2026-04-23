import { useEffect, useState } from "react";
import { useAnalysisStore } from "@/store/analysis";
import { cn } from "@/lib/utils";

const stages = [
  "cloning repository tree",
  "reading README and manifests",
  "ranking important files",
  "generating explanations with LLM",
];

export function LoadingStages() {
  const loadingStage = useAnalysisStore((s) => s.loadingStage);
  const [auto, setAuto] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setAuto((v) => Math.min(v + 1, stages.length - 1)), 1600);
    return () => clearInterval(id);
  }, []);

  const current = Math.max(auto, loadingStage);

  return (
    <div className="mx-auto max-w-xl animate-in-soft">
      <div className="terminal overflow-hidden shadow-soft">
        <div className="flex items-center gap-2 border-b border-border/60 bg-background/10 px-3 py-2">
          <span className="terminal-dot bg-red-500/80" />
          <span className="terminal-dot bg-yellow-500/80" />
          <span className="terminal-dot bg-green-500/80" />
          <span className="ml-2 font-mono text-xs text-terminal-foreground/60">analyze.sh</span>
        </div>
        <div className="p-4 font-mono text-sm">
          {stages.map((s, i) => {
            const done = i < current;
            const active = i === current;
            const pending = i > current;
            return (
              <div
                key={s}
                className={cn(
                  "flex items-start gap-2 py-1",
                  pending && "opacity-40",
                )}
              >
                <span className="text-primary shrink-0">
                  {done ? "[ok]" : active ? "[..]" : "[  ]"}
                </span>
                <span className={cn(active && "text-terminal-foreground")}>
                  {s}
                  {active && <span className="caret" />}
                </span>
              </div>
            );
          })}
          {current >= stages.length - 1 && (
            <div className="mt-2 text-syntax-comment">
              # finalizing output…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
