/**
 * =============================================================================
 * JOB APPLICATION FLOW
 * =============================================================================
 *
 * Multi-step application process:
 * 1. Select Resume
 * 2. Motivation letter (optional, AI can generate)
 * 3. Additional Questions (if any)
 * 4. Review and Submit
 * 5. Success with confetti animation
 *
 * Application Status Tracking:
 * - Submitted ✓
 * - Under Review
 * - Interview Scheduled
 * - Offer Received
 * - Rejected
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  PenLine,
  HelpCircle,
  CheckSquare,
  Sparkles,
  Loader2,
  CheckCircle,
  Target,
  Building,
  MapPin,
  Wallet,
  Clock,
  Briefcase,
  AlertCircle,
  Upload,
  RefreshCw,
  Send,
  PartyPopper,
  Calendar,
  Eye,
  Download,
  Star,
  ChevronRight,
  XCircle,
  User,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatSalaryRange } from "@/lib/utils";
import type { Job, Resume } from "@/types/api";
import { aiApi, getErrorMessage } from "@/lib/api";
import { useJobs } from "@/hooks/useJobs";
import { useResume } from "@/hooks/useResume";
import { useApplications } from "@/hooks/useApplications";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

type AdditionalQuestion = {
  id: string;
  question: string;
  type: "textarea" | "text" | "select";
  options?: string[];
  required: boolean;
};
type StepItem = { id: number; title: string; icon: React.ComponentType<any> };
type ResumeContent = Resume["content"] & {
  personal_info?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    professional_title?: string;
    summary?: string;
  };
  skills?: {
    technical?: string[];
    soft?: string[];
    languages?: Array<{ name?: string; level?: string }>;
  };
  experience?: Array<{
    company?: string;
    position?: string;
    duration?: string;
    description?: string;
  }>;
  education?: Array<{
    institution?: string;
    degree?: string;
    field?: string;
    year?: string | number;
  }>;
};

const MAX_RESUME_TEXT_LENGTH = 18000;
const MAX_JOB_TEXT_LENGTH = 9000;
const MAX_COVER_LETTER_LENGTH = 2000;

function getAdditionalQuestions(isRu: boolean): AdditionalQuestion[] {
  return [
    {
      id: "q1",
      question: isRu
        ? "Почему вас интересует эта позиция?"
        : "Nima uchun bu lavozim sizni qiziqtiradi?",
      type: "textarea",
      required: true,
    },
    {
      id: "q2",
      question: isRu
        ? "Какой диапазон зарплаты вы ожидаете?"
        : "Kutilayotgan maosh oralig'ingiz qanday?",
      type: "text",
      required: false,
    },
    {
      id: "q3",
      question: isRu ? "Когда вы можете начать работу?" : "Qachondan ishni boshlay olasiz?",
      type: "select",
      options: isRu
        ? ["Сразу", "Через 2 недели", "Через 1 месяц", "Другое"]
        : ["Darhol", "2 hafta ichida", "1 oy ichida", "Boshqa"],
      required: true,
    },
  ];
}

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

function getSteps(isRu: boolean): StepItem[] {
  return [
    { id: 1, title: isRu ? "Выбор резюме" : "Rezyume tanlash", icon: FileText },
    { id: 2, title: isRu ? "Сопроводительное письмо" : "Motivatsion xat", icon: PenLine },
    { id: 3, title: isRu ? "Вопросы" : "Savollar", icon: HelpCircle },
    { id: 4, title: isRu ? "Проверка" : "Ko'rib chiqish", icon: CheckSquare },
  ];
}

function truncateText(value: string, max: number): string {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, Math.max(0, max - 3))}...` : value;
}

function asListLine(values: string[], label: string): string {
  if (!values.length) return "";
  return `${label}: ${values.join(", ")}`;
}

function buildResumeText(resume: Resume): string {
  const content = (resume.content ?? {}) as ResumeContent;
  const personal = content.personal_info ?? {};
  const technicalSkills = (content.skills?.technical ?? []).slice(0, 30).filter(Boolean);
  const softSkills = (content.skills?.soft ?? []).slice(0, 20).filter(Boolean);
  const languages = (content.skills?.languages ?? [])
    .slice(0, 10)
    .map((lang) => [lang.name, lang.level].filter(Boolean).join(" - "))
    .filter(Boolean);
  const experience = (content.experience ?? [])
    .slice(0, 6)
    .map((item) => {
      const start = (item as { start_date?: string }).start_date;
      const end = (item as { end_date?: string; is_current?: boolean }).is_current
        ? "Present"
        : (item as { end_date?: string }).end_date;
      const range = [start, end].filter(Boolean).join(" - ");
      return [item.position, item.company, range, truncateText(item.description ?? "", 200)]
        .filter(Boolean)
        .join(" | ");
    })
    .filter(Boolean);
  const education = (content.education ?? [])
    .slice(0, 5)
    .map((item) => [item.degree, item.field, item.institution, item.year ? String(item.year) : ""].filter(Boolean).join(" | "))
    .filter(Boolean);

  const sections = [
    [personal.name, personal.professional_title].filter(Boolean).join(" - "),
    [personal.email, personal.phone, personal.location].filter(Boolean).join(" | "),
    personal.summary ? `Summary: ${truncateText(personal.summary, 600)}` : "",
    asListLine(technicalSkills, "Technical Skills"),
    asListLine(softSkills, "Soft Skills"),
    asListLine(languages, "Languages"),
    experience.length ? `Experience:\n- ${experience.join("\n- ")}` : "",
    education.length ? `Education:\n- ${education.join("\n- ")}` : "",
  ].filter(Boolean);

  const text = sections.join("\n\n").trim();
  const normalized = text.replace(/\n{3,}/g, "\n\n");
  return truncateText(normalized || "Candidate profile available.", MAX_RESUME_TEXT_LENGTH);
}

function buildJobDescription(job: Job): string {
  const extendedJob = job as Job & { responsibilities?: string[] };
  const parts = [
    `Title: ${job.title || ""}`,
    `Company: ${job.company?.name || ""}`,
    `Location: ${job.location || ""}`,
    `Salary: ${formatSalaryRange(job.salary_min, job.salary_max, "uz", job.salary_currency || "USD")}`,
    `Description: ${truncateText(job.description || "", 2500)}`,
    asListLine((job.requirements?.skills || []).slice(0, 40), "Requirements"),
    asListLine((extendedJob.responsibilities || []).slice(0, 30), "Responsibilities"),
  ].filter(Boolean);

  const text = parts.join("\n").trim();
  return truncateText(text || "Job details available.", MAX_JOB_TEXT_LENGTH);
}

function buildFallbackCoverLetter(params: {
  isRu: boolean;
  companyName: string;
  jobTitle: string;
  resume: Resume | null;
}) {
  const role = params.jobTitle || (params.isRu ? "данную позицию" : "ushbu lavozim");
  const company = params.companyName || (params.isRu ? "вашу компанию" : "kompaniyangiz");

  const resumeContent = (params.resume?.content ?? {}) as ResumeContent;
  const summary = truncateText(resumeContent.personal_info?.summary ?? "", 260);
  const tech = (resumeContent.skills?.technical ?? []).slice(0, 6).join(", ");
  const soft = (resumeContent.skills?.soft ?? []).slice(0, 4).join(", ");

  if (params.isRu) {
    return truncateText(
      `Здравствуйте, команда ${company}.\n\n` +
        `Хочу откликнуться на позицию ${role}. У меня есть релевантный опыт и мотивация быстро принести пользу команде.\n\n` +
        (summary ? `Кратко обо мне: ${summary}\n\n` : "") +
        (tech ? `Профильные навыки: ${tech}.\n` : "") +
        (soft ? `Сильные стороны: ${soft}.\n` : "") +
        `Буду рад(а) обсудить, как мой опыт поможет в задачах роли.\n\nС уважением,`,
      MAX_COVER_LETTER_LENGTH
    );
  }

  return truncateText(
    `Hurmatli ${company} jamoasi,\n\n` +
      `Men ${role} lavozimiga qiziqish bildiraman. Menda ushbu rolga mos tajriba va tez moslashuvchan yondashuv bor.\n\n` +
      (summary ? `Qisqacha men haqimda: ${summary}\n\n` : "") +
      (tech ? `Asosiy ko'nikmalarim: ${tech}.\n` : "") +
      (soft ? `Kuchli tomonlarim: ${soft}.\n` : "") +
      `Siz bilan suhbatda ushbu lavozimga qanday qiymat bera olishimni muhokama qilishdan mamnun bo'laman.\n\nHurmat bilan,`,
    MAX_COVER_LETTER_LENGTH
  );
}

// =============================================================================
// STEP INDICATOR COMPONENT
// =============================================================================

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: {
  steps: StepItem[];
  currentStep: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const StepIcon = step.icon;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isCompleted && onStepClick(step.id)}
              disabled={!isCompleted}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
                isCurrent && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                isCompleted && "cursor-pointer bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300",
                !isCurrent && !isCompleted && "bg-surface-100 text-surface-400 dark:bg-surface-800"
              )}
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <StepIcon className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{step.title}</span>
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="mx-1 h-4 w-4 text-surface-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// RESUME SELECTOR COMPONENT
// =============================================================================

function ResumeSelector({
  resumes,
  selectedId,
  onSelect,
  jobRequirements,
}: {
  resumes: (Resume & { matchScore?: number })[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  jobRequirements?: string[];
}) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
          {isRu ? "Выберите резюме" : "Rezyumeni tanlang"}
        </h3>
        <Link href="/student/resumes/create-ai">
          <Button variant="outline" size="sm" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {isRu ? "Создать новое" : "Yangi yaratish"}
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {resumes.map((resume) => {
          const isSelected = selectedId === resume.id;
          const matchingSkills = jobRequirements?.filter((skill) =>
            resume.content.skills?.technical?.some(
              (s) => s.toLowerCase() === skill.toLowerCase()
            )
          );

          return (
            <motion.div
              key={resume.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onSelect(resume.id)}
              className={cn(
                "cursor-pointer rounded-xl border-2 p-4 transition-all",
                isSelected
                  ? "border-emerald-500 bg-emerald-50/50 shadow-lg dark:bg-emerald-900/10"
                  : "border-surface-200 hover:border-surface-300 dark:border-surface-700"
              )}
            >
              <div className="flex items-start gap-4">
                {/* Selection Indicator */}
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                    isSelected
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-surface-300 dark:border-surface-600"
                  )}
                >
                  {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                </div>

                {/* Resume Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-surface-900 dark:text-white">
                        {resume.title}
                      </h4>
                      <p className="text-sm text-surface-500">
                        {resume.content.personal_info?.professional_title}
                      </p>
                    </div>

                    {/* Match Score */}
                    {resume.matchScore && (
                      <Badge
                        variant={
                          resume.matchScore >= 80
                            ? "success"
                            : resume.matchScore >= 60
                            ? "warning"
                            : "secondary"
                        }
                        className="gap-1 shrink-0"
                      >
                        <Target className="h-3 w-3" />
                        {resume.matchScore}% {isRu ? "совпадение" : "moslik"}
                      </Badge>
                    )}
                  </div>

                  {/* Skills Match */}
                  {jobRequirements && matchingSkills && matchingSkills.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 text-xs text-surface-500">
                        {isRu
                          ? `Подходящие навыки (${matchingSkills.length}/${jobRequirements.length}):`
                          : `Mos ko'nikmalar (${matchingSkills.length}/${jobRequirements.length}):`}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {jobRequirements.map((skill) => {
                          const hasSkill = matchingSkills.includes(skill);
                          return (
                            <Badge
                              key={skill}
                              variant={hasSkill ? "success" : "secondary"}
                              className={cn(
                                "text-xs",
                                !hasSkill && "opacity-50"
                              )}
                            >
                              {hasSkill && <CheckCircle className="mr-1 h-3 w-3" />}
                              {skill}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-surface-400">
                    {resume.ai_generated && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {isRu ? "AI yaratilgan" : "AI yaratilgan"}
                      </span>
                    )}
                    {resume.ats_score && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {resume.ats_score}% ATS
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {resumes.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-surface-200 p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-surface-300" />
          <h4 className="mt-4 font-semibold text-surface-900">{isRu ? "Резюме пока нет" : "Hali rezyume yo'q"}</h4>
          <p className="mt-2 text-sm text-surface-500">
            {isRu ? "Для отклика сначала создайте резюме" : "Bu ishga ariza berish uchun avval rezyume yarating"}
          </p>
          <Link href="/student/resumes/create-ai">
            <Button className="mt-4 bg-gradient-to-r from-emerald-500 to-teal-600">
              <Sparkles className="mr-2 h-4 w-4" />
              {isRu ? "Создать AI-резюме" : "AI rezyume yaratish"}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COVER LETTER EDITOR COMPONENT
// =============================================================================

function CoverLetterEditor({
  value,
  onChange,
  onGenerateAI,
  isGenerating,
  jobTitle,
  companyName,
}: {
  value: string;
  onChange: (value: string) => void;
  onGenerateAI: (tone: string) => void;
  isGenerating: boolean;
  jobTitle: string;
  companyName: string;
}) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const [tone, setTone] = useState("professional");

  const tones = [
    { value: "professional", label: isRu ? "Профессиональный" : "Professional uslub" },
    { value: "enthusiastic", label: isRu ? "Энергичный" : "Faol uslub" },
    { value: "confident", label: isRu ? "Уверенный" : "Ishonchli uslub" },
    { value: "creative", label: isRu ? "Креативный" : "Ijodiy uslub" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
            {isRu ? "Сопроводительное письмо" : "Motivatsion xat"}
          </h3>
          <p className="text-sm text-surface-500">{isRu ? "Необязательно, но рекомендуется" : "Ixtiyoriy, lekin tavsiya etiladi"}</p>
        </div>
        <Badge variant="secondary">{isRu ? "Необязательно" : "Ixtiyoriy"}</Badge>
      </div>

      {/* AI Generation Card */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-surface-900 dark:text-white">
                  {isRu ? "Сгенерировать с AI" : "AI bilan yaratish"}
                </p>
                <p className="text-sm text-surface-500">
                  {isRu ? "Создайте персональное письмо за пару секунд" : "Shaxsiy motivatsion xatni bir zumda yarating"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm dark:border-surface-700 dark:bg-surface-800"
              >
                {tones.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => onGenerateAI(tone)}
                disabled={isGenerating}
                className="bg-gradient-to-r from-emerald-500 to-teal-600"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isRu ? "Генерируется..." : "Yaratilmoqda..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isRu ? "Создать" : "Yaratish"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Editor */}
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isRu
              ? `Здравствуйте, менеджер по найму ${companyName}.\n\nХочу откликнуться на позицию ${jobTitle}...`
              : `Hurmatli ${companyName} jamoasi.\n\nMen ${jobTitle} lavozimiga qiziqish bildiraman...`
          }
          className="min-h-[300px] resize-none"
        />
        <div className="absolute bottom-3 right-3 text-xs text-surface-400">
          {value.length} / 2000 {isRu ? "символов" : "belgi"}
        </div>
      </div>

      {/* Tips */}
      <div className="rounded-xl bg-surface-50 p-4 dark:bg-surface-800/50">
        <h4 className="mb-2 text-sm font-medium text-surface-700 dark:text-surface-300">
          {isRu ? "💡 Советы для сильного сопроводительного письма:" : "💡 Yaxshi motivatsion xat uchun tavsiyalar:"}
        </h4>
        <ul className="space-y-1 text-sm text-surface-500">
          <li>{isRu ? "• Укажите навыки, которые совпадают с требованиями" : "• Talablarga mos ko'nikmalarni aniq ko'rsating"}</li>
          <li>{isRu ? "• Добавьте релевантный результат или loyiha" : "• Mos yutuq yoki loyihani kiriting"}</li>
          <li>{isRu ? "• Покажите мотивацию к компании и роли" : "• Kompaniya va rolga qiziqishingizni ko'rsating"}</li>
          <li>{isRu ? "• Кратко и по делу (250-400 слов)" : "• Qisqa va lo'nda yozing (250-400 so'z)"}</li>
        </ul>
      </div>
    </div>
  );
}

// =============================================================================
// QUESTIONS FORM COMPONENT
// =============================================================================

function QuestionsForm({
  questions,
  answers,
  onChange,
}: {
  questions: AdditionalQuestion[];
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <h3 className="mt-4 font-display text-lg font-semibold text-surface-900 dark:text-white">
          {isRu ? "Дополнительных вопросов нет" : "Qo'shimcha savollar yo'q"}
        </h3>
        <p className="mt-2 text-surface-500">
          {isRu ? "Работодатель не добавил скрининг-вопросы" : "Ish beruvchi qo'shimcha saralash savollarini qo'shmagan"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
          {isRu ? "Дополнительные вопросы" : "Qo'shimcha savollar"}
        </h3>
        <p className="text-sm text-surface-500">
          {isRu ? "Пожалуйста, ответьте на вопросы работодателя" : "Iltimos, ish beruvchi savollariga javob bering"}
        </p>
      </div>

      {questions.map((q, index) => (
        <div key={q.id} className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-600">
              {index + 1}
            </span>
            {q.question}
            {q.required && <span className="text-red-500">*</span>}
          </Label>

          {q.type === "textarea" ? (
            <Textarea
              value={answers[q.id] || ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              placeholder={isRu ? "Javobingizni yozing..." : "Javobingizni yozing..."}
              rows={4}
            />
          ) : q.type === "select" ? (
            <select
              value={answers[q.id] || ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              className="w-full rounded-lg border border-surface-300 bg-white px-4 py-2.5 dark:border-surface-700 dark:bg-surface-800"
            >
              <option value="">{isRu ? "Вариантni tanlang" : "Variantni tanlang"}</option>
              {q.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={answers[q.id] || ""}
              onChange={(e) => onChange(q.id, e.target.value)}
              placeholder={isRu ? "Javobingizni yozing..." : "Javobingizni yozing..."}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// REVIEW SECTION COMPONENT
// =============================================================================

function ReviewSection({
  job,
  resume,
  coverLetter,
  answers,
  questions,
}: {
  job: Job;
  resume: Resume | null;
  coverLetter: string;
  answers: Record<string, string>;
  questions: AdditionalQuestion[];
}) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
          {isRu ? "Проверьте заявку" : "Arizangizni tekshiring"}
        </h3>
        <p className="text-sm text-surface-500">
          {isRu ? "Перед отправкой проверьте данные" : "Yuborishdan oldin arizangizni tekshiring"}
        </p>
      </div>

      {/* Job Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-xl font-bold text-emerald-600">
              {job.company?.name?.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-surface-900 dark:text-white">
                {job.title}
              </h4>
              <p className="text-surface-500">{job.company?.name}</p>
              <div className="mt-1 flex items-center gap-3 text-sm text-surface-400">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  {formatSalaryRange(job.salary_min, job.salary_max, "uz", job.salary_currency || "USD")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Resume */}
      <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">{isRu ? "Rezyume" : "Rezyume"}</p>
              <p className="font-semibold text-surface-900 dark:text-white">
                {resume?.title || (isRu ? "Резюме не выбрано" : "Rezyume tanlanmagan")}
              </p>
            </div>
          </div>
          {resume && (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {isRu ? "Готово" : "Tayyor"}
            </Badge>
          )}
        </div>
      </div>

      {/* Motivation letter */}
      <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <PenLine className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">{isRu ? "Сопроводительное письмо" : "Motivatsion xat"}</p>
              <p className="font-semibold text-surface-900 dark:text-white">
                {coverLetter ? `${coverLetter.length} ${isRu ? "символов" : "belgi"}` : (isRu ? "Не добавлено" : "Qo'shilmagan")}
              </p>
            </div>
          </div>
          {coverLetter ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {isRu ? "Добавлено" : "Qo'shilgan"}
            </Badge>
          ) : (
            <Badge variant="secondary">
              {isRu ? "Необязательно" : "Ixtiyoriy"}
            </Badge>
          )}
        </div>
        {coverLetter && (
          <div className="mt-3 max-h-32 overflow-hidden rounded-lg bg-surface-50 p-3 text-sm text-surface-600 dark:bg-surface-800/50">
            <p className="line-clamp-4">{coverLetter}</p>
          </div>
        )}
      </div>

      {/* Answers */}
      {questions.length > 0 && (
        <div className="rounded-xl border border-surface-200 p-4 dark:border-surface-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <HelpCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-surface-500">
                {isRu ? "Дополнительные вопросы" : "Qo'shimcha savollar"}
              </p>
              <p className="font-semibold text-surface-900 dark:text-white">
                {Object.keys(answers).length}/{questions.length} {isRu ? "отвечено" : "javob berilgan"}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg bg-surface-50 p-3 dark:bg-surface-800/50">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  {q.question}
                </p>
                <p className="mt-1 text-sm text-surface-600">
                  {answers[q.id] || (
                    <span className="italic text-surface-400">{isRu ? "Не отвечено" : "Javob berilmagan"}</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation */}
      <div className="rounded-xl bg-green-50 p-4 dark:bg-green-900/20">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-600" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-300">
              {isRu ? "Отправке готово" : "Yuborishga tayyor"}
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">
              {isRu
                ? "Отправляя заявку, вы подтверждаете корректность данных и соглашаетесь с условиями компании."
                : "Arizani yuborish orqali ma'lumotlarning to'g'riligini tasdiqlaysiz va kompaniya shartlariga rozilik bildirasiz."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUCCESS SCREEN COMPONENT
// =============================================================================

function SuccessScreen({ job, onViewApplications }: { job: Job; onViewApplications: () => void }) {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  useEffect(() => {
    // Trigger confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#10B981", "#2DD4BF", "#10B981"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#10B981", "#2DD4BF", "#10B981"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
    >
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2 }}
        className="relative mb-6"
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg shadow-green-500/30">
          <CheckCircle className="h-12 w-12 text-white" />
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-2 rounded-full border-2 border-dashed border-green-300"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {isRu ? "Заявка отправлена! 🎉" : "Ariza yuborildi! 🎉"}
        </h2>
        <p className="mt-2 text-surface-500">
          {isRu ? "Ваша заявка на" : "Sizning"} <strong>{job.title}</strong> {isRu ? "в" : "uchun"}{" "}
          <strong>{job.company?.name}</strong> {isRu ? "успешно отправлена." : "muvaffaqiyatli yuborildi."}
        </p>
      </motion.div>

      {/* What's Next */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-8 w-full max-w-md"
      >
        <h3 className="mb-4 font-semibold text-surface-900 dark:text-white">
          {isRu ? "Что дальше?" : "Keyingi qadamlar"}
        </h3>
        <div className="space-y-3 text-left">
          {[
            {
              step: 1,
              title: isRu ? "Заявка получена" : "Ariza qabul qilindi",
              desc: isRu ? "Ish beruvchiga xabar berildi" : "Ish beruvchiga xabar berildi",
              status: "completed",
            },
            {
              step: 2,
              title: isRu ? "На проверке" : "Ko'rib chiqilmoqda",
              desc: isRu ? "Ваша заявка рассматривается" : "Arizangiz ko'rib chiqilmoqda",
              status: "current",
            },
            {
              step: 3,
              title: isRu ? "Собеседование" : "Intervyu",
              desc: isRu ? "Вас могут пригласить на интервью" : "Siz intervyuga taklif qilinishingiz mumkin",
              status: "pending",
            },
            {
              step: 4,
              title: isRu ? "Решение" : "Yakuniy qaror",
              desc: isRu ? "Вы получите ответ" : "Sizga javob yuboriladi",
              status: "pending",
            },
          ].map((item) => (
            <div
              key={item.step}
              className={cn(
                "flex items-center gap-4 rounded-xl p-3",
                item.status === "completed" && "bg-green-50 dark:bg-green-900/20",
                item.status === "current" && "bg-blue-50 dark:bg-blue-900/20",
                item.status === "pending" && "bg-surface-50 dark:bg-surface-800/50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  item.status === "completed" && "bg-green-500 text-white",
                  item.status === "current" && "bg-blue-500 text-white",
                  item.status === "pending" && "bg-surface-200 text-surface-500"
                )}
              >
                {item.status === "completed" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  item.step
                )}
              </div>
              <div>
                <p
                  className={cn(
                    "font-medium",
                    item.status === "completed" && "text-green-700 dark:text-green-300",
                    item.status === "current" && "text-blue-700 dark:text-blue-300",
                    item.status === "pending" && "text-surface-500"
                  )}
                >
                  {item.title}
                </p>
                <p className="text-sm text-surface-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-8 flex gap-3"
      >
        <Link href="/student/jobs">
          <Button variant="outline">{isRu ? "Посмотреть другие вакансии" : "Yana ishlarni ko'rish"}</Button>
        </Link>
        <Button
          onClick={onViewApplications}
          className="bg-gradient-to-r from-emerald-500 to-teal-600"
        >
          {isRu ? "Посмотреть мои заявки" : "Arizalarimni ko'rish"}
        </Button>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ApplyPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const router = useRouter();
  const params = useParams();
  const jobId = params!.id as string;

  const { fetchJob, currentJob, isLoading: jobLoading } = useJobs();
  const { resumes, fetchResumes, isLoading: resumesLoading } = useResume();
  const { applyToJob } = useApplications();

  const [isLoading, setIsLoading] = useState(true);
  const [job, setJob] = useState<(Job & { matchScore?: number }) | null>(null);
  const [resumesState, setResumesState] = useState<(Resume & { matchScore?: number })[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);

  // Form state
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const steps = getSteps(isRu);
  const additionalQuestions = getAdditionalQuestions(isRu);

  // Load job and resumes
  // Load job + resumes once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const [jobResult, resumeResult] = await Promise.allSettled([
        fetchJob(jobId),
        fetchResumes(),
      ]);

      // Use resolved values directly to avoid stale closure deps
      if (jobResult.status === "fulfilled" && jobResult.value) {
        setJob(jobResult.value as Job & { matchScore?: number });
      }
      setIsLoading(false);
    };
    loadData();
  }, [jobId]);

  // Sync resumes from hook to local state once loaded
  useEffect(() => {
    if (resumes.length > 0 && resumesState.length === 0) {
      setResumesState(resumes as (Resume & { matchScore?: number })[]);
      const bestMatch = (resumes as (Resume & { matchScore?: number })[]).reduce(
        (best, current) =>
          (current.matchScore || 0) > (best.matchScore || 0) ? current : best
      );
      setSelectedResumeId(bestMatch.id);
    }
  }, [resumes, resumesState.length]);

  // Get selected resume
  const selectedResume = resumesState.find((r) => r.id === selectedResumeId) || null;

  // Validate current step
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return !!selectedResumeId;
      case 2:
        return true; // Cover letter is optional
      case 3:
        // Check required questions
        return additionalQuestions
          .filter((q) => q.required)
          .every((q) => answers[q.id]?.trim());
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Generate AI cover letter
  const handleGenerateCoverLetter = async (tone: string) => {
    if (!job || !selectedResume) {
      toast.error(isRu ? "Сначала выберите резюме." : "Cover letter yaratishdan oldin rezyumeni tanlang.");
      return;
    }

    setIsGeneratingCover(true);

    try {
      const response = await aiApi.generateCoverLetter({
        resume_text: buildResumeText(selectedResume),
        job_description: buildJobDescription(job),
        company_name: job.company?.name || (isRu ? "Компания" : "Kompaniya"),
        tone,
      });

      const data = response.data as {
        success?: boolean;
        message?: string;
        cover_letter?: string;
        data?: {
          cover_letter?: string;
          content?: string;
          text?: string;
          letter?: string;
        };
      };

      if (data.success === false) {
        throw new Error(data.message || (isRu ? "AI не смог сгенерировать письмо." : "AI cover letter yaratolmadi."));
      }

      const generatedLetter =
        (typeof response.data === "string" ? response.data : "") ||
        data.cover_letter ||
        data.data?.cover_letter ||
        data.data?.content ||
        data.data?.text ||
        data.data?.letter;

      if (!generatedLetter) {
        throw new Error(data.message || (isRu ? "AI пустой natija qaytardi." : "AI bo'sh natija qaytardi."));
      }

      setCoverLetter(truncateText(generatedLetter, MAX_COVER_LETTER_LENGTH));
      toast.success(isRu ? "Сопроводительное письмо готово" : "Motivatsion xat yaratildi");
    } catch (error) {
      const fallbackLetter = buildFallbackCoverLetter({
        isRu,
        companyName: job.company?.name || "",
        jobTitle: job.title || "",
        resume: selectedResume,
      });
      setCoverLetter(fallbackLetter);

      const message = getErrorMessage(error);
      const networkLikeError = /network error|failed to fetch|timeout|err_network/i.test(
        message,
      );

      toast.warning(
        networkLikeError
          ? isRu
            ? "AI временно недоступен. Добавлен шаблон письма — можете отредактировать и отправить."
            : "AI vaqtincha ulanmayapti. Namunaviy xat qo'shildi — tahrirlab yuborishingiz mumkin."
          : isRu
            ? "AI не смог сгенерировать письмо. Добавлен шаблон, его можно отредактировать."
            : "AI xatni tayyorlay olmadi. Namunaviy xat qo'shildi, uni tahrirlashingiz mumkin.",
      );
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // Submit application
  const handleSubmit = async () => {
    if (!job || !selectedResumeId) {
      toast.error(isRu ? "Перед отправкой выберите резюме." : "Yuborishdan oldin rezyume tanlang.");
      return;
    }

    setIsSubmitting(true);
    try {
      await applyToJob({
        job_id: job.id,
        resume_id: selectedResumeId,
        cover_letter: coverLetter || undefined,
      });
      setIsSubmitted(true);
    } catch (error) {
      // The hook already surfaces API errors; keep this catch for control flow.
      console.error("Application submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation
  const handleNext = () => {
    if (currentStep < 4 && isStepValid()) {
      setCurrentStep((prev) => prev + 1);
    } else if (currentStep === 4) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <Skeleton className="mb-8 h-12 w-full" />
        <Skeleton className="mb-4 h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-16 w-16 text-red-500" />
        <h2 className="mt-4 text-xl font-semibold text-surface-900">{isRu ? "Вакансия не найдена" : "Ish topilmadi"}</h2>
        <p className="mt-2 text-surface-500">
          {isRu ? "Вакансия удалена или больше недоступна." : "Bu vakansiya o'chirilgan yoki endi mavjud emas."}
        </p>
        <Link href="/student/jobs">
          <Button className="mt-6">{isRu ? "Другие вакансии" : "Boshqa ishlarni ko'rish"}</Button>
        </Link>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <SuccessScreen
          job={job}
          onViewApplications={() => router.push("/student/applications")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Back Button */}
      <Link
        href={`/student/jobs`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {isRu ? "Назад к вакансии" : "Vakansiyaga qaytish"}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {isRu ? "Отклик на" : "Ariza yuborish:"} {job.title}
        </h1>
        <p className="mt-1 text-surface-500">{isRu ? "компания" : "kompaniya"}: {job.company?.name}</p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
        <Progress
          value={(currentStep / steps.length) * 100}
          className="mt-4 h-1"
        />
      </div>

      {/* Step Content */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ResumeSelector
                  resumes={resumes}
                  selectedId={selectedResumeId}
                  onSelect={setSelectedResumeId}
                  jobRequirements={job.requirements.skills}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CoverLetterEditor
                  value={coverLetter}
                  onChange={setCoverLetter}
                  onGenerateAI={handleGenerateCoverLetter}
                  isGenerating={isGeneratingCover}
                  jobTitle={job.title}
                  companyName={job.company?.name || ""}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <QuestionsForm
                  questions={additionalQuestions}
                  answers={answers}
                  onChange={(id, value) =>
                    setAnswers((prev) => ({ ...prev, [id]: value }))
                  }
                />
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ReviewSection
                  job={job}
                  resume={selectedResume}
                  coverLetter={coverLetter}
                  answers={answers}
                  questions={additionalQuestions}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {isRu ? "Назад" : "Orqaga"}
        </Button>

        <Button
          onClick={handleNext}
          disabled={!isStepValid() || isSubmitting}
          className="bg-gradient-to-r from-emerald-500 to-teal-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isRu ? "Отправка..." : "Yuborilmoqda..."}
            </>
          ) : currentStep === 4 ? (
            <>
              <Send className="mr-2 h-4 w-4" />
              {isRu ? "Отправить заявку" : "Arizani yuborish"}
            </>
          ) : (
            <>
              {isRu ? "Далее" : "Keyingi"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
















