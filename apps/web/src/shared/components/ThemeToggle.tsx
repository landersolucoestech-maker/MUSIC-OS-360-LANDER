import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";

type Theme = "light" | "dark" | "system";

interface ThemeToggleProps {
  className?: string;
  "data-testid"?: string;
}

export function ThemeToggle({ className, "data-testid": testId }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme;
      return stored || "dark";
    }
    return "dark";
  });

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme;
      const resolved = stored || "dark";
      if (resolved === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      return resolved === "dark";
    }
    return true;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
      setIsDark(systemTheme === "dark");
    } else {
      root.classList.add(theme);
      setIsDark(theme === "dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        const newTheme = mediaQuery.matches ? "dark" : "light";
        root.classList.add(newTheme);
        setIsDark(mediaQuery.matches);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn("h-8 w-8", className)}
      title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      data-testid={testId ?? "button-theme-toggle"}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}
