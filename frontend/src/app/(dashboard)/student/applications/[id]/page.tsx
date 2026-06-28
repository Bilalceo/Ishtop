"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Wallet,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Calendar,
  MessageSquare,
  Loader2,
  AlertCircle,
  Briefcase,
  User,
  Eye,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { applicationApi } from "@/lib/api";
import { formatDate, formatRelativeTime, formatSalaryRange, cn } from "@/lib/utils";
import type { Application } from "@/types/api";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

const statusConfig: Record<string, { label: string; color: string; icon: any; description: string }> = {
  pending: {
    label: "Kutilmoqda",
    color: "bg-yellow-100 text-yellow-700",
    icon: Clock,
    description: "Arizangiz kompaniyaga yuborildi. Javob kutilmoqda.",
  },
  reviewing: {
    label: "Ko'rib chiqilmoqda",
    color: "bg-blue-100 text-blue-700",
    icon: Eye,
    description: "Kompaniya arizangizni ko'rib chiqmoqda.",
  },
  interview: {
    label: "Intervyu",
    color: "bg-emerald-100 text-emerald-700",
    icon: User,
    description: "Tabriklaymiz! Siz intervyuga taklif qilindingiz.",
  },
  accepted: {
    label: "Qabul qilindi",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle,
    description: "Tabriklaymiz! Sizning arizangiz qabul qilindi!",
  },
  rejected: {
    label: "Rad etildi",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
    description: "Afsuski, bu safar ariza rad etildi.",
  },
};

const statusSteps = ["pending", "reviewing", "interview", "accepted"];

type StudentApplicationDetails = Application & {
  interview_type?: string;
  meeting_link?: string;
};

function formatInterviewTypeLabel(interviewType?: string) {
  if (!interviewType) {
    return "Format belgilanmagan";
  }

  const normalized = interviewType.trim().toLowerCase();
  if (normalized === "video") return "Video intervyu";
  if (normalized === "phone") return "Telefon intervyu";
  if (normalized === "in-person" || normalized === "in person") return "Shaxsan intervyu";

  return interviewType;
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params!.id as string;
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setIsLoading(true);
        const res = await applicationApi.get(appId);
        setApplication(res.data?.data || res.data);
      } catch {
        setError("Ariza topilmadi yoki xatolik yuz berdi.");
      } finally {
        setIsLoading(false);
      }
    };
    if (appId) fetchApplication();
  }, [appId]);

  const handleWithdraw = async () => {
    if (!confirm("Arizangizni qaytarib olishni xohlaysizmi?")) return;
    setIsWithdrawing(true);
    try {
      await applicationApi.withdraw(appId);
      toast.success("Ariza qaytarib olindi.");
      router.push("/student/applications");
    } catch {
      toast.error("Xatolik yuz berdi.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-16 w-16 text-red-400" />
        <h2 className="mt-4 text-xl font-bold">{error || "Ariza topilmadi"}</h2>
        <Button className="mt-6" onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Orqaga
        </Button>
      </div>
    );
  }

  const applicationDetails = application as StudentApplicationDetails;
  const status = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const job = applicationDetails.job;
  const currentStepIndex = statusSteps.indexOf(application.status);
  const isRejected = application.status === "rejected";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Back */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-surface-600">
          <ArrowLeft className="h-4 w-4" />
          Arizalarga qaytish
        </Button>
      </motion.div>

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl p-6",
          isRejected
            ? "border border-red-200 bg-red-50"
            : "border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50"
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl",
              isRejected ? "bg-red-100" : "bg-white shadow-md"
            )}
          >
            <StatusIcon
              className={cn("h-7 w-7", isRejected ? "text-red-500" : "text-emerald-600")}
            />
          </div>
          <div>
            <Badge className={cn("text-sm", status.color)}>{status.label}</Badge>
            <p className="mt-1 text-surface-700">{status.description}</p>
          </div>
        </div>

        {/* Progress Steps */}
        {!isRejected && (
          <div className="mt-6 flex items-center gap-1">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex flex-1 items-center gap-1">
                <div
                  className={cn(
                    "h-2 flex-1 rounded-full transition-all",
                    i <= currentStepIndex ? "bg-emerald-500" : "bg-surface-200"
                  )}
                />
                {i === statusSteps.length - 1 && (
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                      i <= currentStepIndex
                        ? "bg-emerald-500 text-white"
                        : "bg-surface-200 text-surface-500"
                    )}
                  >
                    {i + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Job Info */}
      {job && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 font-bold text-surface-900">Ish haqida</h2>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white">
              {(job.company?.name || "K")[0]}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-surface-900">{job.title}</h3>
              <p className="text-surface-600">{job.company?.name || "Kompaniya"}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-sm text-surface-500">
                {job.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {job.location}
                  </span>
                )}
                {(job.salary_min || job.salary_max) && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Wallet className="h-4 w-4" />
                    {formatSalaryRange(job.salary_min, job.salary_max, "uz", job.salary_currency || "USD")}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link href={`/student/jobs/${job.id}`} className="flex-1">
              <Button variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                Ishni ko'rish
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Application Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 font-bold text-surface-900">Ariza tafsilotlari</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-surface-500">Ariza berilgan sana</span>
            <span className="font-medium">{formatDate(application.applied_at)}</span>
          </div>
          {application.reviewed_at && (
            <div className="flex justify-between">
              <span className="text-surface-500">Ko'rib chiqilgan</span>
              <span className="font-medium">{formatDate(application.reviewed_at)}</span>
            </div>
          )}
          {applicationDetails.interview_at && (
            <div className="flex justify-between">
              <span className="text-surface-500">Intervyu sanasi</span>
              <span className="font-medium text-emerald-600">
                <Calendar className="mr-1 inline h-4 w-4" />
                {formatDate(applicationDetails.interview_at)}
              </span>
            </div>
          )}
        </div>

        {(application.status === "interview" ||
          applicationDetails.interview_type ||
          applicationDetails.meeting_link) && (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="mb-3 text-sm font-semibold text-surface-700">
              Intervyu ma&apos;lumotlari
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-surface-500">Format</span>
                <span className="font-medium text-surface-900">
                  {formatInterviewTypeLabel(applicationDetails.interview_type)}
                </span>
              </div>
              {applicationDetails.meeting_link ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-surface-500">{isRu ? "Ссылка на встречу" : "Uchrashuv havolasi"}</span>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full border-emerald-200 bg-white px-3 text-emerald-700 hover:bg-emerald-50"
                  >
                    <a
                      href={applicationDetails.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ochish
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-surface-500">{isRu ? "Ссылка на встречу" : "Uchrashuv havolasi"}</span>
                  <span className="font-medium text-surface-500">Mavjud emas</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Motivation Letter */}
        {applicationDetails.cover_letter && (
          <div className="mt-4 rounded-xl border border-surface-100 bg-surface-50 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-surface-700">
              <MessageSquare className="h-4 w-4" /> {isRu ? "Сопроводительное письмо" : "Motivatsion xat"}
            </p>
            <p className="text-sm text-surface-600 leading-relaxed whitespace-pre-wrap">
              {applicationDetails.cover_letter}
            </p>
          </div>
        )}
      </motion.div>

      {/* Withdraw */}
      {(application.status === "pending" || application.status === "reviewing") && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end"
        >
          <Button
            variant="outline"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            {isWithdrawing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Arizani qaytarib olish
          </Button>
        </motion.div>
      )}
    </div>
  );
}
