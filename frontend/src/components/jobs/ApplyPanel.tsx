"use client";

/**
 * Everything needed to approach the employer, without leaving the page.
 *
 * Aggregated listings have no employer account here, so we do not take an
 * application for them — nobody could answer it. What the candidate needs is
 * the employer's own phone or Telegram handle, exactly as the source post wrote
 * it, plus their own CV to send. That used to mean opening our Telegram bot, or
 * following a link back to the channel we read the listing from; both were a
 * long way round for information this page already has.
 *
 * Rendered inline on the job page (`ApplyDialog` wraps it for the sticky bar),
 * so the number is visible without a click — one tap dials it on a phone.
 */

import { useEffect, useState } from "react";
import {
  Phone,
  Send,
  Mail,
  Copy,
  Check,
  FileDown,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { resumeApi } from "@/lib/api";
import {
  formatPhone,
  jobApplyRoute,
  parseContact,
  telHref,
} from "@/lib/jobApply";
import { toast } from "sonner";
import type { Job, Resume } from "@/types/api";

export function ApplyPanel({
  job,
  isRu,
  active = true,
}: {
  job: Job;
  isRu: boolean;
  /** False while the panel is closed, so the CV request waits until it shows. */
  active?: boolean;
}) {
  const route = jobApplyRoute(job);
  const { phones, emails, handles, note } = parseContact(job.contact_info);
  const [copied, setCopied] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!active || resume) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await resumeApi.list({ page: 1, limit: 20 });
        const payload = res.data?.data ?? res.data;
        const items: Resume[] =
          payload?.resumes ?? payload?.items ?? payload ?? [];
        const newest = [...items].sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at || 0).getTime() -
            new Date(a.updated_at || a.created_at || 0).getTime(),
        )[0];
        if (!cancelled) setResume(newest ?? null);
      } catch {
        /* the CV block just stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, resume]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error(isRu ? "Не удалось скопировать" : "Nusxa olinmadi");
    }
  };

  const downloadCv = async () => {
    if (!resume) return;
    setDownloading(true);
    try {
      const res = await resumeApi.download(resume.id);
      const url = URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(resume.title || "rezyume").replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(isRu ? "Не удалось скачать" : "Yuklab bo'lmadi");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-2.5">
      {route.kind === "contact" && (
        <>
          {note && (
            <p className="flex items-start gap-2 rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {note}
            </p>
          )}

          {phones.map((p) => (
            <div
              key={p}
              className="flex items-center gap-1 rounded-xl border border-surface-200 p-2 dark:border-surface-700"
            >
              {/* Calling is the action and the number is its own label. On a
                  phone this dials; on a desktop it hands off, so the copy
                  button sits beside it rather than being the only way. */}
              <a
                href={telHref(p)}
                className="flex flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800"
              >
                <Phone className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="font-mono text-[15px] font-medium tabular-nums text-surface-900 dark:text-white">
                  {formatPhone(p)}
                </span>
              </a>
              <Button
                size="sm"
                variant="ghost"
                aria-label={isRu ? "Скопировать номер" : "Raqamdan nusxa olish"}
                onClick={() => copy(formatPhone(p))}
              >
                {copied === formatPhone(p) ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}

          {handles.map((h) => (
            <a
              key={h}
              href={`https://t.me/${h}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center justify-between gap-2 rounded-xl border border-surface-200 px-3 py-3 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
            >
              <span className="flex items-center gap-2.5 font-medium text-surface-900 dark:text-white">
                <Send className="h-4 w-4 shrink-0 text-brand-500" />@{h}
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm text-surface-500">
                {isRu ? "Написать" : "Yozish"}
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
            </a>
          ))}

          {emails.map((e) => (
            <a
              key={e}
              href={`mailto:${e}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-surface-200 px-3 py-3 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
            >
              <span className="flex min-w-0 items-center gap-2.5 font-medium text-surface-900 dark:text-white">
                <Mail className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="truncate">{e}</span>
              </span>
              <span className="shrink-0 text-sm text-surface-500">
                {isRu ? "Написать" : "Yozish"}
              </span>
            </a>
          ))}

          {phones.length === 0 && emails.length === 0 && handles.length === 0 && (
            <p className="rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              {job.contact_info}
            </p>
          )}
        </>
      )}

      {route.kind === "none" && (
        <p className="rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          {isRu
            ? "В этой вакансии контакты не указаны."
            : "Bu e'londa aloqa ma'lumoti ko'rsatilmagan."}
        </p>
      )}

      {/* The CV is the other half of approaching someone. */}
      {resume ? (
        <Button
          variant="outline"
          className="w-full justify-start gap-2.5 px-3 py-6"
          onClick={downloadCv}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 shrink-0 text-brand-500" />
          )}
          <span className="truncate">
            {resume.title || (isRu ? "Резюме" : "Rezyume")} — PDF
          </span>
        </Button>
      ) : (
        <a href="/student/resumes/create-ai" className="block">
          <Button
            variant="outline"
            className="w-full justify-start gap-2.5 px-3 py-6"
          >
            <FileDown className="h-4 w-4 shrink-0 text-surface-400" />
            {isRu ? "Создать резюме" : "Rezyume yaratish"}
          </Button>
        </a>
      )}

      <p className="text-xs leading-relaxed text-surface-500">
        {isRu
          ? "Работодатель отвечает напрямую. Если у вас просят деньги за трудоустройство — это мошенничество, сообщите нам."
          : "Ish beruvchi to'g'ridan-to'g'ri javob beradi. Ishga joylashish uchun sizdan pul so'rashsa — bu firibgarlik, bizga xabar bering."}
      </p>
    </div>
  );
}
