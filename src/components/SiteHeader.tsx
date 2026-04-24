import { ThemeToggle } from "@/components/theme-toggle";
import { Link, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useTheme } from "next-themes";
import { useLocation } from "react-router-dom";
import logo from "@/assets/repoxray-logo.png";
import developerIcon from "@/assets/developer.png";

export function SiteHeader() {
  const { theme } = useTheme();
  const location = useLocation();
  const isDeveloperMode = location.pathname === "/developer";
  const isDark = theme === 'dark';

  return (
    <header className="relative z-30 border-b border-[#1da828] bg-[#9deda3] backdrop-blur-md">
      {/* Theme toggle / GitHub link pinned to top-right */}
      <div className="absolute right-4 top-9">
        {isDeveloperMode ? (
          <a
            href="https://github.com/KrrishSR4"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <img
              src={developerIcon}
              alt="GitHub"
              className="w-16 h-16"
            />
          </a>
        ) : (
          <ThemeToggle />
        )}
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

      </div>
    </header>
  );
}
