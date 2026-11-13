"use client";

import { Button, Tooltip } from "antd";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/i18n";
import { useTheme } from "@/providers/theme-provider";

export function ThemeToggle({ className }: { className?: string }) {
  const { dict } = useI18n();
  const scheme = useTheme((state) => state.scheme);
  const toggleScheme = useTheme((state) => state.toggleScheme);
  const isDark = scheme === "dark";
  const label = isDark ? dict.theme.switchToLight : dict.theme.switchToDark;

  return (
    <Tooltip title={label}>
      <Button
        type="text"
        className={className}
        icon={isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
        aria-label={label}
        aria-pressed={isDark}
        onClick={toggleScheme}
      />
    </Tooltip>
  );
}
