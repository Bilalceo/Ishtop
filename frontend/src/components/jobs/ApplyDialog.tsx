"use client";

/**
 * Everything needed to approach the employer, without leaving the page.
 *
 * Aggregated listings have no employer account here, so we do not take an
 * application for them — nobody could answer it. What the candidate needs is
 * the contact the source post carried and their own CV to send. That used to
 * mean opening our Telegram bot, which is a long way round for information the
 * site already has, so it happens here instead.
 */

import { useEffect, useState } from "react";
import {
  Phone,
  Send,
  Copy,
  Check,
  FileDown,
  ExternalLink,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resumeApi } from "@/lib/api";
import { jobApplyRoute, parseContact } from "@/lib/jobApply";
import { jobDisplayIdentity } from "@/lib/jobLabels";
import { toast } from "sonner";
import type { Job, Resume } from "@/types/api";

export function ApplyDialog({
  job,
  open,
  onOpenChange,
  isRu,
}: {
  job: Job;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isRu: boolean;
}) {
  const route = jobApplyRoute(job);
  // Match the page heading: aggregated titles carry the employer in brackets.
  const { title: displayTitle, company } = jobDisplayIdentity(
    job.title,
    job.company?.name,
  );
  const { phones, handles, note } = parseContact(job.contact_info);
  const [copied, setCopied] = useState<string | null>(null);
  const [resume, setResume] = useState<Resume | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Load the most recent resume only once the dialog is actually opened.
  useEffect(() => {
    if (!open || resume) return;
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
  }, [open, resume]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isRu ? "Откликнуться" : "Ariza berish"}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-surface-500">
          {displayTitle}
          {company ? ` · ${company}` : ""}
        </p>

        {route.kind === "contact" && (
          <div className="mt-2 space-y-3">
            <p className="text-sm font-medium text-surface-800 dark:text-surface-200">
              {isRu
                ? "Свяжитесь с работодателем напрямую:"
                : "Ish beruvchi bilan bevosita bog'laning:"}
            </p>

            {note && (
              <p className="flex items-start gap-2 rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                {note}
              </p>
            )}

            {phones.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between gap-2 rounded-xl border border-surface-200 px-3 py-2.5 dark:border-surface-700"
              >
                <span className="flex items-center gap-2 font-medium text-surface-900 dark:text-white">
                  <Phone className="h-4 w-4 text-surface-400" />
                  {p}
                </span>
                <Button size="sm" variant="outline" onClick={() => copy(p)}>
                  {copied === p ? (
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
                className="flex items-center justify-between gap-2 rounded-xl border border-surface-200 px-3 py-2.5 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800"
              >
                <span className="flex items-center gap-2 font-medium text-surface-900 dark:text-white">
                  <Send className="h-4 w-4 text-brand-500" />@{h}
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-surface-400" />
              </a>
            ))}

            {phones.length === 0 && handles.length === 0 && (
              <p className="rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                {job.contact_info}
              </p>
            )}
          </div>
        )}

        {route.kind === "none" && (
          <p className="mt-2 rounded-xl bg-surface-100 px-3 py-2 text-sm text-surface-600 dark:bg-surface-800 dark:text-surface-300">
            {isRu
              ? "В этой вакансии контакты не указаны."
              : "Bu e'londa aloqa ma'lumoti ko'rsatilmagan."}
          </p>
        )}

        {/* The CV is the other half of approaching someone. */}
        <div className="mt-4 rounded-xl border border-surface-200 p-3 dark:border-surface-700">
          {resume ? (
            <>
              <p className="text-sm text-surface-600 dark:text-surface-300">
                {isRu
                  ? "Скачайте резюме и отправьте его работодателю."
                  : "Rezyumengizni yuklab oling va ish beruvchiga yuboring."}
              </p>
              <Button
                variant="outline"
                className="mt-2 w-full gap-2"
                onClick={downloadCv}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4" />
                )}
                {resume.title || (isRu ? "Резюме" : "Rezyume")} — PDF
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-surface-600 dark:text-surface-300">
                {isRu
                  ? "Резюме ещё нет — создайте, чтобы отправить работодателю."
                  : "Rezyume hali yo'q — ish beruvchiga yuborish uchun yarating."}
              </p>
              <a href="/student/resumes/create-ai">
                <Button variant="outline" className="mt-2 w-full">
                  {isRu ? "Создать резюме" : "Rezyume yaratish"}
                </Button>
              </a>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
