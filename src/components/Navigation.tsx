import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export function Navigation() {
  return (
    <nav className="flex items-center gap-1.5 rounded-full border border-border bg-card p-1 text-xs shadow-soft">
      {[
        { to: "/", label: "repo" },
        { to: "/explain", label: "snippet" },
        { to: "/developer", label: "developer", starred: true },
      ].map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end
          className={({ isActive }) =>
            cn(
              "relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono transition-all",
              n.starred && !isActive &&
              "bg-gradient-to-r from-primary/10 to-primary/5 text-foreground ring-1 ring-primary/30 hover:ring-primary/60",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
                : !n.starred && "text-muted-foreground hover:bg-accent hover:text-foreground",
            )
          }
        >
          {n.starred && (
            <Star
              className="h-3 w-3 fill-current text-primary"
              strokeWidth={2}
            />
          )}
          ./{n.label}
        </NavLink>
      ))}
    </nav>
  );
}
