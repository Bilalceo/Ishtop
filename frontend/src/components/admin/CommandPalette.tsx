"use client";

import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ClipboardList,
  KeyRound,
  ScrollText,
  Zap,
  AlertTriangle,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTranslation } from "@/hooks/useTranslation";

const ADMIN_PAGES = [
  { label: "Dashboard", labelRu: "Дашборд", href: "/admin", icon: LayoutDashboard },
  { label: "Users", labelRu: "Пользователи", href: "/admin/users", icon: Users },
  { label: "Companies", labelRu: "Компании", href: "/admin/companies", icon: Building2 },
  { label: "Jobs", labelRu: "Вакансии", href: "/admin/jobs", icon: Briefcase },
  { label: "Applications", labelRu: "Отклики", href: "/admin/applications", icon: ClipboardList },
  { label: "Access Control", labelRu: "Управление доступом", href: "/admin/access", icon: KeyRound },
  { label: "Audit Log", labelRu: "Журнал аудита", href: "/admin/audit", icon: ScrollText },
  { label: "Landing Page", labelRu: "Лендинг", href: "/admin/landing", icon: Zap },
  { label: "Errors", labelRu: "Ошибки", href: "/admin#errors", icon: AlertTriangle },
];

type Props = { open: boolean; onOpenChange: (open: boolean) => void };

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  const navigate = (href: string) => {
    onOpenChange(false);
    // Hash routes need window.location for anchor scrolling; router.push doesn't scroll to hash in App Router
    if (href.includes("#")) {
      window.location.href = href;
    } else {
      router.push(href);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={
          isRu ? "Поиск страниц и действий..." : "Sahifalar va harakatlarni qidiring..."
        }
      />
      <CommandList>
        <CommandEmpty>
          {isRu ? "Ничего не найдено." : "Hech narsa topilmadi."}
        </CommandEmpty>
        <CommandGroup heading={isRu ? "Страницы" : "Sahifalar"}>
          {ADMIN_PAGES.map((page) => (
            <CommandItem
              key={page.href}
              value={`${page.label} ${page.labelRu}`}
              onSelect={() => navigate(page.href)}
              className="gap-2"
            >
              <page.icon className="h-4 w-4 text-surface-500" aria-hidden="true" />
              {isRu ? page.labelRu : page.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
