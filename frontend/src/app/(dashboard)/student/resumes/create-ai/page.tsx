/**
 * =============================================================================
 * AI RESUME BUILDER - MOST IMPORTANT PAGE
 * =============================================================================
 *
 * Features:
 * - Split screen: Left 40% Form, Right 60% Live Preview
 * - Multi-step form (Personal Info, Experience, Education, Skills, Additional)
 * - AI generation with template/tone selection
 * - Real-time preview with template switcher
 * - Auto-save, progress bar, validation
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  Sparkles,
  User,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Globe,
  Loader2,
  CheckCircle,
  Download,
  ZoomIn,
  ZoomOut,
  Eye,
  Save,
  Wand2,
  Palette,
  Type,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MonthYearPicker } from "@/components/resume/MonthYearPicker";
import { useResume } from "@/hooks/useResume";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { resumeApi } from "@/lib/api";
import type { Resume, ResumeContent } from "@/types/api";
import { ResumePreview } from "@/components/resume/ResumePreview";
import { getSkillSuggestions } from "@/lib/resume/skillProfiles";
import { SkillVerification } from "@/components/resume/SkillVerification";
import type { VerificationStatus } from "@/lib/resume/skillQuestions";
import { getPreferredLocale } from "@/lib/i18n";
import { useTranslation } from "@/contexts/TranslationContext";

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

// Validation messages follow the selected language (uz/ru) — no English leaks.
const makePersonalInfoSchema = (isRu: boolean) =>
  z.object({
    fullName: z.string().min(2, isRu ? "Имя обязательно" : "Ism majburiy"),
    email: z.string().email(isRu ? "Введите корректный email" : "To'g'ri email kiriting"),
    phone: z.string().min(9, isRu ? "Номер телефона обязателен" : "Telefon raqami majburiy"),
    location: z.string().optional(),
    professionalTitle: z
      .string()
      .min(2, isRu ? "Должность обязательна" : "Lavozim nomi majburiy"),
    linkedinUrl: z
      .string()
      .url(isRu ? "Некорректная ссылка" : "Noto'g'ri havola")
      .optional()
      .or(z.literal("")),
    portfolioUrl: z
      .string()
      .url(isRu ? "Некорректная ссылка" : "Noto'g'ri havola")
      .optional()
      .or(z.literal("")),
  });

// Experience is OPTIONAL: students and fresh graduates with no work history
// must be able to finish a resume. Fields are not forced; empty entries are
// filtered out before save/generate.
const experienceSchema = z.object({
  experiences: z.array(
    z.object({
      company: z.string().optional(),
      position: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      isCurrent: z.boolean().optional(),
      description: z.string().optional(),
    }),
  ),
});

// Education is optional too, and supports currently-studying students
// (isCurrent → no graduation year required).
const educationSchema = z.object({
  education: z.array(
    z.object({
      institution: z.string().optional(),
      degree: z.string().optional(),
      field: z.string().optional(),
      year: z.string().optional(),
      isCurrent: z.boolean().optional(),
    }),
  ),
});

const skillsSchema = z.object({
  technicalSkills: z.array(z.string()),
  softSkills: z.array(z.string()),
  languages: z.array(
    z.object({
      name: z.string(),
      proficiency: z.string(),
    }),
  ),
});

const additionalSchema = z.object({
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      year: z.string(),
    }),
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      url: z.string().optional(),
    }),
  ),
});

// Combined schema (locale-aware via the personal-info factory).
const makeResumeSchema = (isRu: boolean) =>
  makePersonalInfoSchema(isRu)
    .merge(experienceSchema)
    .merge(educationSchema)
    .merge(skillsSchema)
    .merge(additionalSchema);

type ResumeFormData = z.infer<ReturnType<typeof makeResumeSchema>>;

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

const steps = [
  {
    id: 1,
    titleKey: "aiResumeBuilder.personalInfo",
    icon: User,
    descriptionKey: "aiResumeBuilder.basicDetails",
  },
  {
    id: 2,
    titleKey: "aiResumeBuilder.experience",
    icon: Briefcase,
    descriptionKey: "aiResumeBuilder.workHistory",
  },
  {
    id: 3,
    titleKey: "aiResumeBuilder.education",
    icon: GraduationCap,
    descriptionKey: "aiResumeBuilder.academicBackground",
  },
  {
    id: 4,
    titleKey: "aiResumeBuilder.skills",
    icon: Code,
    descriptionKey: "aiResumeBuilder.yourExpertise",
  },
  {
    id: 5,
    titleKey: "aiResumeBuilder.additional",
    icon: Award,
    descriptionKey: "aiResumeBuilder.extraSections",
  },
];

const templates = [
  {
    id: "modern",
    nameKey: "aiResumeBuilder.modern",
    descriptionKey: "aiResumeBuilder.modernDesc",
  },
  {
    id: "classic",
    nameKey: "aiResumeBuilder.classic",
    descriptionKey: "aiResumeBuilder.classicDesc",
  },
  {
    id: "minimal",
    nameKey: "aiResumeBuilder.minimal",
    descriptionKey: "aiResumeBuilder.minimalDesc",
  },
  {
    id: "creative",
    nameKey: "aiResumeBuilder.creative",
    descriptionKey: "aiResumeBuilder.creativeDesc",
  },
];

const tones = [
  {
    id: "professional",
    nameKey: "aiResumeBuilder.professional",
    descriptionKey: "aiResumeBuilder.professionalDesc",
  },
  {
    id: "confident",
    nameKey: "aiResumeBuilder.confident",
    descriptionKey: "aiResumeBuilder.confidentDesc",
  },
  {
    id: "friendly",
    nameKey: "aiResumeBuilder.friendly",
    descriptionKey: "aiResumeBuilder.friendlyDesc",
  },
  {
    id: "technical",
    nameKey: "aiResumeBuilder.technical",
    descriptionKey: "aiResumeBuilder.technicalDesc",
  },
];

const skillInputClassName =
  "h-12 rounded-2xl border-surface-200 bg-white/95 text-surface-950 shadow-sm shadow-slate-200/60 placeholder:text-surface-400 focus-visible:ring-2 focus-visible:ring-brand-500/80 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:shadow-none dark:placeholder:text-surface-400";

const skillAddButtonClassName =
  "h-12 rounded-2xl border-2 border-brand-500/70 bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/10 hover:border-brand-400 hover:bg-brand-100 hover:text-brand-800 dark:border-brand-400/70 dark:bg-brand-400/10 dark:text-brand-100 dark:hover:border-brand-300 dark:hover:bg-brand-400/20";

const selectedSkillBadgeClassName =
  "group cursor-pointer border border-surface-200 bg-white px-3 py-1.5 text-sm font-semibold text-surface-700 shadow-sm shadow-slate-200/60 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-white/[0.07] dark:text-surface-100 dark:shadow-none dark:hover:border-red-400/50 dark:hover:bg-red-500/12 dark:hover:text-red-100";

const suggestedSkillChipClassName =
  "rounded-full border border-surface-300 bg-white/90 px-3 py-1.5 text-sm font-semibold text-surface-700 shadow-sm shadow-slate-200/50 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 hover:shadow-md hover:shadow-brand-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/70 dark:border-white/15 dark:bg-white/[0.07] dark:text-surface-100 dark:shadow-none dark:hover:border-brand-300/70 dark:hover:bg-brand-400/16 dark:hover:text-white dark:focus-visible:ring-brand-300/70";

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AIResumeBuilderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const isRu = locale === "ru";
  const { generateResume, isGenerating } = useResume();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [selectedTone, setSelectedTone] = useState("professional");
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<Resume | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(90);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [skillInput, setSkillInput] = useState({ technical: "", soft: "" });
  // Skill verification status (frontend MVP): { [skillName]: verified|learning|unverified }
  const [skillStatuses, setSkillStatuses] = useState<Record<string, VerificationStatus>>({});
  const setSkillStatus = (skill: string, status: VerificationStatus) =>
    setSkillStatuses((prev) => ({ ...prev, [skill]: status }));

  // Rebuild the resolver when the language changes so validation messages
  // follow the selected locale (uz/ru).
  const resumeResolver = useMemo(() => zodResolver(makeResumeSchema(isRu)), [isRu]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<ResumeFormData>({
    resolver: resumeResolver,
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      professionalTitle: "",
      linkedinUrl: "",
      portfolioUrl: "",
      experiences: [
        {
          company: "",
          position: "",
          startDate: "",
          endDate: "",
          isCurrent: false,
          description: "",
        },
      ],
      education: [{ institution: "", degree: "", field: "", year: "", isCurrent: false }],
      technicalSkills: [],
      softSkills: [],
      languages: [{ name: "", proficiency: "" }],
      certifications: [],
      projects: [],
    },
  });

  const formData = watch();
  const roleSignal = useMemo(() => {
    const title = formData.professionalTitle || "";
    const positions = (formData.experiences || [])
      .map((exp) => exp.position || "")
      .join(" ");
    const fields = (formData.education || [])
      .map((edu) => edu.field || "")
      .join(" ");
    return `${title} ${positions} ${fields}`.trim();
  }, [formData.professionalTitle, formData.experiences, formData.education]);

  const {
    profile: activeSkillProfile,
    technical: technicalSkillSuggestions,
    soft: softSkillSuggestions,
  } = useMemo(
    () =>
      getSkillSuggestions(
        roleSignal,
        formData.technicalSkills || [],
        formData.softSkills || [],
        locale,
      ),
    [formData.softSkills, formData.technicalSkills, locale, roleSignal],
  );

  // Field arrays
  const {
    fields: experienceFields,
    append: appendExperience,
    remove: removeExperience,
    replace: replaceExperiences,
  } = useFieldArray({ control, name: "experiences" });

  const {
    fields: educationFields,
    append: appendEducation,
    remove: removeEducation,
  } = useFieldArray({ control, name: "education" });

  const {
    fields: languageFields,
    append: appendLanguage,
    remove: removeLanguage,
  } = useFieldArray({ control, name: "languages" });

  const {
    fields: certificationFields,
    append: appendCertification,
    remove: removeCertification,
  } = useFieldArray({ control, name: "certifications" });

  const {
    fields: projectFields,
    append: appendProject,
    remove: removeProject,
  } = useFieldArray({ control, name: "projects" });

  // Auto-save effect
  useEffect(() => {
    const autoSave = setInterval(() => {
      localStorage.setItem("resume_draft", JSON.stringify(formData));
      setLastSaved(new Date());
    }, 30000); // 30 seconds

    return () => clearInterval(autoSave);
  }, [formData]);

  // Load saved draft
  useEffect(() => {
    const saved = localStorage.getItem("resume_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach((key) => {
          setValue(key as any, parsed[key]);
        });
      } catch (e) {
        console.error("Failed to load draft");
      }
    }
  }, []);

  // Step validation
  const validateCurrentStep = async () => {
    let fieldsToValidate: string[] = [];
    switch (currentStep) {
      case 1:
        fieldsToValidate = ["fullName", "email", "phone", "professionalTitle"];
        break;
      case 2:
        fieldsToValidate = ["experiences"];
        break;
      case 3:
        fieldsToValidate = ["education"];
        break;
      case 4:
        fieldsToValidate = ["technicalSkills", "softSkills"];
        break;
      case 5:
        return true;
    }
    return await trigger(fieldsToValidate as any);
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Add skill
  const addSkill = (type: "technical" | "soft") => {
    const value = skillInput[type].trim();
    if (value) {
      const currentSkills =
        formData[type === "technical" ? "technicalSkills" : "softSkills"] || [];
      if (!currentSkills.includes(value)) {
        setValue(type === "technical" ? "technicalSkills" : "softSkills", [
          ...currentSkills,
          value,
        ]);
      }
      setSkillInput((prev) => ({ ...prev, [type]: "" }));
    }
  };

  // Remove skill
  const removeSkill = (type: "technical" | "soft", skill: string) => {
    const field = type === "technical" ? "technicalSkills" : "softSkills";
    const currentSkills = formData[field] || [];
    setValue(
      field,
      currentSkills.filter((s) => s !== skill),
    );
  };

  // Generate Resume using AI API
  const handleGenerate = async () => {
    try {
      type GenerateResumePayload = Parameters<typeof generateResume>[0];

      const payload: GenerateResumePayload = {
        user_data: {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location || undefined,
          professional_title: formData.professionalTitle,
          linkedin_url: formData.linkedinUrl || undefined,
          portfolio_url: formData.portfolioUrl || undefined,
          skills: [...formData.technicalSkills, ...formData.softSkills].filter(
            Boolean,
          ),
          experience: formData.experiences
            .filter((exp) => exp.company || exp.position || exp.description)
            .map((exp) => ({
              company: exp.company ?? "",
              position: exp.position ?? "",
              duration: exp.isCurrent
                ? `${exp.startDate ?? ""} - Present`
                : `${exp.startDate ?? ""}${exp.endDate ? ` - ${exp.endDate}` : ""}`,
              description: exp.description ?? "",
            })),
          education: formData.education
            .filter((edu) => edu.institution || edu.degree || edu.field)
            .map((edu) => ({
              institution: edu.institution ?? "",
              degree: edu.degree ?? "",
              field: edu.field ?? "",
              year: edu.isCurrent
                ? (isRu ? "По настоящее время" : "Hozirgi vaqt")
                : (edu.year ?? ""),
            })),
        },
        template: selectedTemplate as GenerateResumePayload["template"],
        tone: selectedTone as GenerateResumePayload["tone"],
        language: getPreferredLocale(),
        // Persist skill verification statuses into the generated resume content.
        skill_verifications: skillStatuses,
      };

      const result = await generateResume(payload);
      if (result) {
        setGeneratedResume(result);
        setIsGenerated(true);
        localStorage.removeItem("resume_draft");
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#82A8F7", "#6F9BF0", "#a08de0"],
        });
      }
    } catch (error) {
      // error already shown by hook
    }
  };

  const handleDownloadGenerated = async () => {
    if (!generatedResume) {
      toast.info(t("aiResumeBuilder.generateFirst"));
      return;
    }

    setIsDownloadingPdf(true);
    try {
      const response = await resumeApi.download(generatedResume.id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `${generatedResume.title || "resume"}`.replace(
        /[\\/:*?"<>|]+/g,
        "_",
      );
      link.href = url;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("aiResumeBuilder.pdfDownloaded"));
    } catch {
      toast.error(t("aiResumeBuilder.pdfDownloadError"));
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const previewContent: ResumeContent = {
    personal_info: {
      name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      professional_title: formData.professionalTitle,
      linkedin_url: formData.linkedinUrl,
      portfolio_url: formData.portfolioUrl,
    },
    experience: formData.experiences
      .filter((exp) => exp.company || exp.position || exp.description)
      .map((exp) => ({
        company: exp.company ?? "",
        position: exp.position ?? "",
        start_date: exp.startDate ?? "",
        end_date: exp.endDate ?? "",
        is_current: exp.isCurrent,
        description: exp.description ?? "",
      })),
    education: formData.education
      .filter((edu) => edu.institution || edu.degree || edu.field)
      .map((edu) => ({
        institution: edu.institution ?? "",
        degree: edu.degree ?? "",
        field: edu.field ?? "",
        // Currently-studying students have no graduation year — show "present".
        year: edu.isCurrent ? (isRu ? "По настоящее время" : "Hozirgi vaqt") : (edu.year ?? ""),
      })),
    skills: {
      technical: formData.technicalSkills,
      soft: formData.softSkills,
    },
    // MVP: skill verification status map (verified | learning | unverified).
    // Extra field — backend stores it in resume content; old resumes unaffected.
    skillVerifications: skillStatuses,
    languages: formData.languages.filter((language) => language.name),
    certifications: formData.certifications.filter((cert) => cert.name),
    projects: formData.projects.filter((project) => project.name),
  };

  // Progress calculation
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* LEFT SIDE - Form (40%) */}
      <div className="w-full lg:w-[40%] flex flex-col border-r border-surface-200 dark:border-surface-700 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl font-bold text-surface-900 dark:text-white">
                {t("aiResumeBuilder.title")}
              </h1>
              <p className="text-sm text-surface-500">
                {t(steps[currentStep - 1].descriptionKey)}
              </p>
            </div>
            {lastSaved && (
              <span className="flex items-center gap-1 text-xs text-surface-400">
                <Save className="h-3 w-3" />
                {t("aiResumeBuilder.saved")} {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs">
              <span>
                {t("aiResumeBuilder.stepOf")} {currentStep}/{steps.length}
              </span>
              <span>
                {Math.round(progress)}% {t("aiResumeBuilder.complete")}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="mt-4 flex gap-2">
            {steps.map((step) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(step.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-lg p-2 text-xs transition-all",
                  currentStep === step.id
                    ? "bg-brand-100 text-brand-700"
                    : currentStep > step.id
                      ? "bg-green-100 text-green-700"
                      : "bg-surface-100 text-surface-500",
                )}
              >
                <step.icon className="h-4 w-4" />
                <span className="hidden sm:block">{t(step.titleKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="fullName">
                      {t("aiResumeBuilder.fullName")}
                    </Label>
                    <Input
                      id="fullName"
                      placeholder={t("auth.register.placeholders.fullName")}
                      icon={<User className="h-4 w-4" />}
                      error={errors.fullName?.message}
                      {...register("fullName")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{t("aiResumeBuilder.email")}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t("auth.register.placeholders.email")}
                      icon={<Mail className="h-4 w-4" />}
                      error={errors.email?.message}
                      {...register("email")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{t("aiResumeBuilder.phone")}</Label>
                    <Input
                      id="phone"
                      placeholder={t("auth.register.placeholders.phone")}
                      icon={<Phone className="h-4 w-4" />}
                      error={errors.phone?.message}
                      {...register("phone")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="location">
                      {t("aiResumeBuilder.location")}
                    </Label>
                    <Input
                      id="location"
                      placeholder="Tashkent, Uzbekistan"
                      icon={<MapPin className="h-4 w-4" />}
                      {...register("location")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="professionalTitle">
                      {t("aiResumeBuilder.professionalTitle")}
                    </Label>
                    <Input
                      id="professionalTitle"
                      placeholder={t(
                        "aiResumeBuilder.professionalTitlePlaceholder",
                      )}
                      icon={<Briefcase className="h-4 w-4" />}
                      error={errors.professionalTitle?.message}
                      {...register("professionalTitle")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="linkedinUrl">
                      {t("aiResumeBuilder.linkedinUrl")}
                    </Label>
                    <Input
                      id="linkedinUrl"
                      placeholder="https://linkedin.com/in/..."
                      icon={<Linkedin className="h-4 w-4" />}
                      {...register("linkedinUrl")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="portfolioUrl">
                      {t("aiResumeBuilder.portfolioUrl")}
                    </Label>
                    <Input
                      id="portfolioUrl"
                      placeholder="https://yoursite.com"
                      icon={<Globe className="h-4 w-4" />}
                      {...register("portfolioUrl")}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Experience */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Experience is optional — students with no work history can skip. */}
                <div className="flex flex-col gap-2 rounded-xl border border-dashed border-surface-300 bg-surface-50 p-3 text-sm dark:border-surface-700 dark:bg-surface-800/60 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-surface-600 dark:text-surface-300">
                    {isRu
                      ? "Опыт работы необязателен. Нет опыта? Можно пропустить."
                      : "Ish tajribasi ixtiyoriy. Tajribangiz yo'qmi? O'tkazib yuborsangiz bo'ladi."}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-brand-700 hover:bg-brand-50 dark:text-brand-300"
                    onClick={() => {
                      replaceExperiences([]);
                      setCurrentStep(3);
                    }}
                  >
                    {isRu ? "Нет опыта — пропустить" : "Tajribam yo'q — o'tkazish"}
                  </Button>
                </div>

                {experienceFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative rounded-xl border border-surface-200 p-4 dark:border-surface-700"
                  >
                    {experienceFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExperience(index)}
                        className="absolute right-2 top-2 rounded-lg p-1 text-surface-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>{t("aiResumeBuilder.companyName")}</Label>
                        <Input
                          placeholder="Kompaniya nomi"
                          {...register(`experiences.${index}.company`)}
                        />
                      </div>
                      <div>
                        <Label>{t("aiResumeBuilder.position")}</Label>
                        <Input
                          placeholder="Lavozim nomi"
                          {...register(`experiences.${index}.position`)}
                        />
                      </div>
                      <div>
                        <Label>{t("aiResumeBuilder.startDate")}</Label>
                        <MonthYearPicker
                          value={formData.experiences?.[index]?.startDate ?? ""}
                          onChange={(v) =>
                            setValue(`experiences.${index}.startDate`, v, { shouldDirty: true })
                          }
                        />
                      </div>
                      <div>
                        <Label>{t("aiResumeBuilder.endDate")}</Label>
                        <MonthYearPicker
                          value={formData.experiences?.[index]?.endDate ?? ""}
                          onChange={(v) =>
                            setValue(`experiences.${index}.endDate`, v, { shouldDirty: true })
                          }
                          disabled={formData.experiences?.[index]?.isCurrent}
                        />
                        <label className="mt-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            {...register(`experiences.${index}.isCurrent`)}
                            className="rounded border-surface-300"
                          />
                          {t("aiResumeBuilder.currentlyWorking")}
                        </label>
                      </div>
                      <div className="sm:col-span-2">
                        <Label>{t("aiResumeBuilder.description")}</Label>
                        <Textarea
                          placeholder={t(
                            "aiResumeBuilder.descriptionPlaceholder",
                          )}
                          rows={4}
                          {...register(`experiences.${index}.description`)}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    appendExperience({
                      company: "",
                      position: "",
                      startDate: "",
                      endDate: "",
                      isCurrent: false,
                      description: "",
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("aiResumeBuilder.addExperience")}
                </Button>
              </motion.div>
            )}

            {/* Step 3: Education */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {educationFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="relative rounded-xl border border-surface-200 p-4 dark:border-surface-700"
                  >
                    {educationFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEducation(index)}
                        className="absolute right-2 top-2 rounded-lg p-1 text-surface-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Label>{t("aiResumeBuilder.institution")}</Label>
                        <Input
                          placeholder="O'quv yurt nomi"
                          {...register(`education.${index}.institution`)}
                        />
                      </div>
                      <div>
                        <Label>{t("aiResumeBuilder.degree")}</Label>
                        <Input
                          placeholder="Bakalavriat"
                          {...register(`education.${index}.degree`)}
                        />
                      </div>
                      <div>
                        <Label>{t("aiResumeBuilder.fieldOfStudy")}</Label>
                        <Input
                          placeholder="Kompyuter fanlari"
                          {...register(`education.${index}.field`)}
                        />
                      </div>
                      <div>
                        <Label>{t("aiResumeBuilder.graduationYear")}</Label>
                        <Input
                          placeholder="2024"
                          disabled={formData.education?.[index]?.isCurrent}
                          {...register(`education.${index}.year`)}
                        />
                        <label className="mt-2 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            {...register(`education.${index}.isCurrent`)}
                            className="rounded border-surface-300"
                          />
                          {isRu ? "Сейчас учусь" : "Hozir o'qiyapman"}
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    appendEducation({
                      institution: "",
                      degree: "",
                      field: "",
                      year: "",
                      isCurrent: false,
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("aiResumeBuilder.addEducation")}
                </Button>
              </motion.div>
            )}

            {/* Step 4: Skills */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Technical Skills */}
                <div className="rounded-[24px] border border-surface-200/70 bg-white/70 p-4 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none">
                  <Label className="text-base font-bold text-surface-800 dark:text-white">
                    {t("aiResumeBuilder.technicalSkills")}
                  </Label>
                  {activeSkillProfile && (
                    <p className="mt-1 text-xs font-medium text-brand-700 dark:text-brand-300">
                      {t("aiResumeBuilder.roleMatchedSuggestions")}:{" "}
                      {activeSkillProfile.label}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder={t("aiResumeBuilder.addSkillPlaceholder")}
                      value={skillInput.technical}
                      className={skillInputClassName}
                      onChange={(e) =>
                        setSkillInput((prev) => ({
                          ...prev,
                          technical: e.target.value,
                        }))
                      }
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addSkill("technical"))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className={skillAddButtonClassName}
                      onClick={() => addSkill("technical")}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.technicalSkills?.map((skill) => {
                      const status = skillStatuses[skill];
                      return (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className={cn(
                            selectedSkillBadgeClassName,
                            status === "verified"
                              ? "border-brand-300 bg-brand-50 text-brand-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-brand-400/40 dark:bg-brand-400/12 dark:text-brand-100 dark:hover:border-red-400/50 dark:hover:bg-red-500/12 dark:hover:text-red-100"
                              : status === "learning"
                                ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-amber-300/40 dark:bg-amber-300/12 dark:text-amber-100 dark:hover:border-red-400/50 dark:hover:bg-red-500/12 dark:hover:text-red-100"
                                : "",
                          )}
                          onClick={() => removeSkill("technical", skill)}
                        >
                          {status === "verified" && "✓ "}
                          {status === "learning" && "📘 "}
                          {skill}
                          <span className="ml-1.5 text-surface-400 transition-colors group-hover:text-red-500 dark:text-surface-500 dark:group-hover:text-red-200">
                            ×
                          </span>
                        </Badge>
                      );
                    })}
                  </div>
                  <div className="mt-2">
                    <p className="mb-2 text-xs font-semibold text-surface-500 dark:text-surface-300">
                      {t("aiResumeBuilder.suggestedSkills")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {technicalSkillSuggestions.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() =>
                            setValue("technicalSkills", [
                              ...(formData.technicalSkills || []),
                              skill,
                            ])
                          }
                          className={suggestedSkillChipClassName}
                        >
                          + {skill}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional, junior-friendly skill verification */}
                  <SkillVerification
                    skills={formData.technicalSkills || []}
                    statuses={skillStatuses}
                    onChange={setSkillStatus}
                    locale={locale}
                  />
                </div>

                {/* Soft Skills */}
                <div className="rounded-[24px] border border-surface-200/70 bg-white/70 p-4 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none">
                  <Label className="text-base font-bold text-surface-800 dark:text-white">
                    {t("aiResumeBuilder.softSkills")}
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder={t("aiResumeBuilder.addSkillPlaceholder")}
                      value={skillInput.soft}
                      className={skillInputClassName}
                      onChange={(e) =>
                        setSkillInput((prev) => ({
                          ...prev,
                          soft: e.target.value,
                        }))
                      }
                      onKeyPress={(e) =>
                        e.key === "Enter" &&
                        (e.preventDefault(), addSkill("soft"))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className={skillAddButtonClassName}
                      onClick={() => addSkill("soft")}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.softSkills?.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className={selectedSkillBadgeClassName}
                        onClick={() => removeSkill("soft", skill)}
                      >
                        {skill}
                        <span className="ml-1.5 text-surface-400 transition-colors group-hover:text-red-500 dark:text-surface-500 dark:group-hover:text-red-200">
                          ×
                        </span>
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2">
                    <p className="mb-2 text-xs font-semibold text-surface-500 dark:text-surface-300">
                      {t("aiResumeBuilder.suggestedSkills")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {softSkillSuggestions.map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() =>
                            setValue("softSkills", [
                              ...(formData.softSkills || []),
                              skill,
                            ])
                          }
                          className={suggestedSkillChipClassName}
                        >
                          + {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <Label>{t("aiResumeBuilder.languages")}</Label>
                  <div className="mt-2 space-y-2">
                    {languageFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <Input
                          placeholder={t("aiResumeBuilder.language")}
                          {...register(`languages.${index}.name`)}
                        />
                        <Select
                          value={formData.languages?.[index]?.proficiency}
                          onValueChange={(v) =>
                            setValue(`languages.${index}.proficiency`, v)
                          }
                        >
                          <SelectTrigger className="w-44">
                            <SelectValue
                              placeholder={t("aiResumeBuilder.level")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="native">
                              {t("aiResumeBuilder.native")}
                            </SelectItem>
                            <SelectItem value="fluent">
                              {t("aiResumeBuilder.fluent")}
                            </SelectItem>
                            <SelectItem value="advanced">
                              {t("aiResumeBuilder.advanced")}
                            </SelectItem>
                            <SelectItem value="intermediate">
                              {t("aiResumeBuilder.intermediate")}
                            </SelectItem>
                            <SelectItem value="basic">
                              {t("aiResumeBuilder.basic")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {languageFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLanguage(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendLanguage({ name: "", proficiency: "" })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("aiResumeBuilder.addLanguage")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Additional */}
            {currentStep === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Template Selection */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    {t("aiResumeBuilder.resumeTemplate")}
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => setSelectedTemplate(template.id)}
                        className={cn(
                          "rounded-xl border-2 p-3 text-left transition-all",
                          selectedTemplate === template.id
                            ? "border-brand-500 bg-brand-50"
                            : "border-surface-200 hover:border-surface-300",
                        )}
                      >
                        <p className="font-medium text-surface-900">
                          {t(template.nameKey)}
                        </p>
                        <p className="text-xs text-surface-500">
                          {t(template.descriptionKey)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone Selection */}
                <div>
                  <Label className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    {t("aiResumeBuilder.writingTone")}
                  </Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {tones.map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setSelectedTone(tone.id)}
                        className={cn(
                          "rounded-xl border-2 p-3 text-left transition-all",
                          selectedTone === tone.id
                            ? "border-brand-500 bg-brand-50"
                            : "border-surface-200 hover:border-surface-300",
                        )}
                      >
                        <p className="font-medium text-surface-900">
                          {t(tone.nameKey)}
                        </p>
                        <p className="text-xs text-surface-500">
                          {t(tone.descriptionKey)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <Label>{t("aiResumeBuilder.certifications")}</Label>
                  <div className="mt-2 space-y-2">
                    {certificationFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <Input
                          placeholder={t("aiResumeBuilder.certName")}
                          {...register(`certifications.${index}.name`)}
                        />
                        <Input
                          placeholder={t("aiResumeBuilder.issuer")}
                          className="w-32"
                          {...register(`certifications.${index}.issuer`)}
                        />
                        <Input
                          placeholder={t("aiResumeBuilder.year")}
                          className="w-20"
                          {...register(`certifications.${index}.year`)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCertification(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendCertification({ name: "", issuer: "", year: "" })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("aiResumeBuilder.addCertification")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <Button variant="outline" onClick={prevStep} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("aiResumeBuilder.previous")}
              </Button>
            )}

            {currentStep < 5 ? (
              <Button
                onClick={nextStep}
                className="flex-1 bg-gradient-to-r from-brand-500 to-violet-600"
              >
                {t("aiResumeBuilder.next")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 bg-gradient-to-r from-brand-500 to-violet-600 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("aiResumeBuilder.generating")}
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    {t("aiResumeBuilder.generateWithAI")}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Preview (60%) */}
      <div className="hidden lg:flex lg:w-[60%] flex-col bg-surface-100 dark:bg-surface-800">
        {/* Preview Header */}
        <div className="flex items-center justify-between border-b border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-900">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-surface-500" />
            <span className="font-medium text-surface-900 dark:text-white">
              {t("aiResumeBuilder.livePreview")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewZoom((z) => Math.max(60, z - 10))}
              title={isRu ? "Уменьшить масштаб" : "Masshtabni kichraytirish"}
              aria-label={
                isRu ? "Уменьшить масштаб" : "Masshtabni kichraytirish"
              }
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span
              className="w-24 text-center text-sm text-surface-500"
              title={
                isRu
                  ? "Текущий масштаб предпросмотра"
                  : "Joriy preview masshtabi"
              }
              aria-label={
                isRu
                  ? "Текущий масштаб предпросмотра"
                  : "Joriy preview masshtabi"
              }
            >
              {isRu ? "Масштаб" : "Masshtab"} {previewZoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPreviewZoom((z) => Math.min(100, z + 10))}
              title={isRu ? "Увеличить масштаб" : "Masshtabni kattalashtirish"}
              aria-label={
                isRu ? "Увеличить масштаб" : "Masshtabni kattalashtirish"
              }
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="mx-2 h-6 w-px bg-surface-200" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadGenerated}
              disabled={!generatedResume || isDownloadingPdf}
              title={
                isRu
                  ? "Резюме yuklab olish (PDF)"
                  : "Rezyumeni PDF qilib yuklab olish"
              }
              aria-label={
                isRu
                  ? "Резюме yuklab olish (PDF)"
                  : "Rezyumeni PDF qilib yuklab olish"
              }
            >
              {isDownloadingPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {t("aiResumeBuilder.downloadPDF")}
            </Button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 xl:p-6">
          <div
            className="mx-auto w-full max-w-[840px] rounded-2xl bg-white shadow-2xl dark:bg-surface-800"
            style={{
              zoom: previewZoom / 100,
              transformOrigin: "top center",
              width: "100%",
              minHeight: "297mm",
            }}
          >
            <ResumePreview
              content={previewContent}
              title={formData.fullName || t("aiResumeBuilder.title")}
              locale={locale}
              isPlaceholder={!formData.fullName}
              template={selectedTemplate}
            />
          </div>
        </div>

        {/* Success overlay */}
        <AnimatePresence>
          {isGenerated && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-surface-800"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
                >
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-surface-900">
                  {t("aiResumeBuilder.resumeGenerated")}
                </h2>
                <p className="mt-2 text-surface-500">
                  {t("aiResumeBuilder.aiResumeReady")}
                </p>
                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsGenerated(false)}
                  >
                    {t("aiResumeBuilder.editResume")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      generatedResume &&
                      router.push(`/student/resumes/${generatedResume.id}`)
                    }
                    disabled={!generatedResume}
                  >
                    {isRu ? "Открыть" : "Ko'rish"}
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-brand-500 to-cyan-600"
                    onClick={handleDownloadGenerated}
                    disabled={!generatedResume || isDownloadingPdf}
                  >
                    {isDownloadingPdf ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {t("aiResumeBuilder.downloadPDF")}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
