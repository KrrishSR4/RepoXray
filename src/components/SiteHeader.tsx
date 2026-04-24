import { ThemeToggle } from "@/components/theme-toggle";
import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useTheme } from "next-themes";
import logo from "@/assets/repoxray-logo.png";

export function SiteHeader() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className={`relative z-30 border-b ${isDark ? 'border-[#9deda3] bg-[#1da828]' : 'border-[#1da828] bg-[#9deda3]'} backdrop-blur-md`}>
      {/* Theme toggle pinned to top-right */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-4 pt-0 text-center">
        {/* Logo + Name — horizontal row */}
        <Link to="/" aria-label="RepoXray home" className="group flex items-center gap-3">
          <img src={logo} alt="RepoXray logo" className="h-24 w-auto object-contain" />
          <span className="font-mono text-2xl font-bold tracking-tight md:text-3xl text-black">
            Repo<span className="text-[#1da828]">Xray</span>
          </span>
        </Link>

        {/* Tagline */}
        <p className="mt-2 max-w-md text-sm font-medium text-black">
          X-Ray Repositories, Don&apos;t Just Read Them.
        </p>

        {/* Nav */}
        <nav className="mt-5 flex items-center gap-1.5 rounded-full border border-border bg-card p-1 text-xs shadow-soft">
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
      </div>
    </header>
  );
}
