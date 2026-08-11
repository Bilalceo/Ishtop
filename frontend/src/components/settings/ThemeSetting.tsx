"use client";

/**
 * ThemeSetting — appearance (light / dark / system) control for the Settings
 * page. The theme toggle used to live in the top header; it was moved here to
 * keep the mobile header narrow. Uses next-themes; renders a placeholder until
 * mounted to avoid a hydration mismatch.
 */

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

export function ThemeSetting() {
  const { locale } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isRu = locale === "ru";

  useEffect(() => setMounted(true), []);

  const t = isRu
    ? {
        title: "Внешний вид",
        subtitle: "Выберите тему оформления интерфейса",
        light: "Светлая",
        dark: "Тёмная",
        system: "Системная",
      }
    : {
        title: "Ko'rinish",
        subtitle: "Interfeys mavzusini tanlang",
        light: "Yorug'",
        dark: "Qorong'i",
        system: "Tizim",
      };

  const options = [
    { value: "light", label: t.light, Icon: Sun },
    { value: "dark", label: t.dark, Icon: Moon },
    { value: "system", label: t.system, Icon: Monitor },
  ] as const;

  const active = mounted ? theme ?? "system" : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <p className="text-sm text-surface-500 dark:text-surface-400">{t.subtitle}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          {options.map(({ value, label, Icon }) => {
            const selected = active === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition",
                  selected
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300"
                    : "border-surface-200 text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-700/50",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default ThemeSetting;
