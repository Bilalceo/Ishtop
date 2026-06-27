"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  CheckCircle,
  Code,
  Download,
  Eye,
  Globe,
  GraduationCap,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resumeApi } from "@/lib/api";
import type { ResumeContent } from "@/types/api";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { MonthYearPicker } from "@/components/resume/MonthYearPicker";
import { getSkillSuggestions } from "@/lib/resume/skillProfiles";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";

type ExperienceItem = NonNullable<ResumeContent["experience"]>[number];
type EducationItem = NonNullable<ResumeContent["education"]>[number];
type LanguageItem = NonNullable<ResumeContent["languages"]>[number];
type CertificationItem = NonNullable<ResumeContent["certifications"]>[number];

const STEPS = [
  { id: "personal", label: "Shaxsiy", icon: User },
  { id: "experience", label: "Tajriba", icon: Briefcase },
  { id: "education", label: "Ta'lim", icon: GraduationCap },
  { id: "skills", label: "Ko'nikmalar", icon: Code },
  { id: "languages", label: "Tillar", icon: Globe },
  { id: "certifications", label: "Sertifikatlar", icon: Award },
] as const;

function sanitizeFilename(value: string) {
  return (value || "resume").replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

export default function CreateResumePage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [title, setTitle] = useState("Mening Resume");
  const [content, setContent] = useState<ResumeContent>({
    personal_info: {},
    experience: [],
    education: [],
    skills: { technical: [], soft: [] },
    languages: [],
    certifications: [],
    projects: [],
  });

  const updatePersonal = (field: keyof NonNullable<ResumeContent["personal_info"]>, value: string) => {
    setContent((previous) => ({
      ...previous,
      personal_info: { ...previous.personal_info, [field]: value },
    }));
  };

  // Profession-aware skill suggestions: keyed off the entered job title so the
  // proposed skills actually match the chosen career.
  const roleSignal = content.personal_info?.professional_title || "";
  const {
    profile: skillProfile,
    technical: technicalSuggestions,
    soft: softSuggestions,
  } = useMemo(
    () => getSkillSuggestions(roleSignal, content.skills?.technical || [], content.skills?.soft || [], isRu ? "ru" : "uz"),
    [roleSignal, content.skills?.technical, content.skills?.soft, isRu],
  );

  const addSkill = (kind: "technical" | "soft", skill: string) => {
    setContent((previous) => {
      const current = previous.skills?.[kind] || [];
      if (current.some((s) => s.toLowerCase() === skill.toLowerCase())) return previous;
      return { ...previous, skills: { ...previous.skills, [kind]: [...current, skill] } };
    });
  };

  // Minimal AI assist: draft a professional summary from what's already entered.
  const handleGenerateSummary = async () => {
    const role = content.personal_info?.professional_title || "";
    const skills = Array.isArray(content.skills?.technical)
      ? (content.skills!.technical as string[])
      : [];
    const experience = (content.experience || []).map((item) => ({
      position: item.position,
      company: item.company,
    }));
    if (!role && skills.length === 0 && experience.length === 0) {
      toast.error(
        isRu
          ? "Сначала заполните должность, навыки или опыт."
          : "Avval kasbiy unvon, ko'nikma yoki tajribani to'ldiring.",
      );
      return;
    }
    setIsGeneratingSummary(true);
    try {
      const response = await resumeApi.generateSummary({
        role,
        skills,
        experience,
        locale: isRu ? "ru" : "uz",
      });
      const summary = (response.data as { summary?: string } | undefined)?.summary;
      if (summary) {
        setContent((previous) => ({ ...previous, summary }));
        toast.success(isRu ? "Профиль сгенерирован" : "Profil yaratildi");
      }
    } catch {
      toast.error(isRu ? "Не удалось сгенерировать" : "Yaratib bo'lmadi");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const addExperience = () => {
    setContent((previous) => ({
      ...previous,
      experience: [
        ...(previous.experience || []),
        { company: "", position: "", start_date: "", end_date: "", is_current: false, description: "", achievements: [] },
      ],
    }));
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, value: string | boolean | string[]) => {
    const next = [...(content.experience || [])];
    next[index] = { ...next[index], [field]: value };
    setContent((previous) => ({ ...previous, experience: next }));
  };

  const removeExperience = (index: number) => {
    setContent((previous) => ({
      ...previous,
      experience: (previous.experience || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addEducation = () => {
    setContent((previous) => ({
      ...previous,
      education: [...(previous.education || []), { institution: "", degree: "", field: "", year: "" }],
    }));
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    const next = [...(content.education || [])];
    next[index] = { ...next[index], [field]: value };
    setContent((previous) => ({ ...previous, education: next }));
  };

  const removeEducation = (index: number) => {
    setContent((previous) => ({
      ...previous,
      education: (previous.education || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const updateLanguage = (index: number, field: keyof LanguageItem, value: string) => {
    const next = [...(content.languages || [])];
    next[index] = { ...next[index], [field]: value };
    setContent((previous) => ({ ...previous, languages: next }));
  };

  const updateCertification = (index: number, field: keyof CertificationItem, value: string) => {
    const next = [...(content.certifications || [])];
    next[index] = { ...next[index], [field]: value };
    setContent((previous) => ({ ...previous, certifications: next }));
  };

  const saveResume = async (publish = false): Promise<string | null> => {
    if (!title.trim()) {
      toast.error(isRu ? "Нужно указать название резюме" : "Rezyume nomini kiriting");
      return null;
    }

    if (!content.personal_info?.name || !content.personal_info?.email) {
      toast.error("To'liq ism va email majburiy.");
      setStep(0);
      return null;
    }

    setIsSaving(true);
    try {
      const response = await resumeApi.create({ title, content });
      const created = response.data?.data || response.data;
      const newId = created?.id;

      if (!newId) {
        throw new Error(isRu ? "ID резюме не найден" : "Rezyume ID topilmadi");
      }

      if (publish) {
        await resumeApi.publish(newId);
      }

      toast.success(publish ? (isRu ? "Резюме опубликовано!" : "Rezyume nashr etildi!") : (isRu ? "Резюме сохранено!" : "Rezyume saqlandi!"));
      return newId;
    } catch {
      toast.error("Saqlashda xatolik yuz berdi.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const downloadResumePdf = async (resumeId: string) => {
    setIsDownloading(true);
    try {
      const response = await resumeApi.download(resumeId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${sanitizeFilename(title)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(isRu ? "PDF резюме загружен." : "Rezyume PDF yuklab olindi.");
    } catch {
      toast.error("PDF yuklab olishda xatolik yuz berdi.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async (publish = false) => {
    const resumeId = await saveResume(publish);
    if (resumeId) {
      router.push(`/student/resumes/${resumeId}`);
    }
  };

  const handleSaveAndDownload = async () => {
    const resumeId = await saveResume(true);
    if (resumeId) {
      await downloadResumePdf(resumeId);
      router.push(`/student/resumes/${resumeId}`);
    }
  };

  const currentStep = STEPS[step];
  const CurrentIcon = currentStep.icon;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff,transparent_34%),linear-gradient(135deg,#f8fafc,#eef2ff)] p-4 md:p-6 dark:bg-none dark:bg-surface-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-xl shadow-slate-200/60 backdrop-blur md:flex-row md:items-center md:justify-between dark:border-surface-700/70 dark:bg-surface-800/90">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-surface-600">
              <ArrowLeft className="h-4 w-4" />
              {isRu ? "Назад" : "Orqaga"}
            </Button>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-700">{isRu ? "КОНСТРУКТОР РЕЗЮМЕ" : "REZYUME KONSTRUKTORI"}</p>
              <h1 className="font-display text-2xl font-black text-slate-950">{isRu ? "Создание нового резюме" : "Yangi rezyume yaratish"}</h1>
              <p className="text-sm text-slate-500">{isRu ? "Заполните форму, справа будет предпросмотр резюме в реальном времени." : "Formani to'ldiring, o'ng tomonda rezyume real vaqtda ko'rinadi."}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleSave(false)} disabled={isSaving || isDownloading}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isRu ? "Сохранить" : "Saqlash"}
            </Button>
            <Button onClick={() => void handleSaveAndDownload()} disabled={isSaving || isDownloading} className="bg-gradient-to-r from-emerald-500 to-cyan-600">
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isRu ? "Сохранить и скачать PDF" : "Saqlab PDF yuklash"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
          <div className="space-y-5">
            <div className="rounded-[24px] border border-white/70 bg-white/90 p-5 shadow-lg shadow-slate-200/50 dark:border-surface-700/70 dark:bg-surface-800/90">
              <Label>{isRu ? "Название резюме" : "Rezyume nomi"}</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={isRu ? "Название резюме" : "Rezyume nomi"}
                className="mt-2 text-lg font-semibold"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto rounded-[24px] border border-white/70 bg-white/90 p-2 shadow-lg shadow-slate-200/40 dark:border-surface-700/70 dark:bg-surface-800/90">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setStep(index)}
                    className={cn(
                      "flex flex-shrink-0 items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-bold transition-all",
                      index === step
                        ? "bg-slate-950 text-white shadow-lg shadow-slate-300"
                        : index < step
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    {index < step ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <motion.div
              key={step}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-xl shadow-slate-200/60 dark:border-surface-700/70 dark:bg-surface-800/95"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <CurrentIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-black text-slate-950">{currentStep.label}</h2>
                  <p className="text-sm text-slate-500">{isRu ? "Пишите кратко и конкретно. Так резюме будет сильнее." : "Ma'lumotni aniq va qisqa yozing. Rezyume professional chiqadi."}</p>
                </div>
              </div>

              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="To'liq ism *" value={content.personal_info?.name || ""} onChange={(value) => updatePersonal("name", value)} placeholder="Ism Familiya" />
                    <Field label={isRu ? "Профессиональный заголовок" : "Kasbiy unvon"} value={content.personal_info?.professional_title || ""} onChange={(value) => updatePersonal("professional_title", value)} placeholder={isRu ? "Менеджер по продажам" : "Sotuv menejeri"} />
                    <Field label="Email *" value={content.personal_info?.email || ""} onChange={(value) => updatePersonal("email", value)} placeholder="email@misol.com" />
                    <Field label="Telefon" value={content.personal_info?.phone || ""} onChange={(value) => updatePersonal("phone", value)} placeholder="+998 90 123 4567" />
                    <Field label="Joylashuv" value={content.personal_info?.location || ""} onChange={(value) => updatePersonal("location", value)} placeholder="Toshkent, O'zbekiston" />
                    <Field label="LinkedIn" value={content.personal_info?.linkedin_url || ""} onChange={(value) => updatePersonal("linkedin_url", value)} placeholder="https://linkedin.com/in/..." />
                    <div className="sm:col-span-2">
                      <Field label="Portfolio" value={content.personal_info?.portfolio_url || ""} onChange={(value) => updatePersonal("portfolio_url", value)} placeholder="https://portfolio.uz" />
                    </div>
                  </div>
                  <TextArea
                    label={isRu ? "Профессиональное резюме (кратко)" : "Kasbiy qisqacha ma'lumot"}
                    value={content.summary || ""}
                    onChange={(value) => setContent((previous) => ({ ...previous, summary: value }))}
                    placeholder="2-3 gapda tajribangiz, kuchli tomonlaringiz va qaysi rolga mos ekaningizni yozing."
                    action={
                      <button
                        type="button"
                        onClick={handleGenerateSummary}
                        disabled={isGeneratingSummary}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                      >
                        {isGeneratingSummary ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {isRu ? "AI с помощью" : "AI bilan yozish"}
                      </button>
                    }
                  />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  {(content.experience || []).map((experience, index) => (
                    <div key={index} className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <button type="button" onClick={() => removeExperience(index)} className="absolute right-3 top-3 text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Kompaniya" value={experience.company} onChange={(value) => updateExperience(index, "company", value)} placeholder="Kompaniya nomi" />
                        <Field label="Lavozim" value={experience.position} onChange={(value) => updateExperience(index, "position", value)} placeholder={isRu ? "Менеджер" : "Menejer"} />
                        <div>
                          <Label>{isRu ? "Начало" : "Boshlanish"}</Label>
                          <MonthYearPicker value={experience.start_date} onChange={(value) => updateExperience(index, "start_date", value)} />
                        </div>
                        <div>
                          <Label>{isRu ? "Окончание" : "Tugash"}</Label>
                          <MonthYearPicker value={experience.end_date || ""} onChange={(value) => updateExperience(index, "end_date", value)} disabled={experience.is_current} />
                          <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                            <input type="checkbox" checked={!!experience.is_current} onChange={(event) => updateExperience(index, "is_current", event.target.checked)} />
                            Hozirda ishlayapman
                          </label>
                        </div>
                        <div className="sm:col-span-2">
                          <TextArea label="Tavsif" value={experience.description} onChange={(value) => updateExperience(index, "description", value)} placeholder="Mas'uliyat va natijalarni raqamlar bilan yozing." />
                        </div>
                        <div className="sm:col-span-2">
                          <TextArea
                            label="Yutuqlar (har qator alohida)"
                            value={(experience.achievements || []).join("\n")}
                            onChange={(value) => updateExperience(index, "achievements", value.split("\n").map((item) => item.trim()).filter(Boolean))}
                            placeholder="Masalan: Sahifa yuklanishini 35% tezlashtirdim"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={addExperience}>
                    <Plus className="mr-2 h-4 w-4" /> Tajriba qo&apos;shish
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  {(content.education || []).map((education, index) => (
                    <div key={index} className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <button type="button" onClick={() => removeEducation(index)} className="absolute right-3 top-3 text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Field label="O'quv yurti" value={education.institution} onChange={(value) => updateEducation(index, "institution", value)} placeholder="Universitet nomi" />
                        </div>
                        <Field label={isRu ? "Степень" : "Daraja"} value={education.degree} onChange={(value) => updateEducation(index, "degree", value)} placeholder={isRu ? "Бакалавр" : "Bakalavr"} />
                        <Field label="Yo'nalish" value={education.field || ""} onChange={(value) => updateEducation(index, "field", value)} placeholder={isRu ? "Экономика" : "Iqtisodiyot"} />
                        <Field label="Bitirish yili" value={education.year} onChange={(value) => updateEducation(index, "year", value)} placeholder="2026" />
                        <Field label="GPA" value={education.gpa || ""} onChange={(value) => updateEducation(index, "gpa", value)} placeholder="3.8" />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={addEducation}>
                    <Plus className="mr-2 h-4 w-4" /> Ta&apos;lim qo&apos;shish
                  </Button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  {!roleSignal && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                      {isRu
                        ? "Совет: укажите «Профессиональный заголовок» в первом шаге — мы предложим навыки под вашу профессию."
                        : "Maslahat: birinchi qadamda «Kasbiy unvon»ni kiriting — kasbingizga mos ko'nikmalarni tavsiya qilamiz."}
                    </p>
                  )}
                  <div>
                    <TextArea
                      label="Texnik ko'nikmalar (vergul bilan)"
                      value={(content.skills?.technical || []).join(", ")}
                      onChange={(value) => setContent((previous) => ({ ...previous, skills: { ...previous.skills, technical: value.split(",").map((item) => item.trim()).filter(Boolean) } }))}
                      placeholder="JavaScript, TypeScript, React, Node.js"
                    />
                    <SkillSuggestions
                      profileLabel={skillProfile?.label}
                      suggestions={technicalSuggestions}
                      onAdd={(s) => addSkill("technical", s)}
                      isRu={isRu}
                    />
                  </div>
                  <div>
                    <TextArea
                      label="Soft skills (vergul bilan)"
                      value={(content.skills?.soft || []).join(", ")}
                      onChange={(value) => setContent((previous) => ({ ...previous, skills: { ...previous.skills, soft: value.split(",").map((item) => item.trim()).filter(Boolean) } }))}
                      placeholder={isRu ? "Коммуникация, работа в команде, критическое мышление" : "Muloqot, jamoaviy ish, tanqidiy fikrlash"}
                    />
                    <SkillSuggestions
                      suggestions={softSuggestions}
                      onAdd={(s) => addSkill("soft", s)}
                      isRu={isRu}
                    />
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  {(content.languages || []).map((language, index) => (
                    <div key={index} className="flex gap-3">
                      <Input value={language.name} onChange={(event) => updateLanguage(index, "name", event.target.value)} placeholder="Til nomi" />
                      <Input value={language.proficiency} onChange={(event) => updateLanguage(index, "proficiency", event.target.value)} placeholder="Daraja" />
                      <button type="button" onClick={() => setContent((previous) => ({ ...previous, languages: (previous.languages || []).filter((_, itemIndex) => itemIndex !== index) }))} className="text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={() => setContent((previous) => ({ ...previous, languages: [...(previous.languages || []), { name: "", proficiency: "" }] }))}>
                    <Plus className="mr-2 h-4 w-4" /> Til qo&apos;shish
                  </Button>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  {(content.certifications || []).map((certification, index) => (
                    <div key={index} className="relative rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <button type="button" onClick={() => setContent((previous) => ({ ...previous, certifications: (previous.certifications || []).filter((_, itemIndex) => itemIndex !== index) }))} className="absolute right-3 top-3 text-slate-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <Field label="Sertifikat nomi" value={certification.name} onChange={(value) => updateCertification(index, "name", value)} placeholder={isRu ? "Сертификат по облачным технологиям" : "Bulut texnologiyasi sertifikati"} />
                        </div>
                        <Field label="Yil" value={certification.year} onChange={(value) => updateCertification(index, "year", value)} placeholder="2025" />
                        <div className="sm:col-span-3">
                          <Field label="Tashkilot" value={certification.issuer} onChange={(value) => updateCertification(index, "issuer", value)} placeholder={isRu ? "Образовательная платформа" : "Ta'lim platformasi"} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full" onClick={() => setContent((previous) => ({ ...previous, certifications: [...(previous.certifications || []), { name: "", issuer: "", year: "" }] }))}>
                    <Plus className="mr-2 h-4 w-4" /> Sertifikat qo&apos;shish
                  </Button>
                </div>
              )}
            </motion.div>

            <div className="flex justify-between rounded-[24px] border border-white/70 bg-white/90 p-3 shadow-lg shadow-slate-200/40 dark:border-surface-700/70 dark:bg-surface-800/90">
              <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : router.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {step > 0 ? (isRu ? "Назад" : "Oldingi") : (isRu ? "Отмена" : "Bekor qilish")}
              </Button>

              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep(step + 1)} className="gap-2 bg-slate-950 hover:bg-slate-800">
                  {isRu ? "Далее" : "Keyingi"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => void handleSave(false)} disabled={isSaving || isDownloading}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isRu ? "Черновик" : "Qoralama"}
                  </Button>
                  <Button onClick={() => void handleSave(true)} disabled={isSaving || isDownloading} className="bg-slate-950 hover:bg-slate-800">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {isRu ? "Опубликовать" : "Nashr etish"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/70 bg-white/90 p-4 shadow-xl shadow-slate-200/60 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:overflow-auto dark:border-surface-700/70 dark:bg-surface-800/90">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Eye className="h-4 w-4 text-emerald-700" />
                {isRu ? "Предпросмотр в реальном времени" : "Jonli ko'rinish"}
              </div>
              <Button variant="outline" size="sm" onClick={() => void handleSaveAndDownload()} disabled={isSaving || isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                PDF
              </Button>
            </div>
            <div className="origin-top overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-800">
              <div className="mx-auto w-[210mm] max-w-none scale-[0.54] origin-top-left lg:scale-[0.58] xl:scale-[0.68]">
                <ResumePreview content={content} title={title} isPlaceholder={!content.personal_info?.name} />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1"
      />
    </div>
  );
}

function SkillSuggestions({
  suggestions,
  onAdd,
  isRu,
  profileLabel,
}: {
  suggestions: string[];
  onAdd: (skill: string) => void;
  isRu: boolean;
  profileLabel?: string;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="mb-1.5 text-xs text-slate-500">
        {profileLabel
          ? isRu
            ? `Рекомендуем для «${profileLabel}» (нажмите, чтобы добавить):`
            : `«${profileLabel}» uchun tavsiya (qo'shish uchun bosing):`
          : isRu
            ? "Рекомендуемые навыки:"
            : "Tavsiya etilgan ko'nikmalar:"}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => onAdd(skill)}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
          >
            <Plus className="h-3 w-3" />
            {skill}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  action,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  action?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {action}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100 dark:placeholder-surface-400"
      />
    </div>
  );
}
