"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  Loader2,
  AlertCircle,
  Building2,
  Download,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  ChevronRight,
  Target,
  Check,
  Minus,
  Sparkles,
  Tag,
  X,
  Send,
  CalendarPlus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { aiApi, applicationApi, getErrorMessage } from "@/lib/api";
import { formatDate, formatRelativeTime, cn } from "@/lib/utils";
import type { Application, KnownApplicationStatus } from "@/types/api";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InterviewFormat = "video" | "phone" | "in-person";

const statusConfig: Record<KnownApplicationStatus, { label: string; color: string; icon: any }> = {
  pending: { label: "Kutilmoqda", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  reviewing: { label: "Ko'rib chiqilmoqda", color: "bg-blue-100 text-blue-700", icon: Eye },
  shortlisted: { label: "Saralangan", color: "bg-amber-100 text-amber-700", icon: Award },
  interview: { label: "Intervyu", color: "bg-purple-100 text-purple-700", icon: User },
  accepted: { label: "Qabul qilindi", color: "bg-green-100 text-green-700", icon: CheckCircle },
  hired: { label: "Yollandi", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  rejected: { label: "Rad etildi", color: "bg-red-100 text-red-700", icon: XCircle },
  withdrawn: { label: "Bekor qilingan", color: "bg-surface-100 text-surface-600", icon: XCircle },
};

const statusActions: KnownApplicationStatus[] = [
  "pending",
  "reviewing",
  "shortlisted",
  "accepted",
  "hired",
  "rejected",
];

const interviewFormatLabels: Record<
  InterviewFormat,
  { label: string; helper: string }
> = {
  video: {
    label: "Video intervyu",
    helper: "Zoom, Meet yoki boshqa online havola ishlatiladi.",
  },
  phone: {
    label: "Telefon intervyu",
    helper: "Telefon orqali intervyu uchun havola kerak emas.",
  },
  "in-person": {
    label: "Ofisda intervyu",
    helper: "Ofis yoki boshqa manzilda uchrashuv belgilanadi.",
  },
};

function toDatetimeLocalValue(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

type InterviewCalendarPayload = {
  title: string;
  description: string;
  location: string;
  startIso: string;
  endIso: string;
  candidateEmail?: string;
};

function toGoogleUtcDate(value: string): string {
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  const hours = `${date.getUTCHours()}`.padStart(2, "0");
  const minutes = `${date.getUTCMinutes()}`.padStart(2, "0");
  const seconds = `${date.getUTCSeconds()}`.padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

function buildGoogleCalendarUrl(payload: InterviewCalendarPayload): string {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", payload.title);
  url.searchParams.set(
    "dates",
    `${toGoogleUtcDate(payload.startIso)}/${toGoogleUtcDate(payload.endIso)}`
  );
  url.searchParams.set("details", payload.description);
  url.searchParams.set("location", payload.location);
  if (payload.candidateEmail) {
    url.searchParams.set("add", payload.candidateEmail);
  }
  return url.toString();
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildIcsContent(payload: InterviewCalendarPayload): string {
  const uid = `ishtop-${Date.now()}@calendar`;
  const now = toGoogleUtcDate(new Date().toISOString());
  const start = toGoogleUtcDate(payload.startIso);
  const end = toGoogleUtcDate(payload.endIso);
  const attendees = payload.candidateEmail
    ? `\nATTENDEE;CN=Candidate:mailto:${payload.candidateEmail}`
    : "";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//IshTop//Interview Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(payload.title)}`,
    `DESCRIPTION:${escapeIcs(payload.description)}`,
    `LOCATION:${escapeIcs(payload.location)}`,
    `ORGANIZER;CN=IshTop:mailto:no-reply@ishtop.uz${attendees}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\n");
}

function sanitizeInterviewNotes(value?: string | null): string {
  if (!value) return "";
  if (value.toLowerCase().includes("seeded for")) return "";
  return value;
}

function recommendationLabel(
  value: "shortlist" | "review" | "pass",
  isRu: boolean,
): string {
  if (isRu) {
    if (value === "shortlist") return "Шорт-лист";
    if (value === "review") return "Доп. проверка";
    return "Отказ";
  }
  if (value === "shortlist") return "Saralash";
  if (value === "review") return "Qo'shimcha ko'rik";
  return "Rad etish";
}

function localizeMatchReason(reason: string, isRu: boolean): string {
  const matchedTerms = reason.match(/^Matched\s+(\d+)\/(\d+)\s+requirement terms$/i);
  if (matchedTerms) {
    const [, matched, total] = matchedTerms;
    return isRu
      ? `Совпало ${matched}/${total} требований`
      : `${matched}/${total} talab bo'yicha moslik aniqlandi`;
  }

  const titleOverlap = reason.match(/^Title\/domain overlap detected:\s*(.+)$/i);
  if (titleOverlap) {
    return isRu
      ? `Обнаружено совпадение по должности/домену: ${titleOverlap[1]}`
      : `Lavozim/yo'nalish bo'yicha moslik topildi: ${titleOverlap[1]}`;
  }

  const normalized = reason.trim().toLowerCase();
  const dictionary: Record<string, { ru: string; uz: string }> = {
    "job requirements are broad, using title/experience matching": {
      ru: "Требования описаны широко, использовано сопоставление по роли и опыту",
      uz: "Talablar umumiy berilgan, shuning uchun lavozim va tajriba bo'yicha moslashtirildi",
    },
    "experience level matches perfectly": {
      ru: "Уровень опыта идеально совпадает",
      uz: "Tajriba darajasi to'liq mos",
    },
    "slightly over-qualified (good!)": {
      ru: "Кандидат немного сильнее требований (это хорошо)",
      uz: "Nomzod talabdan biroz yuqori malakali (bu ijobiy holat)",
    },
    "slightly under-qualified, but close": {
      ru: "Опыт чуть ниже, но близок к требованиям",
      uz: "Tajriba biroz pastroq, lekin talabga yaqin",
    },
    "may be over-qualified for this role": {
      ru: "Возможна избыточная квалификация для этой роли",
      uz: "Bu rol uchun ortiqcha malaka bo'lishi mumkin",
    },
    "remote/hybrid flexibility is available": {
      ru: "Доступен удалённый/гибридный формат работы",
      uz: "Masofaviy yoki gibrid format mavjud",
    },
    "skill overlap against job requirements": {
      ru: "Навыки кандидата по отношению к требованиям вакансии",
      uz: "Ko'nikmalar vakansiya talablariga nisbatan tahlil qilindi",
    },
    "experience alignment and profile completeness": {
      ru: "Соответствие опыта и полнота профиля",
      uz: "Tajriba mosligi va profil to'liqligi baholandi",
    },
  };

  if (dictionary[normalized]) {
    return isRu ? dictionary[normalized].ru : dictionary[normalized].uz;
  }

  return reason;
}

export default function ApplicantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params!.id as string;
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [interviewDateTime, setInterviewDateTime] = useState("");
  const [interviewFormat, setInterviewFormat] = useState<InterviewFormat>("video");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  // AI HR panel state
  type AISummary = {
    summary: string;
    strengths: string[];
    gaps: string[];
    recommendation: "shortlist" | "review" | "pass";
    fit_score: number | null;
    ai_generated: boolean;
  };
  type AIQuestion = { question: string; category: string; rationale: string };
  type AIEmail = { subject: string; body: string; ai_generated: boolean };
  type MessageHistoryItem = {
    id?: string;
    sent_at?: string;
    sender_id?: string;
    sender_name?: string;
    channel?: string;
    subject: string;
    body: string;
    template_key?: string;
    delivered?: boolean;
  };

  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[] | null>(null);
  const [aiQuestionsLoading, setAiQuestionsLoading] = useState(false);
  const [aiEmail, setAiEmail] = useState<AIEmail | null>(null);
  const [aiEmailLoading, setAiEmailLoading] = useState<null | "interview" | "reject" | "offer" | "shortlist">(null);
  const [aiEmailSending, setAiEmailSending] = useState(false);

  const [privateNotes, setPrivateNotes] = useState("");
  const [privateTags, setPrivateTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [inviteSending, setInviteSending] = useState(false);

  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState<
    "blank" | "taklif" | "shortlist" | "offer" | "reject"
  >("blank");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageSending, setMessageSending] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [messageHistory, setMessageHistory] = useState<MessageHistoryItem[]>([]);

  // Structured interview scorecard
  type Scorecard = {
    id: string;
    technical_score: number | null;
    communication_score: number | null;
    cultural_fit_score: number | null;
    motivation_score: number | null;
    problem_solving_score: number | null;
    overall_score: number | null;
    recommendation: "hire" | "maybe" | "pass" | null;
    notes: string | null;
    created_at: string | null;
    evaluator: { id: string | null; name: string | null };
  };
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [scoreForm, setScoreForm] = useState({
    technical_score: 0,
    communication_score: 0,
    cultural_fit_score: 0,
    motivation_score: 0,
    problem_solving_score: 0,
    recommendation: "" as "" | "hire" | "maybe" | "pass",
    notes: "",
  });
  const [scoreSubmitting, setScoreSubmitting] = useState(false);

  const loadScorecards = async () => {
    try {
      const res = await applicationApi.listScorecards(appId);
      setScorecards((res.data as { data: { scorecards: Scorecard[] } }).data.scorecards || []);
    } catch {
      /* ignore */
    }
  };

  const submitScorecard = async () => {
    setScoreSubmitting(true);
    try {
      await applicationApi.submitScorecard(appId, {
        technical_score: scoreForm.technical_score || null,
        communication_score: scoreForm.communication_score || null,
        cultural_fit_score: scoreForm.cultural_fit_score || null,
        motivation_score: scoreForm.motivation_score || null,
        problem_solving_score: scoreForm.problem_solving_score || null,
        recommendation: scoreForm.recommendation || null,
        notes: scoreForm.notes || null,
      });
      toast.success(isRu ? "Оценка сохранена" : "Baholash saqlandi");
      setScoreForm({
        technical_score: 0,
        communication_score: 0,
        cultural_fit_score: 0,
        motivation_score: 0,
        problem_solving_score: 0,
        recommendation: "",
        notes: "",
      });
      await loadScorecards();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || (e as Error).message);
    } finally {
      setScoreSubmitting(false);
    }
  };

  const fetchAiSummary = async () => {
    setAiSummaryLoading(true);
    try {
      const res = await aiApi.hrCandidateSummary(appId, locale);
      setAiSummary((res.data as { data: AISummary }).data);
    } catch (e) {
      toast.error((e as Error).message || (isRu ? "Ошибка AI" : "AI xatosi"));
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const fetchAiQuestions = async () => {
    setAiQuestionsLoading(true);
    try {
      const res = await aiApi.hrInterviewQuestions(appId, 8, locale);
      setAiQuestions((res.data as { data: { questions: AIQuestion[] } }).data.questions);
    } catch (e) {
      toast.error((e as Error).message || (isRu ? "Ошибка AI" : "AI xatosi"));
    } finally {
      setAiQuestionsLoading(false);
    }
  };

  const fetchAiEmail = async (action: "interview" | "reject" | "offer" | "shortlist") => {
    setAiEmailLoading(action);
    try {
      const res = await aiApi.hrEmailTemplate(appId, { action, locale });
      setAiEmail((res.data as { data: AIEmail }).data);
    } catch (e) {
      toast.error((e as Error).message || (isRu ? "Ошибка AI" : "AI xatosi"));
    } finally {
      setAiEmailLoading(null);
    }
  };

  const addTag = (rawValue: string) => {
    const value = rawValue.trim();
    if (!value) return;
    setPrivateTags((prev) => {
      if (prev.some((tag) => tag.toLowerCase() === value.toLowerCase())) return prev;
      return [...prev, value].slice(0, 20);
    });
  };

  const removeTag = (value: string) => {
    setPrivateTags((prev) => prev.filter((tag) => tag !== value));
  };

  const saveNotesAndTags = async () => {
    setNotesSaving(true);
    try {
      const response = await applicationApi.updateNotesTags(appId, {
        notes: privateNotes.trim() || undefined,
        tags: privateTags,
      });
      const updated = (response.data as { data?: Application }).data;
      if (updated) {
        setApplication(updated);
      }
      toast.success(isRu ? "Заметки и теги сохранены" : "Eslatma va teglar saqlandi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : getErrorMessage(error));
    } finally {
      setNotesSaving(false);
    }
  };

  const loadMessageHistory = async () => {
    try {
      const response = await applicationApi.getMessages(appId);
      const payload = response.data as { data?: { messages?: MessageHistoryItem[] } };
      setMessageHistory(payload.data?.messages || []);
    } catch {
      // ignore non-critical history loading errors
    }
  };

  const applyMessageTemplate = async (
    template: "blank" | "taklif" | "shortlist" | "offer" | "reject"
  ) => {
    setMessageTemplate(template);
    if (template === "blank") return;

    const actionMap: Record<"taklif" | "shortlist" | "offer" | "reject", "interview" | "shortlist" | "offer" | "reject"> = {
      taklif: "interview",
      shortlist: "shortlist",
      offer: "offer",
      reject: "reject",
    };

    setTemplateLoading(true);
    try {
      const response = await aiApi.hrEmailTemplate(appId, {
        action: actionMap[template],
        locale,
      });
      const tpl = (response.data as { data?: AIEmail }).data;
      setMessageSubject(tpl?.subject || "");
      setMessageBody(tpl?.body || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : getErrorMessage(error));
    } finally {
      setTemplateLoading(false);
    }
  };

  const sendApplicantMessage = async () => {
    const subject = messageSubject.trim();
    const body = messageBody.trim();
    if (!subject || !body) {
      toast.error(isRu ? "Введите тему и текст сообщения" : "Xabar mavzusi va matnini kiriting");
      return;
    }

    setMessageSending(true);
    try {
      const response = await applicationApi.sendMessage(appId, {
        subject,
        body,
        template_key: messageTemplate !== "blank" ? messageTemplate : undefined,
      });
      const payload = response.data as { data?: { delivered?: boolean; messages?: MessageHistoryItem[] } };
      if (payload.data?.messages) {
        setMessageHistory(payload.data.messages);
      } else {
        await loadMessageHistory();
      }
      toast.success(
        payload.data?.delivered
          ? isRu
            ? "Сообщение отправлено"
            : "Xabar yuborildi"
          : isRu
            ? "Сообщение сохранено в истории, но доставка не удалась"
            : "Xabar tarixga yozildi, lekin yetkazilmadi"
      );
      setMessageDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : getErrorMessage(error));
    } finally {
      setMessageSending(false);
    }
  };

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        setIsLoading(true);
        const res = await applicationApi.get(appId);
        setApplication(res.data?.data || res.data);
      } catch {
        setError("Ariza topilmadi.");
      } finally {
        setIsLoading(false);
      }
    };
    if (appId) {
      fetchApplication();
      void loadScorecards();
      void loadMessageHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  useEffect(() => {
    setInterviewDateTime(toDatetimeLocalValue(application?.interview_at));
    setInterviewFormat((application?.interview_type as InterviewFormat) || "video");
    setMeetingLink(application?.meeting_link || "");
    setInterviewNotes(sanitizeInterviewNotes(application?.notes));
    setPrivateNotes(sanitizeInterviewNotes(application?.notes));
    setPrivateTags(application?.tags || []);
    setMessageHistory((application?.message_history || []) as MessageHistoryItem[]);
  }, [
    application?.id,
    application?.interview_at,
    application?.interview_type,
    application?.meeting_link,
    application?.notes,
    application?.tags,
    application?.message_history,
  ]);

  const handleStatusChange = async (newStatus: KnownApplicationStatus) => {
    setIsUpdating(true);
    try {
      const response = await applicationApi.updateStatus(appId, { status: newStatus });
      const updatedApplication = response.data?.data || response.data;
      setApplication((prev) =>
        updatedApplication
          ? { ...prev, ...updatedApplication }
          : prev
      );
      toast.success(`Holat "${statusConfig[newStatus]?.label}" ga o'zgartirildi.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Holatni o'zgartirishda xatolik.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInterviewSchedule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!interviewDateTime) {
      toast.error("Intervyu sana va vaqtini kiriting.");
      return;
    }

    const interviewAt = new Date(interviewDateTime);
    if (Number.isNaN(interviewAt.getTime())) {
      toast.error("Intervyu sanasi noto'g'ri.");
      return;
    }

    setIsUpdating(true);
    try {
      const normalizedMeetingLink = meetingLink.trim();
      const payload = {
        status: "interview" as const,
        interview_at: interviewAt.toISOString(),
        interview_type: interviewFormat,
        meeting_link: interviewFormat === "video" && normalizedMeetingLink ? normalizedMeetingLink : undefined,
        notes: interviewNotes.trim() || undefined,
      };

      const response = await applicationApi.updateStatus(appId, payload);
      const updatedApplication = response.data?.data || response.data;
      setApplication((prev) =>
        updatedApplication
          ? { ...prev, ...updatedApplication }
          : prev
      );
      setInterviewDateTime(toDatetimeLocalValue(updatedApplication?.interview_at || payload.interview_at));
      setInterviewFormat((updatedApplication?.interview_type as InterviewFormat) || interviewFormat);
      setMeetingLink(updatedApplication?.meeting_link || payload.meeting_link || "");
      setInterviewNotes(sanitizeInterviewNotes(updatedApplication?.notes || payload.notes || ""));
      toast.success("Intervyu muvaffaqiyatli belgilandi.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Intervyuni belgilashda xatolik.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
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

  const applicant = application.applicant;
  const resume = application.resume;
  const job = application.job;
  const status = statusConfig[application.status as KnownApplicationStatus] || statusConfig.pending;
  const StatusIcon = status.icon;
  const isVideoInterview = interviewFormat === "video";
  const interviewIso =
    application.interview_at ||
    (interviewDateTime ? new Date(interviewDateTime).toISOString() : "");
  const calendarPayload: InterviewCalendarPayload | null = interviewIso
    ? {
        title: `${job?.title || "Vakansiya"} — ${isRu ? "Собеседование" : "Intervyu"}`,
        description: isRu
          ? `Кандидат: ${applicant?.full_name || "—"}\nПозиция: ${job?.title || "—"}\n${
              interviewNotes?.trim() ? `Комментарий: ${interviewNotes.trim()}` : ""
            }`
          : `Nomzod: ${applicant?.full_name || "—"}\nLavozim: ${job?.title || "—"}\n${
              interviewNotes?.trim() ? `Izoh: ${interviewNotes.trim()}` : ""
            }`,
        location:
          interviewFormat === "video"
            ? meetingLink.trim() || (isRu ? "Онлайн" : "Onlayn")
            : interviewFormat === "phone"
              ? isRu
                ? "Телефон"
                : "Telefon"
              : isRu
                ? "Офлайн встреча"
                : "Ofis uchrashuvi",
        startIso: interviewIso,
        endIso: new Date(new Date(interviewIso).getTime() + 60 * 60 * 1000).toISOString(),
        candidateEmail: applicant?.email || undefined,
      }
    : null;
  const googleCalendarUrl = calendarPayload ? buildGoogleCalendarUrl(calendarPayload) : "";

  const downloadOutlookIcs = () => {
    if (!calendarPayload) return;
    const ics = buildIcsContent(calendarPayload);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `interview-${job?.title || "job"}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const sendCalendarInviteToCandidate = async () => {
    if (!calendarPayload || !applicant?.email) return;
    setInviteSending(true);
    try {
      const subject = isRu
        ? `Приглашение на собеседование — ${job?.title || "вакансия"}`
        : `Intervyu taklifi — ${job?.title || "vakansiya"}`;
      const body = isRu
        ? `Здравствуйте, ${applicant.full_name || "кандидат"}!\n\nПриглашаем вас на собеседование.\nДата и время: ${formatDate(
            calendarPayload.startIso
          )}\nGoogle Calendar: ${googleCalendarUrl}\n\nС уважением,\nIshTop`
        : `Assalomu alaykum, ${applicant.full_name || "nomzod"}!\n\nSizni intervyuga taklif qilamiz.\nSana va vaqt: ${formatDate(
            calendarPayload.startIso
          )}\nGoogle Calendar: ${googleCalendarUrl}\n\nHurmat bilan,\nIshTop`;
      await applicationApi.sendMessage(appId, {
        subject,
        body,
        template_key: "interview_calendar",
      });
      toast.success(isRu ? "Календарное приглашение отправлено" : "Calendar taklif yuborildi");
      await loadMessageHistory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : getErrorMessage(error));
    } finally {
      setInviteSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      {/* Back */}
      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-surface-600">
          <ArrowLeft className="h-4 w-4" />
          Arizalarga qaytish
        </Button>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Applicant Info */}
        <div className="space-y-4">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-surface-200 bg-white p-6 shadow-sm text-center dark:border-surface-700 dark:bg-surface-800"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-3xl font-bold text-white">
              {(applicant?.full_name || "A")[0].toUpperCase()}
            </div>
            <h2 className="mt-3 text-lg font-bold text-surface-900">
              {applicant?.full_name || "Noma'lum"}
            </h2>
            <p className="text-sm text-surface-500">{applicant?.email || "—"}</p>

            <div className="mt-4 space-y-2 text-left text-sm">
              {applicant?.phone && (
                <div className="flex items-center gap-2 text-surface-600">
                  <Phone className="h-4 w-4 text-surface-400" />
                  {applicant.phone}
                </div>
              )}
              {applicant?.location && (
                <div className="flex items-center gap-2 text-surface-600">
                  <MapPin className="h-4 w-4 text-surface-400" />
                  {applicant.location}
                </div>
              )}
            </div>

            <Badge className={cn("mt-4", status.color)}>
              <StatusIcon className="mr-1 h-3 w-3" />
              {status.label}
            </Badge>
          </motion.div>

          {/* Status Change */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
          >
            <h3 className="mb-3 font-semibold text-surface-900">Holat o'zgartirish</h3>
            <div className="space-y-2">
              {statusActions.map((key) => {
                const cfg = statusConfig[key];
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    disabled={isUpdating || application.status === key}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl p-2.5 text-sm font-medium transition-all",
                      application.status === key
                        ? cn("cursor-default", cfg.color)
                        : "hover:bg-surface-50 text-surface-600"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                    {application.status === key && (
                      <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
          >
            <h3 className="mb-3 font-semibold text-surface-900 dark:text-white">
              {isRu ? "Связь с кандидатом" : "Nomzod bilan aloqa"}
            </h3>
            <Button className="w-full" onClick={() => setMessageDialogOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              {isRu ? "Отправить сообщение" : "Xabar yuborish"}
            </Button>
          </motion.div>
        </div>

        {/* Right: Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Interview scheduling */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 font-semibold text-surface-900">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  Intervyu jadvali
                </h3>
                <p className="mt-1 text-sm text-surface-500">
                  Intervyu statusi faqat sana, vaqt va ixtiyoriy izoh bilan belgilanishi kerak.
                </p>
              </div>
              {application.status === "interview" && (
                <Badge className="bg-purple-100 text-purple-700">Intervyu faol</Badge>
              )}
            </div>

            {application.interview_at && (
              <div className="mt-4 rounded-xl border border-purple-100 bg-purple-50 p-3 text-sm text-surface-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-surface-200">
                <p className="font-medium text-surface-900">Joriy intervyu vaqti</p>
                <p className="mt-1">{formatDate(application.interview_at)}</p>
                <p className="mt-1">
                  Format: {application.interview_type ? interviewFormatLabels[application.interview_type as InterviewFormat]?.label || application.interview_type : "Belgilanmagan"}
                </p>
                {application.meeting_link && (
                  <p className="mt-1 break-all">
                    Havola:{" "}
                    <a
                      href={application.meeting_link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-medium text-purple-700 hover:underline"
                    >
                      {application.meeting_link}
                    </a>
                  </p>
                )}
              </div>
            )}

            <form className="mt-4 space-y-4" onSubmit={handleInterviewSchedule}>
              <div className="space-y-2">
                <Label htmlFor="interview-at">Sana va vaqt</Label>
                <Input
                  id="interview-at"
                  type="datetime-local"
                  step="60"
                  value={interviewDateTime}
                  onChange={(event) => setInterviewDateTime(event.target.value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interview-format">Intervyu formati</Label>
                <select
                  id="interview-format"
                  value={interviewFormat}
                  onChange={(event) => {
                    const nextValue = event.target.value as InterviewFormat;
                    setInterviewFormat(nextValue);
                    if (nextValue !== "video") {
                      setMeetingLink("");
                    }
                  }}
                  disabled={isUpdating}
                  className={cn(
                    "flex h-10 w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100",
                    "focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  )}
                >
                  {Object.entries(interviewFormatLabels).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-surface-500">
                  {interviewFormatLabels[interviewFormat].helper}
                </p>
              </div>

              {isVideoInterview && (
                <div className="space-y-2">
                  <Label htmlFor="meeting-link">{isRu ? "Ссылка на встречу" : "Uchrashuv havolasi"}</Label>
                  <Input
                    id="meeting-link"
                    type="url"
                    value={meetingLink}
                    onChange={(event) => setMeetingLink(event.target.value)}
                    placeholder="https://..."
                    disabled={isUpdating}
                  />
                  <p className="text-xs text-surface-500">
                    Video intervyu uchun tavsiya etiladi.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="interview-notes">Izoh</Label>
                <Textarea
                  id="interview-notes"
                  value={interviewNotes}
                  onChange={(event) => setInterviewNotes(event.target.value)}
                  placeholder="Masalan: Zoom link, panel tarkibi yoki qo'shimcha ko'rsatmalar"
                  disabled={isUpdating}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={isUpdating || !interviewDateTime}
                  className="min-w-[180px]"
                >
                  {isUpdating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Calendar className="mr-2 h-4 w-4" />
                  )}
                  {application.status === "interview" ? "Intervyuni yangilash" : "Intervyuni belgilash"}
                </Button>
                <p className="text-sm text-surface-500">
                  Bu forma statusni avtomatik ravishda <span className="font-medium text-surface-700">interview</span> ga o'tkazadi va formatni saqlaydi.
                </p>
              </div>

              {calendarPayload && (
                <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700">
                  <p className="mb-2 text-sm font-medium text-surface-800 dark:text-surface-100">
                    {isRu ? "Экспорт в календарь" : "Calendar integratsiyasi"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline">
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Google Calendar&apos;ga qo&apos;shish
                      </Button>
                    </a>
                    <Button type="button" variant="outline" onClick={downloadOutlookIcs}>
                      <Download className="mr-2 h-4 w-4" />
                      Outlook (.ics)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void sendCalendarInviteToCandidate()}
                      disabled={inviteSending || !applicant?.email}
                    >
                      {inviteSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {isRu ? "Отправить invite" : "Nomzodga invite yuborish"}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-surface-900 dark:text-white">
                {isRu ? "Личные заметки и теги" : "Shaxsiy eslatmalar va teglar"}
              </h3>
              <Button size="sm" onClick={() => void saveNotesAndTags()} disabled={notesSaving}>
                {notesSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                {isRu ? "Сохранить" : "Saqlash"}
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              <Label htmlFor="private-notes">{isRu ? "Личная заметка" : "Ichki eslatma"}</Label>
              <Textarea
                id="private-notes"
                rows={4}
                value={privateNotes}
                onChange={(event) => setPrivateNotes(event.target.value)}
                placeholder={
                  isRu
                    ? "Короткая внутренняя заметка о кандидате..."
                    : "Nomzod haqida ichki eslatma yozing..."
                }
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label htmlFor="tag-input">{isRu ? "Теги" : "Teglar"}</Label>
              <div className="flex gap-2">
                <Input
                  id="tag-input"
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addTag(tagInput);
                      setTagInput("");
                    }
                  }}
                  placeholder={isRu ? "Например: Сильный кандидат" : "Masalan: Kuchli kandidat"}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    addTag(tagInput);
                    setTagInput("");
                  }}
                >
                  {isRu ? "Добавить" : "Qo'shish"}
                </Button>
              </div>
              {privateTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {privateTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-200 dark:hover:bg-brand-500/30"
                        aria-label={isRu ? "Удалить тег" : "Tegni o'chirish"}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Job Info */}
          {job && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
            >
              <h3 className="mb-3 font-semibold text-surface-900">Ish e'loni</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-surface-900">{job.title}</p>
                  <p className="text-sm text-surface-500">{formatDate(application.applied_at)} da ariza berilgan</p>
                </div>
                <Link href={job?.id ? `/company/jobs/${job.id}/edit` : "/company/jobs"}>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Ko'rish
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Motivation Letter */}
          {application.cover_letter && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
            >
              <h3 className="mb-3 flex items-center gap-2 font-semibold text-surface-900 dark:text-white">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                {isRu ? "Сопроводительное письмо" : "Motivatsion xat"}
              </h3>
              <p className="text-sm text-surface-600 leading-relaxed whitespace-pre-wrap dark:text-surface-300">
                {application.cover_letter}
              </p>
            </motion.div>
          )}

          {/* Match Breakdown — transparency for HR on how the score was computed */}
          {application.match_breakdown && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-surface-900 dark:text-white">
                  <Target className="h-5 w-5 text-purple-500" />
                  {isRu ? "Анализ совпадения" : "Moslik tahlili"}
                </h3>
                {(() => {
                  const score = Math.round(application.match_breakdown.score);
                  const tone =
                    score >= 80
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : score >= 60
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                      : "bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300";
                  return (
                    <div className={`flex flex-col items-end rounded-xl px-3 py-2 ${tone}`}>
                      <span className="text-2xl font-bold leading-none">{score}%</span>
                      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
                        {isRu ? "Совпадение" : "Moslik"}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {isRu ? "Совпавшие навыки" : "Mos ko'nikmalar"} ({application.match_breakdown.matched_skills.length})
                  </p>
                  {application.match_breakdown.matched_skills.length > 0 ? (
                    <ul className="space-y-1">
                      {application.match_breakdown.matched_skills.slice(0, 10).map((skill) => (
                        <li key={skill} className="flex items-start gap-2 text-sm text-surface-700 dark:text-surface-300">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                          <span>{skill}</span>
                        </li>
                      ))}
                      {application.match_breakdown.matched_skills.length > 10 && (
                        <li className="text-xs text-surface-500">
                          +{application.match_breakdown.matched_skills.length - 10}
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-surface-500">—</p>
                  )}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    {isRu ? "Недостающие навыки" : "Yetishmayotgan ko'nikmalar"} ({application.match_breakdown.missing_skills.length})
                  </p>
                  {application.match_breakdown.missing_skills.length > 0 ? (
                    <ul className="space-y-1">
                      {application.match_breakdown.missing_skills.slice(0, 10).map((skill) => (
                        <li key={skill} className="flex items-start gap-2 text-sm text-surface-700 dark:text-surface-300">
                          <Minus className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
                          <span>{skill}</span>
                        </li>
                      ))}
                      {application.match_breakdown.missing_skills.length > 10 && (
                        <li className="text-xs text-surface-500">
                          +{application.match_breakdown.missing_skills.length - 10}
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-surface-500">—</p>
                  )}
                </div>
              </div>

              {application.match_breakdown.reasons.length > 0 && (
                <div className="mt-4 border-t border-surface-200 pt-4 dark:border-surface-700">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    {isRu ? "Как рассчитан балл" : "Ball qanday hisoblandi"}
                  </p>
                  <ul className="space-y-1 text-sm text-surface-600 dark:text-surface-300">
                    {application.match_breakdown.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-surface-400" />
                        <span>{localizeMatchReason(reason, isRu)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

          {/* AI HR Panel — Summary + Interview Questions + Email Drafts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm dark:border-purple-500/30 dark:from-purple-500/10 dark:to-surface-800"
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-md">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
                  {isRu ? "AI HR помощник" : "AI HR yordamchi"}
                </h3>
                <p className="text-xs text-surface-500">
                  {isRu
                    ? "Анализ кандидата, вопросы для интервью и шаблоны писем."
                    : "Nomzod tahlili, intervyu savollari va xat shablonlari."}
                </p>
              </div>
            </div>

            {/* AI Summary */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  {isRu ? "Краткое резюме кандидата" : "Nomzod tahlili"}
                </p>
                {!aiSummary && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={aiSummaryLoading}
                    onClick={() => void fetchAiSummary()}
                  >
                    {aiSummaryLoading ? (
                      <>
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        {isRu ? "Анализ…" : "Tahlil…"}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-1 h-3.5 w-3.5" />
                        {isRu ? "Сгенерировать" : "Yaratish"}
                      </>
                    )}
                  </Button>
                )}
              </div>
              {aiSummary && (
                <div className="rounded-xl border border-purple-100 bg-white p-4 dark:border-purple-500/20 dark:bg-surface-900/50">
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex-1 text-sm leading-relaxed text-surface-700 dark:text-surface-300">
                      {aiSummary.summary}
                    </p>
                    <div className="flex flex-col items-end gap-1">
                      {aiSummary.fit_score !== null && (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          {aiSummary.fit_score}%
                        </span>
                      )}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          aiSummary.recommendation === "shortlist"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                            : aiSummary.recommendation === "pass"
                            ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                        }`}
                      >
                        {recommendationLabel(aiSummary.recommendation, isRu)}
                      </span>
                    </div>
                  </div>
                  {aiSummary.strengths.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {isRu ? "Сильные стороны" : "Kuchli tomonlar"}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-sm text-surface-700 dark:text-surface-300">
                        {aiSummary.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {aiSummary.gaps.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {isRu ? "Зоны риска" : "Kamchiliklar"}
                      </p>
                      <ul className="mt-1 space-y-0.5 text-sm text-surface-700 dark:text-surface-300">
                        {aiSummary.gaps.map((g, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-600" />
                            <span>{g}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Interview Questions */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                  {isRu ? "Вопросы для интервью" : "Intervyu savollari"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={aiQuestionsLoading}
                  onClick={() => void fetchAiQuestions()}
                >
                  {aiQuestionsLoading ? (
                    <>
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      {isRu ? "Генерация…" : "Generatsiya…"}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                      {aiQuestions ? (isRu ? "Перегенерировать" : "Qayta yaratish") : (isRu ? "Сгенерировать" : "Yaratish")}
                    </>
                  )}
                </Button>
              </div>
              {aiQuestions && aiQuestions.length > 0 && (
                <ol className="space-y-2 rounded-xl border border-purple-100 bg-white p-4 dark:border-purple-500/20 dark:bg-surface-900/50">
                  {aiQuestions.map((q, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-surface-900 dark:text-white">{q.question}</p>
                        {q.category && (
                          <span className="mt-0.5 inline-block rounded-md bg-surface-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-surface-600 dark:bg-surface-700 dark:text-surface-300">
                            {q.category}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* AI Email Templates */}
            <div className="mt-5 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                {isRu ? "Шаблон письма кандидату" : "Nomzodga xat shabloni"}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["interview", "shortlist", "offer", "reject"] as const).map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    variant="outline"
                    disabled={aiEmailLoading !== null}
                    onClick={() => void fetchAiEmail(action)}
                  >
                    {aiEmailLoading === action ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3.5 w-3.5" />
                    )}
                    {action === "interview" && (isRu ? "Приглашение" : "Taklif")}
                    {action === "shortlist" && (isRu ? "Шорт-лист" : "Saralash")}
                    {action === "offer" && (isRu ? "Оффер" : "Taklif xati")}
                    {action === "reject" && (isRu ? "Отказ" : "Rad etish")}
                  </Button>
                ))}
              </div>
              {aiEmail && (
                <div className="space-y-2 rounded-xl border border-purple-100 bg-white p-4 dark:border-purple-500/20 dark:bg-surface-900/50">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                      {isRu ? "Тема" : "Mavzu"}
                    </p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {aiEmail.subject}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">
                      {isRu ? "Текст" : "Matn"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-surface-700 dark:text-surface-300">
                      {aiEmail.body}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${aiEmail.subject}\n\n${aiEmail.body}`);
                        toast.success(isRu ? "Скопировано" : "Nusxalandi");
                      }}
                    >
                      {isRu ? "Скопировать" : "Nusxalash"}
                    </Button>
                    <Button
                      size="sm"
                      disabled={aiEmailSending}
                      onClick={async () => {
                        if (!aiEmail) return;
                        setAiEmailSending(true);
                        try {
                          const response = await applicationApi.sendMessage(appId, {
                            subject: aiEmail.subject,
                            body: aiEmail.body,
                            template_key: "ai_panel",
                          });
                          const payload = response.data as { data?: { messages?: MessageHistoryItem[] } };
                          if (payload.data?.messages) {
                            setMessageHistory(payload.data.messages);
                          } else {
                            await loadMessageHistory();
                          }
                          toast.success(isRu ? "Письмо отправлено" : "Xat yuborildi");
                        } catch (e: any) {
                          const msg = e?.response?.data?.detail || (e as Error).message;
                          toast.error(msg);
                        } finally {
                          setAiEmailSending(false);
                        }
                      }}
                    >
                      {aiEmailSending ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          {isRu ? "Отправляется…" : "Yuborilmoqda…"}
                        </>
                      ) : (
                        <>
                          <Mail className="mr-1 h-3.5 w-3.5" />
                          {isRu ? "Отправить кандидату" : "Nomzodga yuborish"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.285 }}
            className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-surface-900 dark:text-white">
                {isRu ? "История сообщений" : "Xabarlar tarixi"}
              </h3>
              <Button size="sm" variant="outline" onClick={() => void loadMessageHistory()}>
                {isRu ? "Обновить" : "Yangilash"}
              </Button>
            </div>

            {messageHistory.length === 0 ? (
              <p className="text-sm text-surface-500">
                {isRu ? "Сообщения пока не отправлялись." : "Hozircha xabar yuborilmagan."}
              </p>
            ) : (
              <div className="space-y-2">
                {messageHistory
                  .slice()
                  .reverse()
                  .map((item, index) => (
                    <div
                      key={item.id || `${item.subject}-${index}`}
                      className="rounded-lg border border-surface-200 p-3 dark:border-surface-700"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-surface-500">
                        <span className="font-medium">{item.sender_name || (isRu ? "HR" : "HR")}</span>
                        <span>·</span>
                        <span>{item.sent_at ? formatDate(item.sent_at) : "—"}</span>
                        <span>·</span>
                        <span>{item.delivered ? (isRu ? "Доставлено" : "Yetkazildi") : (isRu ? "Ошибка доставки" : "Yetkazilmadi")}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-surface-900 dark:text-white">{item.subject}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-surface-600 dark:text-surface-300">{item.body}</p>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>

          {/* Interview Scorecard — structured evaluation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.29 }}
            className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-surface-900 dark:text-white">
                  <Target className="h-5 w-5 text-emerald-600" />
                  {isRu ? "Оценочный лист интервью" : "Intervyu baholash varaqasi"}
                </h3>
                <p className="text-xs text-surface-500">
                  {isRu
                    ? "5 критериев, по шкале 1–5. Снижает субъективность."
                    : "5 mezon, 1–5 ball. Subyektivlikni kamaytiradi."}
                </p>
              </div>
              {scorecards.length > 0 && (
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {scorecards.length} {isRu ? "оценок" : "baholash"}
                </span>
              )}
            </div>

            {/* Form: 5 sliders */}
            {(() => {
              const criteria: Array<{
                key: "technical_score" | "communication_score" | "cultural_fit_score" | "motivation_score" | "problem_solving_score";
                label: string;
              }> = [
                { key: "technical_score", label: isRu ? "Технические навыки" : "Texnik ko'nikma" },
                { key: "communication_score", label: isRu ? "Коммуникация" : "Muloqot" },
                { key: "cultural_fit_score", label: isRu ? "Соответствие культуре" : "Madaniyat mosligi" },
                { key: "motivation_score", label: isRu ? "Мотивация" : "Motivatsiya" },
                { key: "problem_solving_score", label: isRu ? "Решение задач" : "Muammo yechish" },
              ];
              const filled = criteria.filter((c) => scoreForm[c.key] > 0).length;
              const liveAvg =
                filled > 0
                  ? criteria.reduce((sum, c) => sum + (scoreForm[c.key] || 0), 0) / filled
                  : 0;
              return (
                <div className="space-y-3">
                  {criteria.map((c) => (
                    <div key={c.key} className="flex items-center gap-3">
                      <div className="w-44 flex-shrink-0 text-sm text-surface-700 dark:text-surface-300">
                        {c.label}
                      </div>
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const active = scoreForm[c.key] >= n;
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setScoreForm((s) => ({ ...s, [c.key]: s[c.key] === n ? 0 : n }))}
                              className={`h-9 flex-1 rounded-md border text-xs font-semibold transition-colors ${
                                active
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-surface-200 bg-white text-surface-500 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800"
                              }`}
                            >
                              {n}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-surface-500">
                      {isRu ? "Рекомендация" : "Tavsiya"}
                    </p>
                    {(["hire", "maybe", "pass"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setScoreForm((s) => ({ ...s, recommendation: s.recommendation === opt ? "" : opt }))}
                        className={`rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${
                          scoreForm.recommendation === opt
                            ? opt === "hire"
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : opt === "maybe"
                              ? "border-amber-500 bg-amber-500 text-white"
                              : "border-red-500 bg-red-500 text-white"
                            : "border-surface-200 bg-white text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
                        }`}
                      >
                        {opt === "hire" && (isRu ? "Нанимать" : "Yollash")}
                        {opt === "maybe" && (isRu ? "Возможно" : "Ehtimol")}
                        {opt === "pass" && (isRu ? "Отказать" : "Rad etish")}
                      </button>
                    ))}
                    <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-surface-100 px-2 py-0.5 text-xs text-surface-700 dark:bg-surface-700 dark:text-surface-200">
                      {isRu ? "Средняя" : "O'rtacha"}: <strong>{liveAvg ? liveAvg.toFixed(2) : "—"}</strong>
                    </span>
                  </div>

                  <Textarea
                    rows={3}
                    placeholder={isRu ? "Заметки (опционально)" : "Izohlar (ixtiyoriy)"}
                    value={scoreForm.notes}
                    onChange={(e) => setScoreForm((s) => ({ ...s, notes: e.target.value }))}
                  />
                  <Button
                    onClick={() => void submitScorecard()}
                    disabled={scoreSubmitting || filled === 0}
                  >
                    {scoreSubmitting ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        {isRu ? "Сохраняется…" : "Saqlanmoqda…"}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-1 h-4 w-4" />
                        {isRu ? "Сохранить оценку" : "Baholashni saqlash"}
                      </>
                    )}
                  </Button>
                </div>
              );
            })()}

            {/* History */}
            {scorecards.length > 0 && (
              <div className="mt-5 space-y-2 border-t border-surface-200 pt-4 dark:border-surface-700">
                <p className="text-xs font-bold uppercase tracking-wider text-surface-500">
                  {isRu ? "Предыдущие оценки" : "Avvalgi baholashlar"}
                </p>
                {scorecards.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-surface-200 p-2 text-sm dark:border-surface-700"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-surface-900 dark:text-white">
                          {s.evaluator.name || "—"}
                        </span>
                        {s.recommendation && (
                          <span
                            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              s.recommendation === "hire"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                : s.recommendation === "maybe"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
                            }`}
                          >
                            {s.recommendation}
                          </span>
                        )}
                        <span className="text-xs text-surface-500">
                          {s.created_at ? formatRelativeTime(s.created_at, locale) : ""}
                        </span>
                      </div>
                      {s.notes && <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">{s.notes}</p>}
                    </div>
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-sm font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      {s.overall_score?.toFixed(2) ?? "—"} / 5
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Resume */}
          {resume && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm dark:border-surface-700 dark:bg-surface-800"
            >
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-surface-900">
                <FileText className="h-5 w-5 text-purple-500" />
                Resume
              </h3>

              {/* Personal Info */}
              {resume.content?.personal_info && (
                <div className="mb-4">
                  <p className="text-base font-bold text-surface-900">
                    {resume.content.personal_info.professional_title}
                  </p>
                </div>
              )}

              {/* Skills */}
              {resume.content?.skills?.technical && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-400">
                    Texnik ko'nikmalar
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {resume.content.skills.technical.map((s) => (
                      <span key={s} className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {resume.content?.experience && resume.content.experience.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-400">
                    Ish tajribasi
                  </p>
                  {resume.content.experience.slice(0, 2).map((exp, i) => (
                    <div key={i} className="mb-2 border-l-2 border-purple-200 pl-3">
                      <p className="text-sm font-medium text-surface-900">{exp.position}</p>
                      <p className="text-xs text-surface-500">{exp.company}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {resume.content?.education && resume.content.education.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-surface-400">
                    Ta'lim
                  </p>
                  {resume.content.education.map((edu, i) => (
                    <div key={i} className="border-l-2 border-purple-200 pl-3">
                      <p className="text-sm font-medium text-surface-900">{edu.institution}</p>
                      <p className="text-xs text-surface-500">{edu.degree} — {edu.field}</p>
                    </div>
                  ))}
                </div>
              )}

              {resume.pdf_url && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <a href={resume.pdf_url} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Yangi tabda ochish
                      </Button>
                    </a>
                    <a href={resume.pdf_url} download target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Yuklab olish
                      </Button>
                    </a>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-surface-200 dark:border-surface-700">
                    <iframe
                      src={`${resume.pdf_url}#view=FitH`}
                      title="Resume PDF preview"
                      className="h-[560px] w-full bg-white"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
            <DialogContent className="sm:max-w-xl max-sm:h-[100dvh] max-sm:w-screen max-sm:max-w-none max-sm:rounded-none max-sm:border-0">
              <DialogHeader>
                <DialogTitle>{isRu ? "Отправить сообщение кандидату" : "Nomzodga xabar yuborish"}</DialogTitle>
                <DialogDescription>
                  {isRu
                    ? "Выберите шаблон и отредактируйте текст перед отправкой."
                    : "Shablonni tanlang va yuborishdan oldin matnni tahrirlang."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{isRu ? "Шаблон" : "Shablon"}</Label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["blank", isRu ? "Пусто" : "Bo'sh"],
                      ["taklif", isRu ? "Приглашение" : "Taklif"],
                      ["shortlist", isRu ? "Шорт-лист" : "Shortlist"],
                      ["offer", isRu ? "Оффер" : "Offer"],
                      ["reject", isRu ? "Отказ" : "Rad etish"],
                    ] as const).map(([key, label]) => (
                      <Button
                        key={key}
                        type="button"
                        size="sm"
                        variant={messageTemplate === key ? "default" : "outline"}
                        disabled={templateLoading}
                        onClick={() =>
                          void applyMessageTemplate(
                            key as "blank" | "taklif" | "shortlist" | "offer" | "reject"
                          )
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-subject">{isRu ? "Тема" : "Mavzu"}</Label>
                  <Input
                    id="message-subject"
                    value={messageSubject}
                    onChange={(event) => setMessageSubject(event.target.value)}
                    placeholder={isRu ? "Напишите тему..." : "Mavzuni kiriting..."}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message-body">{isRu ? "Сообщение" : "Xabar matni"}</Label>
                  <Textarea
                    id="message-body"
                    rows={8}
                    value={messageBody}
                    onChange={(event) => setMessageBody(event.target.value)}
                    placeholder={isRu ? "Текст сообщения..." : "Xabar matni..."}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
                  {isRu ? "Отмена" : "Bekor qilish"}
                </Button>
                <Button onClick={() => void sendApplicantMessage()} disabled={messageSending || templateLoading}>
                  {messageSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {isRu ? "Отправить" : "Yuborish"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
