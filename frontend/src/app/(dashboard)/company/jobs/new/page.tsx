/**
 * =============================================================================
 * NEW JOB POSTING PAGE
 * =============================================================================
 *
 * Features:
 * - Multi-step form for job creation
 * - AI-assisted job description generation
 * - Preview before publishing
 * - Salary range calculator
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Users,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Eye,
  Save,
  Send,
  Loader2,
  Building2,
  GraduationCap,
  Code,
  FileText,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api, jobApi, aiApi, getErrorMessage } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import RichTextEditor from "@/components/editor/RichTextEditor";
import { plainTextToRichHtml, sanitizeRichTextHtml, stripHtmlTags } from "@/lib/utils";

// =============================================================================
// VALIDATION SCHEMA
// =============================================================================

// Validation messages: factory so we instantiate per-locale inside the
// component. Zod captures the message string at schema-creation time, so a
// module-level schema would lock all users to one language.
function buildJobSchema(isRu: boolean) {
  const m = isRu
    ? {
        titleMin: "Название должности должно содержать не менее 3 символов",
        locationReq: "Местоположение обязательно",
        descriptionMin: "Описание должно содержать не менее 100 символов",
        requirementsMin: "Требования должны содержать не менее 50 символов",
        skillsMin: "Добавьте хотя бы один навык",
      }
    : {
        titleMin: "Lavozim nomi kamida 3 ta belgi bo'lishi kerak",
        locationReq: "Joylashuv kiritilishi shart",
        descriptionMin: "Tavsif kamida 100 ta belgi bo'lishi kerak",
        requirementsMin: "Talablar kamida 50 ta belgi bo'lishi kerak",
        skillsMin: "Kamida 1 ta ko'nikma kiriting",
      };

  return z.object({
    title: z.string().min(3, m.titleMin),
    department: z.string().optional(),
    location: z.string().min(2, m.locationReq),
    jobType: z.enum(["full_time", "part_time", "contract", "internship", "remote"]),
    experienceLevel: z.enum(["entry", "junior", "mid", "senior", "lead", "executive"]),
    salaryMin: z.number().min(0).optional(),
    salaryMax: z.number().min(0).optional(),
    salaryCurrency: z.enum(["UZS", "USD"]).default("UZS"),
    isSalaryVisible: z.boolean().default(true),
    description: z
      .string()
      .refine((value) => stripHtmlTags(value).length >= 100, m.descriptionMin),
    requirements: z.string().min(50, m.requirementsMin),
    benefits: z.string().optional(),
    skills: z.array(z.string()).min(1, m.skillsMin),
    deadline: z.string().optional(),
    vacancies: z.number().min(1).default(1),
  });
}

type JobFormData = z.infer<ReturnType<typeof buildJobSchema>>;

// =============================================================================
// CONSTANTS
// =============================================================================

const steps = [
  { id: 1, title: "Asosiy ma'lumotlar", icon: Briefcase },
  { id: 2, title: "Tavsif", icon: FileText },
  { id: 3, title: "Talablar", icon: Code },
  { id: 4, title: "Ko'rib chiqish", icon: Eye },
];

const jobTypes = [
  { value: "full_time", label: "To'liq vaqtli" },
  { value: "part_time", label: "Yarim vaqtli" },
  { value: "contract", label: "Shartnoma" },
  { value: "internship", label: "Amaliyot" },
  { value: "remote", label: "Masofaviy" },
];

const experienceLevels = [
  { value: "entry", label: "Boshlang'ich" },
  { value: "junior", label: "Boshlovchi (1-2 yil)" },
  { value: "mid", label: "O'rta (3-5 yil)" },
  { value: "senior", label: "Katta (5+ yil)" },
  { value: "lead", label: "Rahbar" },
  { value: "executive", label: "Direktor+" },
];

const suggestedSkills = [
  "JavaScript", "TypeScript", "Python", "React", "Node.js", "PostgreSQL",
  "Docker", "AWS", "Git", "Agile", "Communication", "Leadership",
  "Problem Solving", "Project Management", "Data Analysis"
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function NewJobPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiTone, setAiTone] = useState<"professional" | "friendly" | "startup">("professional");
  const [aiLocale, setAiLocale] = useState<"uz" | "ru" | "en">(locale === "ru" ? "ru" : "uz");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const jobSchema = useMemo(() => buildJobSchema(isRu), [isRu]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      location: "Toshkent, O'zbekiston",
      jobType: "full_time",
      experienceLevel: "mid",
      isSalaryVisible: true,
      salaryCurrency: "UZS",
      skills: [],
      description: "",
      requirements: "",
      benefits: "",
      vacancies: 1,
    },
  });

  const formData = watch();

  useEffect(() => {
    api
      .get("/users/me/notification-preferences")
      .then((res) => {
        const preferred = String(res.data?.data?.preferred_salary_currency || "UZS").toUpperCase();
        setValue("salaryCurrency", preferred === "USD" ? "USD" : "UZS");
      })
      .catch(() => {});
  }, [setValue]);

  // Step validation
  const validateStep = async (step: number) => {
    let fieldsToValidate: (keyof JobFormData)[] = [];
    switch (step) {
      case 1:
        fieldsToValidate = ["title", "location", "jobType", "experienceLevel"];
        break;
      case 2:
        fieldsToValidate = ["description"];
        break;
      case 3:
        fieldsToValidate = ["requirements", "skills"];
        break;
    }
    return await trigger(fieldsToValidate);
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Add skill
  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !formData.skills.includes(trimmed)) {
      setValue("skills", [...formData.skills, trimmed]);
    }
    setSkillInput("");
  };

  // Remove skill
  const removeSkill = (skill: string) => {
    setValue("skills", formData.skills.filter((s) => s !== skill));
  };

  // AI Generate full job description (description + requirements + skills) via Gemini.
  const generateDescription = async () => {
    if (!formData.title) {
      toast.error(isRu ? "Сначала введите название позиции" : "Avval lavozim nomini kiriting");
      return;
    }

    setIsGenerating(true);
    setAiProgress(8);
    const progressTimer = window.setInterval(() => {
      setAiProgress((prev) => (prev >= 90 ? prev : prev + 9));
    }, 300);
    try {
      const res = await aiApi.hrJobDescription({
        title: formData.title,
        seniority: formData.experienceLevel || "mid",
        tone: aiTone,
        location: formData.location,
        must_have: (formData.skills || []).slice(0, 10),
        locale: aiLocale,
      });
      const data = (res.data as { data: { description: string; summary?: string; requirements: string[]; responsibilities: string[]; benefits: string[]; nice_to_have: string[]; ai_generated: boolean } }).data;

      const descriptionBlock = [
        data.summary,
        "",
        data.description,
        "",
        isRu ? "Что вам предстоит делать:" : "Sizning vazifalaringiz:",
        ...(data.responsibilities || []).map((r) => `• ${r}`),
        "",
        isRu ? "Преимущества:" : "Imtiyozlar:",
        ...(data.benefits || []).map((b) => `• ${b}`),
      ]
        .filter(Boolean)
        .join("\n");

      const requirementsBlock = [
        ...(data.requirements || []).map((r) => `• ${r}`),
        ...(data.nice_to_have?.length ? ["", isRu ? "Будет плюсом:" : "Qo'shimcha afzallik:", ...data.nice_to_have.map((n) => `• ${n}`)] : []),
      ].join("\n");

      setValue("description", plainTextToRichHtml(descriptionBlock), { shouldDirty: true, shouldValidate: true });
      const benefitsBlock = (data.benefits || []).map((b) => `• ${b}`).join("\n");
      setValue("benefits", plainTextToRichHtml(benefitsBlock), { shouldDirty: true, shouldValidate: true });
      setValue("requirements", requirementsBlock);
      setAiProgress(100);
      toast.success(
        data.ai_generated
          ? (isRu ? "AI описание сгенерировано!" : "AI tavsif yaratildi!")
          : (isRu ? "Шаблон сгенерирован (AI временно недоступен)" : "Shablon yaratildi (AI hozircha mavjud emas)")
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      window.clearInterval(progressTimer);
      window.setTimeout(() => setAiProgress(0), 500);
      setIsGenerating(false);
    }
  };

  // Submit form - create job via API then publish
  const onSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);
    try {
      // Backend JobCreate expects List[str] for requirements & benefits.
      const requirementLines = (data.requirements || "")
        .split(/\r?\n/)
        .map((s) => s.replace(/^[-•\s]+/, "").trim())
        .filter(Boolean);
      const requirementsList = [
        ...requirementLines,
        ...(data.skills?.length ? [`Ko'nikmalar: ${data.skills.join(", ")}`] : []),
      ];
      const benefitsList = stripHtmlTags(data.benefits || "")
        .split(/\r?\n/)
        .map((s) => s.replace(/^[-•\s]+/, "").trim())
        .filter(Boolean);

      const payload = {
        title: data.title,
        location: data.location,
        job_type: data.jobType,
        experience_level: data.experienceLevel,
        description: sanitizeRichTextHtml(data.description),
        requirements: requirementsList,
        benefits: benefitsList,
        salary_min: Number.isFinite(data.salaryMin) ? data.salaryMin : undefined,
        salary_max: Number.isFinite(data.salaryMax) ? data.salaryMax : undefined,
        salary_currency: data.salaryCurrency,
        is_salary_visible: data.isSalaryVisible,
        expires_at: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      };

      const res = await jobApi.create(payload);
      const created = res.data as { id: string };

      // Publish the newly created job
      await jobApi.publish(created.id);

      toast.success("Vakansiya muvaffaqiyatli e'lon qilindi!");
      router.push("/company/jobs");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft
  const saveDraft = async () => {
    try {
      const payload = {
        title: formData.title,
        location: formData.location,
        job_type: formData.jobType,
        experience_level: formData.experienceLevel,
        description: sanitizeRichTextHtml(formData.description),
        requirements: { text: formData.requirements, skills: formData.skills },
        benefits: sanitizeRichTextHtml(formData.benefits || ""),
        salary_min: formData.salaryMin,
        salary_max: formData.salaryMax,
        salary_currency: formData.salaryCurrency,
        is_salary_visible: formData.isSalaryVisible,
        vacancies: formData.vacancies,
        deadline: formData.deadline || null,
        department: formData.department,
      };
      await jobApi.create(payload);
      toast.success("Qoralama saqlandi");
      router.push("/company/jobs");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          Yangi vakansiya yaratish
        </h1>
        <p className="mt-1 text-surface-500">
          {steps[currentStep - 1].title}
        </p>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800">
        <div className="mb-4 flex justify-between">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              disabled={step.id > currentStep}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                currentStep === step.id
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20"
                  : currentStep > step.id
                  ? "text-green-600"
                  : "text-surface-400"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  currentStep === step.id
                    ? "bg-purple-500 text-white"
                    : currentStep > step.id
                    ? "bg-green-500 text-white"
                    : "bg-surface-200 dark:bg-surface-700"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardContent className="space-y-6 pt-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label htmlFor="title">Lavozim nomi *</Label>
                      <Input
                        id="title"
                        placeholder={isRu ? "например: Руководитель отдела разработки" : "masalan: Dasturiy ta'minot bo'limi rahbari"}
                        {...register("title")}
                        error={errors.title?.message}
                      />
                    </div>

                    <div>
                      <Label htmlFor="department">Bo'lim</Label>
                      <Input
                        id="department"
                        placeholder="masalan: Texnologiya"
                        {...register("department")}
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Joylashuv *</Label>
                      <Input
                        id="location"
                        placeholder="masalan: Toshkent"
                        {...register("location")}
                        error={errors.location?.message}
                      />
                    </div>

                    <div>
                      <Label>Ish turi *</Label>
                      <Select
                        value={formData.jobType}
                        onValueChange={(v) => setValue("jobType", v as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {jobTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Tajriba darajasi *</Label>
                      <Select
                        value={formData.experienceLevel}
                        onValueChange={(v) => setValue("experienceLevel", v as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {experienceLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Maosh valyutasi</Label>
                      <Select
                        value={formData.salaryCurrency}
                        onValueChange={(v) => setValue("salaryCurrency", v as "UZS" | "USD")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UZS">UZS</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="salaryMin">Minimal maosh ({formData.salaryCurrency})</Label>
                      <Input
                        id="salaryMin"
                        type="number"
                        placeholder={formData.salaryCurrency === "USD" ? "1200" : "5,000,000"}
                        {...register("salaryMin", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="salaryMax">Maksimal maosh ({formData.salaryCurrency})</Label>
                      <Input
                        id="salaryMax"
                        type="number"
                        placeholder={formData.salaryCurrency === "USD" ? "3000" : "15,000,000"}
                        {...register("salaryMax", { setValueAs: (v) => v === "" || v == null ? undefined : Number(v) })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Maoshni ko'rsatish</Label>
                          <p className="text-sm text-surface-500">
                            Nomzodlarga maosh oralig'ini ko'rsatish
                          </p>
                        </div>
                        <Switch
                          checked={formData.isSalaryVisible}
                          onCheckedChange={(v: boolean) => setValue("isSalaryVisible", v)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="vacancies">Bo'sh o'rinlar soni</Label>
                      <Input
                        id="vacancies"
                        type="number"
                        min={1}
                        {...register("vacancies", { setValueAs: (v) => v === "" || v == null ? 1 : Number(v) })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="deadline">Ariza berish muddati</Label>
                      <Input
                        id="deadline"
                        type="date"
                        {...register("deadline")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Description */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardContent className="space-y-6 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ish tavsifi *</Label>
                      <p className="text-sm text-surface-500">
                        Lavozim va mas'uliyatlar haqida batafsil yozing
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateDescription}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      {formData.description ? "Qayta yaratish" : "AI bilan yaratish"}
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>AI uslubi</Label>
                      <Select
                        value={aiTone}
                        onValueChange={(value) => setAiTone(value as "professional" | "friendly" | "startup")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="startup">Startup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>AI tili</Label>
                      <Select value={aiLocale} onValueChange={(value) => setAiLocale(value as "uz" | "ru" | "en")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uz">O&apos;zbekcha</SelectItem>
                          <SelectItem value="ru">Ruscha</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isGenerating && (
                    <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-500/30 dark:bg-brand-500/10">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-brand-800 dark:text-brand-200">
                          AI tavsif tayyorlanmoqda...
                        </span>
                        <span className="text-brand-700 dark:text-brand-300">{aiProgress}%</span>
                      </div>
                      <Progress value={aiProgress} className="h-2" />
                    </div>
                  )}

                  <RichTextEditor
                    value={formData.description || ""}
                    onChange={(value) => setValue("description", value, { shouldDirty: true, shouldValidate: true })}
                    placeholder="Lavozim haqida batafsil ma'lumot..."
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500">{errors.description.message}</p>
                  )}

                  <div>
                    <Label>Imtiyozlar va bonuslar</Label>
                    <RichTextEditor
                      value={formData.benefits || ""}
                      onChange={(value) => setValue("benefits", value, { shouldDirty: true, shouldValidate: false })}
                      placeholder="masalan: Tibbiy sug'urta, bepul tushlik, masofaviy ishlash..."
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Requirements */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardContent className="space-y-6 pt-6">
                  <div>
                    <Label>Talablar *</Label>
                    <Textarea
                      placeholder="Nomzodga qo'yiladigan talablar..."
                      rows={8}
                      {...register("requirements")}
                      className={errors.requirements ? "border-red-500" : ""}
                    />
                    {errors.requirements && (
                      <p className="text-sm text-red-500">{errors.requirements.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Kerakli ko'nikmalar *</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="Ko'nikma qo'shish..."
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill(skillInput);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addSkill(skillInput)}
                      >
                        Qo'shish
                      </Button>
                    </div>

                    {/* Selected Skills */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {formData.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="secondary"
                          className="cursor-pointer hover:bg-red-100 hover:text-red-700"
                          onClick={() => removeSkill(skill)}
                        >
                          {skill} ×
                        </Badge>
                      ))}
                    </div>
                    {errors.skills && (
                      <p className="mt-2 text-sm text-red-500">{errors.skills.message}</p>
                    )}

                    {/* Suggested Skills */}
                    <div className="mt-4">
                      <p className="text-xs text-surface-500 mb-2">Tavsiya etilgan ko'nikmalar:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedSkills
                          .filter((s) => !formData.skills.includes(s))
                          .slice(0, 10)
                          .map((skill) => (
                            <button
                              key={skill}
                              type="button"
                              onClick={() => addSkill(skill)}
                              className="rounded-full border border-surface-200 px-3 py-1 text-xs text-surface-600 hover:border-purple-300 hover:bg-purple-50"
                            >
                              + {skill}
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Preview */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card>
                <CardContent className="pt-6">
                  {/* Job Preview */}
                  <div className="rounded-xl border border-surface-200 p-6 dark:border-surface-700">
                    <div className="mb-6 border-b border-surface-200 pb-6 dark:border-surface-700">
                      <h2 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
                        {formData.title || "Lavozim nomi"}
                      </h2>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-surface-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {formData.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {jobTypes.find((t) => t.value === formData.jobType)?.label}
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="h-4 w-4" />
                          {experienceLevels.find((l) => l.value === formData.experienceLevel)?.label}
                        </span>
                        {formData.isSalaryVisible && Number.isFinite(formData.salaryMin) && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            {formData.salaryMin?.toLocaleString()} - {formData.salaryMax?.toLocaleString()} {formData.salaryCurrency}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <h3 className="mb-2 font-semibold text-surface-900 dark:text-white">
                          Ish tavsifi
                        </h3>
                        {formData.description ? (
                          <div
                            className="prose max-w-none text-surface-600 dark:prose-invert dark:text-surface-300"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(formData.description) }}
                          />
                        ) : (
                          <p className="text-surface-600 dark:text-surface-400">Tavsif kiritilmagan</p>
                        )}
                      </div>

                      <div>
                        <h3 className="mb-2 font-semibold text-surface-900 dark:text-white">
                          Talablar
                        </h3>
                        <p className="whitespace-pre-wrap text-surface-600 dark:text-surface-400">
                          {formData.requirements || "Talablar kiritilmagan"}
                        </p>
                      </div>

                      {formData.benefits && (
                        <div>
                          <h3 className="mb-2 font-semibold text-surface-900 dark:text-white">
                            Imtiyozlar
                          </h3>
                          <div
                            className="prose max-w-none text-surface-600 dark:prose-invert dark:text-surface-300"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(formData.benefits) }}
                          />
                        </div>
                      )}

                      <div>
                        <h3 className="mb-2 font-semibold text-surface-900 dark:text-white">
                          Kerakli ko'nikmalar
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {formData.skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Orqaga
          </Button>

          <Button type="button" variant="ghost" onClick={saveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Qoralama saqlash
          </Button>

          {currentStep < steps.length ? (
            <Button type="button" onClick={nextStep}>
              Keyingi
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-purple-500 to-indigo-600"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              E'lon qilish
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}













