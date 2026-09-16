"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Edit,
  Download,
  FolderOpen,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Circle,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { resumeApi } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { Resume } from "@/types/api";

interface AtsComponent {
  code: string;
  points: number;
  earned: boolean;
  label_uz: string;
  label_ru: string;
  fix_uz: string;
  fix_ru: string;
}

interface ContentWarning {
  code: string;
  claimed_years?: number;
  implied_years?: number;
  earliest_year?: number;
  overstated?: boolean;
}

interface AtsInfo {
  ats_score?: number;
  ats_breakdown: AtsComponent[];
  ats_suggestions: string[];
  content_warnings: ContentWarning[];
}
import { toast } from "sonner";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { useTranslation } from "@/contexts/TranslationContext";

function getStatusConfig(isRu: boolean) {
  return {
    draft: {
      label: isRu ? "Черновик" : "Qoralama",
      color: "bg-surface-100 text-surface-600",
    },
    published: {
      label: isRu ? "Опубликовано" : "Nashr etilgan",
      color: "bg-green-100 text-green-700",
    },
    archived: {
      label: isRu ? "В архиве" : "Arxivlangan",
      color: "bg-surface-200 text-surface-500",
    },
  } as const;
}

function sanitizeFilename(value: string) {
  return (value || "resume").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

export default function ResumeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const resumeId = params!.id as string;
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const c = isRu
    ? {
        notFound: "Резюме не найдено или произошла ошибка.",
        notFoundShort: "Резюме не найдено",
        downloadOk: "Резюме загружено!",
        downloadFail: "Не удалось скачать PDF.",
        back: "Назад",
        backToResumes: "Назад к резюме",
        downloadPdf: "Скачать PDF",
        edit: "Редактировать",
        prepareInterview: "Подготовка к собеседованию",
        aiGenerated: "Создано с помощью ИИ",
        manuallyCreated: "Создано вручную",
        atsScore: "ATS балл",
        atsTitle: "Из чего складывается балл",
        atsLead: "Это проверка полноты резюме, а не прогноз найма.",
        atsEarned: "есть",
        atsMissing: "не хватает",
        atsNext: "Что стоит добавить",
        warnTitle: "Проверьте перед отправкой",
      }
    : {
        notFound: "Resume topilmadi yoki xatolik yuz berdi.",
        notFoundShort: "Resume topilmadi",
        downloadOk: "Resume yuklab olindi!",
        downloadFail: "PDF yuklab olishda xatolik yuz berdi.",
        back: "Orqaga",
        backToResumes: "Resumelarga qaytish",
        downloadPdf: "PDF yuklash",
        edit: "Tahrirlash",
        prepareInterview: "Suhbatga tayyorlanish",
        aiGenerated: "AI bilan yaratilgan",
        manuallyCreated: "Qo'lda yaratilgan",
        atsScore: "ATS ball",
        atsTitle: "Ball nimalardan tashkil topgan",
        atsLead: "Bu rezyume to'liqligini tekshiradi, ishga olinish ehtimolini emas.",
        atsEarned: "bor",
        atsMissing: "yetishmayapti",
        atsNext: "Nima qo'shish kerak",
        warnTitle: "Yuborishdan oldin tekshiring",
      };
  const statusConfig = getStatusConfig(isRu);

  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // The score's components, from the server, so the page never has to keep a
  // second copy of the scoring rules.
  const [ats, setAts] = useState<AtsInfo | null>(null);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        setIsLoading(true);
        const res = await resumeApi.get(resumeId);
        setResume(res.data?.data || res.data);
      } catch {
        setError(c.notFound);
      } finally {
        setIsLoading(false);
      }
    };
    const fetchAts = async () => {
      try {
        const res = await resumeApi.analytics(resumeId);
        const d = (res.data?.data ?? res.data ?? {}) as AtsInfo & { ats_score?: number };
        setAts({
          ats_score: d.ats_score,
          ats_breakdown: Array.isArray(d.ats_breakdown) ? d.ats_breakdown : [],
          ats_suggestions: Array.isArray(d.ats_suggestions) ? d.ats_suggestions : [],
          content_warnings: Array.isArray(d.content_warnings) ? d.content_warnings : [],
        });
      } catch {
        setAts(null); // the resume still renders without it
      }
    };
    if (resumeId) {
      fetchResume();
      fetchAts();
    }
    // c is recomputed each render; only the id should drive a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const handleDownload = async () => {
    if (!resume) return;
    setIsDownloading(true);
    try {
      const res = await resumeApi.download(resumeId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${sanitizeFilename(resume.title)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(c.downloadOk);
    } catch {
      toast.error(c.downloadFail);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <div className="rounded-2xl border p-8">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="mt-2 h-5 w-1/3" />
          <div className="mt-8 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-16 w-16 text-red-400" />
        <h2 className="mt-4 text-xl font-bold">{error || c.notFoundShort}</h2>
        <Button className="mt-6" onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {c.back}
        </Button>
      </div>
    );
  }

  const status = statusConfig[resume.status] || statusConfig.draft;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Back + Actions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-surface-600">
          <ArrowLeft className="h-4 w-4" />
          {c.backToResumes}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {c.downloadPdf}
          </Button>
          <Link href={`/student/interview?resume=${resumeId}`}>
            <Button variant="outline" className="gap-2">
              <Mic className="h-4 w-4" />
              {c.prepareInterview}
            </Button>
          </Link>
          <Link href={`/student/resumes/${resumeId}/edit`}>
            <Button className="bg-gradient-to-r from-brand-500 to-violet-600">
              <Edit className="mr-2 h-4 w-4" />
              {c.edit}
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Resume Meta */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between rounded-2xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-700 dark:bg-surface-800"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100">
            {resume.ai_generated ? (
              <Sparkles className="h-5 w-5 text-brand-600" />
            ) : (
              <FolderOpen className="h-5 w-5 text-brand-600" />
            )}
          </div>
          <div>
            <h1 className="font-bold text-surface-900">{resume.title}</h1>
            <p className="text-xs text-surface-500">
              {resume.ai_generated ? c.aiGenerated : c.manuallyCreated} ·{" "}
              {formatRelativeTime(resume.updated_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {typeof (ats?.ats_score ?? resume.ats_score) === "number" && (
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {ats?.ats_score ?? resume.ats_score}%
              </div>
              <div className="text-xs text-surface-500">{c.atsScore}</div>
            </div>
          )}
          <Badge className={status.color}>{status.label}</Badge>
        </div>
      </motion.div>

      {/* A claim in the summary that the resume's own dates do not support.
          Shown before download or publish, and never corrected automatically:
          only the student knows whether the summary is wrong or whether there
          is earlier work they did not list. */}
      {ats?.content_warnings?.map((w) => (
        <motion.div
          key={w.code}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">{c.warnTitle}</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200/90">
                {isRu
                  ? `В кратком резюме указано ${w.claimed_years} лет опыта, но самая ранняя запись в разделе опыта начинается в ${w.earliest_year} году — это примерно ${w.implied_years} лет. Исправьте то, что неверно.`
                  : `Qisqacha ma'lumotda ${w.claimed_years} yil tajriba yozilgan, lekin tajriba bo'limidagi eng erta yozuv ${w.earliest_year}-yildan boshlanadi — bu taxminan ${w.implied_years} yil. Qaysi biri noto'g'ri bo'lsa, shuni to'g'rilang.`}
              </p>
            </div>
          </div>
        </motion.div>
      ))}

      {/* What the score is made of. A bare "50%" is a verdict the student
          cannot act on — and until today it was the same 50% for every
          resume in the database. */}
      {ats && ats.ats_breakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-700 dark:bg-surface-800"
        >
          <h2 className="font-semibold text-surface-900 dark:text-white">{c.atsTitle}</h2>
          <p className="mt-1 text-xs text-surface-500">{c.atsLead}</p>

          <ul className="mt-3 space-y-2">
            {ats.ats_breakdown.map((item) => (
              <li key={item.code} className="flex items-center gap-2 text-sm">
                {item.earned ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-surface-300" aria-hidden />
                )}
                <span
                  className={
                    item.earned
                      ? "text-surface-700 dark:text-surface-200"
                      : "text-surface-500"
                  }
                >
                  {isRu ? item.label_ru : item.label_uz}
                </span>
                <span className="ml-auto shrink-0 text-xs text-surface-400">
                  {item.earned ? `+${item.points}` : `0 / ${item.points}`}
                </span>
              </li>
            ))}
          </ul>

          {ats.ats_suggestions.length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-50 p-3 dark:bg-amber-500/10">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {c.atsNext}
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-surface-700 dark:text-surface-200">
                {ats.ats_suggestions.map((fix, i) => (
                  <li key={i}>{fix}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Resume Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-[28px] border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-800"
      >
        <ResumePreview content={resume.content} title={resume.title} />
      </motion.div>
    </div>
  );
}
