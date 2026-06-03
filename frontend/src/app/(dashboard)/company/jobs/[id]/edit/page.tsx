"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  X,
  AlertCircle,
  Briefcase,
  BarChart3,
  Eye,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, jobApi, applicationApi, getErrorMessage } from "@/lib/api";
import type { Job } from "@/types/api";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

type JobAnalytics = {
  summary: {
    views: number;
    applications: number;
    conversion_pct: number;
  };
  daily_views: Array<{ date: string; count: number }>;
  daily_applications: Array<{ date: string; count: number }>;
  funnel: {
    views: number;
    applications: number;
    screened: number;
    interview: number;
    hired: number;
  };
  source_breakdown: Array<{ source: string; count: number; share_pct: number }>;
};

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params!.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("full_time");
  const [experienceLevel, setExperienceLevel] = useState("junior");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState<"UZS" | "USD">("UZS");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [education, setEducation] = useState("");
  const [experience, setExperience] = useState("");
  const [analytics, setAnalytics] = useState<JobAnalytics | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30 | 90>(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        setIsLoading(true);
        const res = await jobApi.get(jobId);
        const data: Job = res.data?.data || res.data;
        setJob(data);
        setTitle(data.title || "");
        setDescription(data.description || "");
        setLocation(data.location || "");
        setJobType(data.job_type || "full_time");
        setExperienceLevel(data.experience_level || "junior");
        setSalaryMin(data.salary_min?.toString() || "");
        setSalaryMax(data.salary_max?.toString() || "");
        const normalizedCurrency = String(data.salary_currency || "").toUpperCase();
        setSalaryCurrency(normalizedCurrency === "USD" ? "USD" : "UZS");
        setSkills(data.requirements?.skills || []);
        setEducation(data.requirements?.education || "");
        setExperience(data.requirements?.experience || "");
      } catch {
        setError("Ish topilmadi.");
      } finally {
        setIsLoading(false);
      }
    };
    if (jobId) fetchJob();
  }, [jobId]);

  useEffect(() => {
    if (job) return;
    api
      .get("/users/me/notification-preferences")
      .then((res) => {
        const preferred = String(res.data?.data?.preferred_salary_currency || "UZS").toUpperCase();
        setSalaryCurrency(preferred === "USD" ? "USD" : "UZS");
      })
      .catch(() => {});
  }, [job]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!jobId) return;
      try {
        setAnalyticsLoading(true);
        const response = await applicationApi.jobAnalytics(jobId, { days: analyticsDays });
        const payload = response.data as { data?: JobAnalytics };
        setAnalytics(payload.data || null);
      } catch {
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    void loadAnalytics();
  }, [analyticsDays, jobId]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills((prev) => [...prev, trimmed]);
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSave = async () => {
    if (!title || !description || !location) {
      toast.error("Sarlavha, tavsif va joylashuv majburiy.");
      return;
    }
    setIsSaving(true);
    try {
      await jobApi.update(jobId, {
        title,
        description,
        location,
        job_type: jobType,
        experience_level: experienceLevel,
        salary_min: salaryMin ? Number(salaryMin) : undefined,
        salary_max: salaryMax ? Number(salaryMax) : undefined,
        salary_currency: salaryCurrency,
        requirements: {
          skills,
          education: education || undefined,
          experience: experience || undefined,
        },
      });
      toast.success("Ish e'loni yangilandi!");
      router.push("/company/jobs");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-16 w-16 text-red-400" />
        <h2 className="mt-4 text-xl font-bold">{error || "Ish topilmadi"}</h2>
        <Button className="mt-6" onClick={() => router.back()} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Orqaga
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-surface-600">
          <ArrowLeft className="h-4 w-4" />
          Orqaga
        </Button>
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-purple-600" />
          <h1 className="font-bold text-surface-900">Ish e'lonini tahrirlash</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-gradient-to-r from-purple-500 to-indigo-600"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Saqlash
        </Button>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 rounded-2xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-800"
      >
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="font-bold text-surface-900">Asosiy ma'lumotlar</h2>
          <div>
            <Label>Lavozim nomi *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="masalan: Dasturchi"
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Joylashuv *</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Toshkent, O'zbekiston"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Ish turi</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">To'liq stavka</SelectItem>
                  <SelectItem value="part_time">Yarim stavka</SelectItem>
                  <SelectItem value="remote">Masofaviy</SelectItem>
                  <SelectItem value="hybrid">Gibrid</SelectItem>
                  <SelectItem value="contract">Shartnoma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tajriba darajasi</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Boshlovchi (0-2 yil)</SelectItem>
                  <SelectItem value="mid">O'rta (2-5 yil)</SelectItem>
                  <SelectItem value="senior">Katta (5+ yil)</SelectItem>
                  <SelectItem value="lead">Rahbar</SelectItem>
                  <SelectItem value="executive">Direktor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Salary */}
        <div className="space-y-3">
          <h2 className="font-bold text-surface-900">Maosh (ixtiyoriy)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Valyuta</Label>
              <Select
                value={salaryCurrency}
                onValueChange={(value) => setSalaryCurrency(value === "USD" ? "USD" : "UZS")}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UZS">UZS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Minimal maosh ({salaryCurrency})</Label>
              <Input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder={salaryCurrency === "USD" ? "1200" : "5,000,000"}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Maksimal maosh ({salaryCurrency})</Label>
              <Input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder={salaryCurrency === "USD" ? "3000" : "15,000,000"}
                className="mt-1"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <Label>Ish tavsifi *</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ish haqida batafsil ma'lumot..."
            rows={6}
            className="mt-1"
          />
        </div>

        {/* Requirements */}
        <div className="space-y-4">
          <h2 className="font-bold text-surface-900">Talablar</h2>
          <div>
            <Label>Ko'nikmalar</Label>
            <div className="mt-1 flex gap-2">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Ko'nikma qo'shing..."
              />
              <Button type="button" variant="outline" onClick={addSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700"
                >
                  {skill}
                  <button type="button" onClick={() => removeSkill(skill)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <Label>Tajriba talabi</Label>
            <Input
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="masalan: 2+ yil React tajribasi"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Ta'lim talabi</Label>
            <Input
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              placeholder="masalan: Oliy ma'lumot (IT yo'nalishi)"
              className="mt-1"
            />
          </div>
        </div>
      </motion.div>

      {/* Bottom Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="bg-gradient-to-r from-purple-500 to-indigo-600"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          O'zgarishlarni saqlash
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-2xl border border-surface-200 bg-white p-6 shadow-sm dark:border-surface-700 dark:bg-surface-800"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold text-surface-900">
            <BarChart3 className="h-5 w-5 text-brand-600" />
            Analitika
          </h2>
          <div className="inline-flex rounded-lg border border-surface-200 p-1 dark:border-surface-700">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setAnalyticsDays(d as 7 | 30 | 90)}
                className={`rounded-md px-3 py-1 text-xs font-semibold ${
                  analyticsDays === d
                    ? "bg-brand-600 text-white"
                    : "text-surface-600 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-700"
                }`}
              >
                {d} kun
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700">
            <p className="text-xs text-surface-500">Ko'rishlar soni</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <Eye className="h-5 w-5 text-surface-400" />
              {analyticsLoading ? "..." : analytics?.summary.views ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700">
            <p className="text-xs text-surface-500">Arizalar soni</p>
            <p className="mt-1 text-2xl font-bold">{analyticsLoading ? "..." : analytics?.summary.applications ?? 0}</p>
          </div>
          <div className="rounded-xl border border-surface-200 p-3 dark:border-surface-700">
            <p className="text-xs text-surface-500">Konversiya</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-bold">
              <TrendingUp className="h-5 w-5 text-surface-400" />
              {analyticsLoading ? "..." : `${analytics?.summary.conversion_pct ?? 0}%`}
            </p>
          </div>
        </div>

        {analyticsLoading ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : analytics ? (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-64 rounded-xl border border-surface-200 p-2 dark:border-surface-700">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.daily_views.map((item) => ({
                      date: item.date.slice(5),
                      value: item.count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="h-64 rounded-xl border border-surface-200 p-2 dark:border-surface-700">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={analytics.daily_applications.map((item) => ({
                      date: item.date.slice(5),
                      value: item.count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="h-64 rounded-xl border border-surface-200 p-2 dark:border-surface-700">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Views", value: analytics.funnel.views },
                    { name: "Applications", value: analytics.funnel.applications },
                    { name: "Screened", value: analytics.funnel.screened },
                    { name: "Interview", value: analytics.funnel.interview },
                    { name: "Hired", value: analytics.funnel.hired },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-surface-900">Source breakdown</p>
              {analytics.source_breakdown.length === 0 ? (
                <p className="text-sm text-surface-500">Source ma'lumoti topilmadi</p>
              ) : (
                analytics.source_breakdown.map((item) => (
                  <div key={item.source} className="flex items-center justify-between rounded-lg border border-surface-200 px-3 py-2 dark:border-surface-700">
                    <span className="text-sm">{item.source}</span>
                    <span className="text-sm font-semibold">
                      {item.count} ({item.share_pct}%)
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-surface-500">Analitika ma'lumotlari mavjud emas.</p>
        )}
      </motion.div>
    </div>
  );
}
