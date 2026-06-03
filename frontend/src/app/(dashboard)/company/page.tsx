/**
 * =============================================================================
 * COMPANY HR DASHBOARD - Main Page
 * =============================================================================
 *
 * Features:
 * - Overview statistics
 * - Recent applications
 * - Active job postings
 * - AI Candidate recommendations
 * - Quick actions
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Briefcase,
  Users,
  FileText,
  TrendingUp,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  PlusCircle,
  Star,
  Sparkles,
  Building2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  BarChart3,
  UserCheck,
  UserX,
  MessageSquare,
  AlertTriangle,
  CircleCheck,
  Circle,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { useJobs } from "@/hooks/useJobs";
import ActionItemsPanel from "@/components/company/ActionItemsPanel";
import UpcomingInterviewsPanel from "@/components/company/UpcomingInterviewsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Job } from "@/types/api";

type OnboardingStep = {
  key: string;
  label: string;
  url: string;
  completed: boolean;
};

type OnboardingChecklist = {
  progress: string;
  completed_count: number;
  total_count: number;
  all_done: boolean;
  dismissed: boolean;
  steps: OnboardingStep[];
};

// =============================================================================
// COMPONENTS
// =============================================================================

const StatsCard = ({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  color: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-surface-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-surface-900 dark:text-white">
            {value}
          </p>
          {change && (
            <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {change}
            </p>
          )}
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", color)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const configs: Record<string, { label: string; variant: string; icon: any }> = {
    new: { label: t("companyDashboard.new"), variant: "bg-blue-100 text-blue-700", icon: Clock },
    reviewing: { label: t("companyDashboard.reviewing"), variant: "bg-yellow-100 text-yellow-700", icon: Eye },
    interview: { label: t("companyDashboard.interview"), variant: "bg-purple-100 text-purple-700", icon: Calendar },
    offered: { label: t("companyDashboard.offered"), variant: "bg-green-100 text-green-700", icon: CheckCircle },
    rejected: { label: t("companyDashboard.rejected"), variant: "bg-red-100 text-red-700", icon: XCircle },
  };

  const config = configs[status] || configs.new;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium", config.variant)}>
      <config.icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function CompanyDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { jobs, isLoading: jobsLoading, fetchMyJobs } = useJobs();
  const [profileCompletion, setProfileCompletion] = useState(100);
  const [onboarding, setOnboarding] = useState<OnboardingChecklist | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [dismissingChecklist, setDismissingChecklist] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchMyJobs();
  }, []);

  useEffect(() => {
    const computeCompletion = async () => {
      try {
        const res = await api.get("/users/me/notification-preferences");
        const prefs = res.data?.data || {};
        const checks = [
          Boolean(user?.avatar_url),
          Boolean(user?.company_name?.trim()),
          Boolean(user?.company_website?.trim()),
          Boolean((prefs.company_size || "").trim()),
          Boolean((prefs.company_industry || "").trim()),
          Boolean(user?.location?.trim()),
          Boolean(user?.bio?.trim()),
        ];
        const percent = Math.round((checks.filter(Boolean).length / checks.length) * 100);
        setProfileCompletion(percent);
      } catch {
        // keep default value
      }
    };
    if (user) {
      void computeCompletion();
    }
  }, [user]);

  useEffect(() => {
    const fetchChecklist = async () => {
      try {
        setOnboardingLoading(true);
        const res = await api.get("/users/me/company-onboarding-checklist");
        setOnboarding(res.data);
      } catch {
        setOnboarding(null);
      } finally {
        setOnboardingLoading(false);
      }
    };
    if (user?.role === "company") {
      void fetchChecklist();
    }
  }, [jobs, user?.role]);

  const handleDismissChecklist = async () => {
    if (!onboarding?.all_done) return;
    try {
      setDismissingChecklist(true);
      await api.post("/users/me/company-onboarding-checklist/dismiss");
      setOnboarding((prev) => (prev ? { ...prev, dismissed: true } : prev));
    } catch {
      // noop
    } finally {
      setDismissingChecklist(false);
    }
  };

  const isLoading = jobsLoading;

  // Compute stats from real job data
  const activeJobs = jobs.filter((j) => j.status === "active");
  const totalApplications = jobs.reduce((s, j) => s + (j.applications_count ?? 0), 0);
  const totalViews = jobs.reduce((s, j) => s + (j.views_count ?? 0), 0);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...fadeInUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
            {t("companyDashboard.welcome")}, {user?.company_name || t("common.company")}
          </h1>
          <p className="mt-1 text-surface-500">
            {t("companyDashboard.subtitle")}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/company/jobs/new">
            <Button variant="gradient">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("companyDashboard.newJob")}
            </Button>
          </Link>
        </div>
      </motion.div>

      {profileCompletion < 80 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                {t("companyDashboard.companyProfile")} {profileCompletion}%
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t("companyDashboard.companyProfileDesc")}
              </p>
            </div>
            <Link href="/company/settings#company">
              <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100">
                {t("common.completeProfile")}
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {!onboardingLoading && onboarding && !onboarding.dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand-800 dark:text-brand-100">
                Kompaniya onboarding checklist
              </p>
              <p className="text-xs text-brand-700 dark:text-brand-200">{onboarding.progress}</p>
            </div>
            {onboarding.all_done && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismissChecklist}
                disabled={dismissingChecklist}
                className="border-brand-300 text-brand-700 hover:bg-brand-100"
              >
                <X className="mr-1 h-4 w-4" />
                {dismissingChecklist ? "Yopilmoqda..." : "Checklistni yopish"}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {onboarding.steps.map((step) => (
              <Link key={step.key} href={step.url}>
                <div className="flex items-center justify-between rounded-lg border border-brand-100 bg-white px-3 py-2 transition hover:bg-brand-50/40 dark:border-brand-500/20 dark:bg-surface-900/50">
                  <div className="flex items-center gap-2">
                    {step.completed ? (
                      <CircleCheck className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-brand-500" />
                    )}
                    <span className={cn("text-sm", step.completed ? "text-surface-700 dark:text-surface-200" : "text-surface-800 dark:text-white")}>
                      {step.label}
                    </span>
                  </div>
                  <span className="text-xs text-surface-500">{step.completed ? "Bajarildi" : "Ochish"}</span>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatsCard
          title={t("companyDashboard.activeJobs")}
          value={isLoading ? "—" : activeJobs.length}
          icon={Briefcase}
          color="bg-blue-100 dark:bg-blue-500/20 text-blue-600"
        />
        <StatsCard
          title={t("companyDashboard.totalApplications")}
          value={isLoading ? "—" : totalApplications}
          icon={FileText}
          color="bg-purple-100 dark:bg-purple-500/20 text-purple-600"
        />
        <StatsCard
          title={t("companyDashboard.totalJobs")}
          value={isLoading ? "—" : jobs.length}
          icon={Calendar}
          color="bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600"
        />
        <StatsCard
          title={t("companyDashboard.totalViews")}
          value={isLoading ? "—" : totalViews}
          icon={Eye}
          color="bg-green-100 dark:bg-green-500/20 text-green-600"
        />
      </motion.div>

      {/* Action Items + Upcoming Interviews */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <ActionItemsPanel />
        </div>
        <div className="lg:col-span-1">
          <UpcomingInterviewsPanel />
        </div>
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-500" />
                {t("companyDashboard.recentApplications")}
              </CardTitle>
              <Link href="/company/applicants">
                <Button variant="ghost" size="sm">
                  {t("companyDashboard.viewAll")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : jobs.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto h-10 w-10 text-surface-400" />
                  <p className="mt-2 text-sm text-surface-500">{t("companyDashboard.noApplications")}</p>
                  <Link href="/company/jobs/new">
                    <Button size="sm" className="mt-4" variant="outline">{t("companyDashboard.createFirstJob")}</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.slice(0, 4).map((job: Job, index: number) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between rounded-xl border border-surface-200 p-4 transition-all hover:border-purple-200 hover:bg-purple-50/50 dark:border-surface-700 dark:hover:border-purple-500/30 dark:hover:bg-purple-500/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-lg font-bold text-white">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-surface-900 dark:text-white">
                            {job.title}
                          </p>
                          <p className="text-sm text-surface-500">{job.location} • {job.job_type?.replace("_", " ")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-medium text-blue-600">
                            <Users className="h-4 w-4" />
                            {job.applications_count ?? 0} {t("companyDashboard.applications")}
                          </div>
                          <p className="text-xs text-surface-400">{job.views_count ?? 0} {t("companyDashboard.views")}</p>
                        </div>
                        <StatusBadge status={job.status} />
                        <Link href={`/company/jobs/${job.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Jobs Sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-500" />
                {t("companyDashboard.activeJobsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
                </div>
              ) : activeJobs.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-sm text-surface-500">{t("companyDashboard.noActiveJobs")}</p>
                </div>
              ) : (
                activeJobs.slice(0, 4).map((job: Job) => (
                  <Link key={job.id} href={`/company/jobs/${job.id}/edit`}>
                    <div className="rounded-xl border border-surface-200 p-4 transition-all hover:border-blue-200 hover:bg-blue-50/50 dark:border-surface-700 dark:hover:border-blue-500/30">
                      <p className="font-semibold text-surface-900 dark:text-white">
                        {job.title}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-surface-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {job.applications_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {job.views_count ?? 0}
                        </span>
                      </div>
                      {(job.applications_count ?? 0) > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-surface-400 mb-1">
                            <span>{t("companyDashboard.applications")}</span>
                            <span>{job.applications_count ?? 0}/50</span>
                          </div>
                          <Progress value={((job.applications_count ?? 0) / 50) * 100} className="h-1" />
                        </div>
                      )}
                    </div>
                  </Link>
                ))
              )}
              <Link href="/company/jobs">
                <Button variant="outline" className="w-full">
                  {t("companyDashboard.viewAllJobs")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Post Job Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-500/30">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-500/20">
                <Sparkles className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white">
                  {t("companyDashboard.bestCandidatesTitle")}
                </h3>
                <p className="text-sm text-surface-500">
                  {t("companyDashboard.bestCandidatesDesc")}
                </p>
              </div>
            </div>
            <Link href="/company/jobs/new">
              <Button variant="gradient">
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("companyDashboard.createJob")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Link href="/company/jobs/new">
          <Card className="cursor-pointer transition-all hover:border-purple-300 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-500/20">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{t("companyDashboard.createJob")}</p>
                <p className="text-sm text-surface-500">{t("companyDashboard.createJobDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/company/applicants">
          <Card className="cursor-pointer transition-all hover:border-blue-300 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-500/20">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{t("companyDashboard.candidates")}</p>
                <p className="text-sm text-surface-500">{t("companyDashboard.candidatesDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/company/analytics">
          <Card className="cursor-pointer transition-all hover:border-cyan-300 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{t("companyDashboard.analytics")}</p>
                <p className="text-sm text-surface-500">{t("companyDashboard.analyticsDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/company/settings">
          <Card className="cursor-pointer transition-all hover:border-amber-300 hover:shadow-lg">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-surface-900 dark:text-white">{t("companyDashboard.companyProfile")}</p>
                <p className="text-sm text-surface-500">{t("companyDashboard.companyProfileDesc")}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    </div>
  );
}













