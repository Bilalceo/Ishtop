/**
 * =============================================================================
 * STUDENT DASHBOARD - My Applications Page
 * =============================================================================
 *
 * Features:
 * - List of all job applications
 * - Status tracking (pending, reviewing, interview, accepted, rejected)
 * - Filter by status
 * - Application details
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  Building,
  MapPin,
  ChevronRight,
  Eye,
  FileText,
  MoreVertical,
  Ban,
  ExternalLink,
  Briefcase,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useApplications } from "@/hooks/useApplications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import type { ApplicationStatus } from "@/types/api";

// =============================================================================
// STATUS CONFIG
// =============================================================================

const statusConfig: Record<
  ApplicationStatus,
  {
    labelKey: string;
    color: string;
    icon: React.ComponentType<any>;
    bgColor: string;
  }
> = {
  pending: {
    labelKey: "applicationsPage.pending",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    icon: Clock,
  },
  reviewing: {
    labelKey: "applicationsPage.underReview",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: Eye,
  },
  interview: {
    labelKey: "applicationsPage.interview",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100",
    icon: Calendar,
  },
  accepted: {
    labelKey: "applicationsPage.accepted",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: CheckCircle,
  },
  rejected: {
    labelKey: "applicationsPage.rejected",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: XCircle,
  },
};

const fallbackStatusConfig = {
  labelKey: "applicationsPage.pending",
  color: "text-surface-600",
  bgColor: "bg-surface-100",
  icon: Clock,
} as const;

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

type ApplicationInterviewPreview = {
  status: string;
  interview_at?: string;
  interview_type?: string;
  meeting_link?: string;
  job?: {
    title?: string;
    company?: { name?: string };
  };
};

function formatInterviewTypeLabel(
  interviewType: string | undefined,
  isRu: boolean,
) {
  if (!interviewType) {
    return isRu ? "Формат не указан" : "Format belgilanmagan";
  }

  const normalized = interviewType.trim().toLowerCase();
  if (normalized === "video") return isRu ? "Видео интервью" : "Video intervyu";
  if (normalized === "phone")
    return isRu ? "Телефонное интервью" : "Telefon intervyu";
  if (normalized === "in-person" || normalized === "in person")
    return isRu ? "Личное интервью" : "Shaxsan intervyu";

  return interviewType;
}

function getUpcomingInterviewApplication(
  applications: ApplicationInterviewPreview[],
) {
  const now = Date.now();

  return (
    applications
      .filter((app) => app.status === "interview" && app.interview_at)
      .map((app) => ({
        ...app,
        interviewTimestamp: new Date(app.interview_at as string).getTime(),
      }))
      .filter(
        (app) =>
          !Number.isNaN(app.interviewTimestamp) &&
          app.interviewTimestamp >= now,
      )
      .sort((a, b) => a.interviewTimestamp - b.interviewTimestamp)[0] || null
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ApplicationsPage() {
  const { t, locale } = useTranslation();
  const isRu = locale === "ru";
  const { applications, stats, fetchMyApplications, isLoading } =
    useApplications();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("applied_at");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    fetchMyApplications();
  }, [fetchMyApplications]);

  const upcomingInterview = getUpcomingInterviewApplication(applications);
  const upcomingInterviewCompanyName =
    upcomingInterview?.job?.company?.name || (isRu ? "Компания" : "Kompaniya");

  // Filter applications
  const filteredApplications = applications
    .filter((app) => {
      const job = app.job;
      const matchesSearch =
        !searchQuery ||
        job?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job?.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || app.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      return (
        new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      );
    });

  const renderStatValue = (value: number) => {
    if (isLoading) {
      return (
        <span className="inline-block h-8 w-10 animate-pulse rounded bg-surface-200 dark:bg-surface-700" />
      );
    }
    return value;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {t("applicationsPage.title")}
        </h1>
        <p className="mt-1 text-surface-500">
          {t("applicationsPage.subtitle")}
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6"
      >
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-100">
              <Briefcase className="h-5 w-5 text-surface-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {renderStatValue(stats.total)}
              </p>
              <p className="text-xs text-surface-500">
                {t("applicationsPage.total")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {renderStatValue(stats.pending)}
              </p>
              <p className="text-xs text-surface-500">
                {t("applicationsPage.pending")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {renderStatValue(stats.reviewing)}
              </p>
              <p className="text-xs text-surface-500">
                {t("applicationsPage.reviewing")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <Calendar className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {renderStatValue(stats.interview)}
              </p>
              <p className="text-xs text-surface-500">
                {t("applicationsPage.interview")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {renderStatValue(stats.accepted)}
              </p>
              <p className="text-xs text-surface-500">
                {t("applicationsPage.accepted")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900">
                {renderStatValue(stats.rejected)}
              </p>
              <p className="text-xs text-surface-500">
                {t("applicationsPage.rejected")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Interview Alert */}
      {upcomingInterview && (
        <motion.div variants={itemVariants}>
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                  <Calendar className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">
                    {t("applicationsPage.upcomingInterview")}
                  </h3>
                  <p className="text-sm text-surface-600">
                    {upcomingInterview?.job?.title ?? "Intervyu"} at{" "}
                    {upcomingInterviewCompanyName}
                  </p>
                  <p className="text-xs text-surface-500">
                    {formatDate(upcomingInterview.interview_at as string)}
                  </p>
                  {upcomingInterview?.interview_type ||
                  upcomingInterview?.meeting_link ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-white/80 text-surface-700"
                      >
                        {formatInterviewTypeLabel(
                          upcomingInterview.interview_type,
                          isRu,
                        )}
                      </Badge>
                      {upcomingInterview?.meeting_link ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full border-emerald-200 bg-white px-3 text-emerald-700 hover:bg-emerald-50"
                        >
                          <a
                            href={upcomingInterview.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-3.5 w-3.5" />
                            {isRu ? "Ссылка на встречу" : "Uchrashuv havolasi"}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  {t("applicationsPage.viewDetails")}
                </Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  {t("applicationsPage.joinMeeting")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <Input
                    placeholder={t("applicationsPage.searchApplications")}
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue
                      placeholder={t("applicationsPage.allStatus")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("applicationsPage.allStatus")}
                    </SelectItem>
                    <SelectItem value="pending">
                      {t("applicationsPage.pending")}
                    </SelectItem>
                    <SelectItem value="reviewing">
                      {t("applicationsPage.reviewing")}
                    </SelectItem>
                    <SelectItem value="interview">
                      {t("applicationsPage.interview")}
                    </SelectItem>
                    <SelectItem value="accepted">
                      {t("applicationsPage.accepted")}
                    </SelectItem>
                    <SelectItem value="rejected">
                      {t("applicationsPage.rejected")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-100">
                <Briefcase className="h-10 w-10 text-surface-400" />
              </div>
              <h3 className="font-display text-xl font-semibold text-surface-900">
                {t("applicationsPage.noApplicationsFound")}
              </h3>
              <p className="mt-2 max-w-sm text-surface-500">
                {searchQuery || statusFilter !== "all"
                  ? t("applicationsPage.adjustSearchFilter")
                  : t("applicationsPage.startApplying")}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link href="/student/jobs">
                  <Button className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-600">
                    {t("applicationsPage.browseJobs")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {filteredApplications.map((application) => {
            const status =
              statusConfig[application.status] ?? fallbackStatusConfig;
            const StatusIcon = status.icon;

            return (
              <motion.div key={application.id} variants={itemVariants} layout>
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      {/* Job Info */}
                      <div className="flex gap-4">
                        {/* Company Logo */}
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 text-xl font-bold text-emerald-600">
                          {application.job?.company?.name?.charAt(0) ?? "C"}
                        </div>

                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-display text-lg font-semibold text-surface-900">
                              {application.job?.title ??
                                (isRu ? "Без названия" : "Nomsiz vakansiya")}
                            </h3>
                            <Badge
                              className={`gap-1 ${status.bgColor} ${status.color}`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {t(status.labelKey)}
                            </Badge>
                          </div>
                          <p className="text-surface-600">
                            {application.job?.company?.name ?? ""}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-surface-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {application.job?.location ?? ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {t("applicationsPage.applied")}{" "}
                              {formatRelativeTime(
                                application.applied_at,
                                isRu ? "ru" : "uz",
                              )}
                            </span>
                            {application.interview_at && (
                              <>
                                <span className="flex items-center gap-1 text-emerald-600">
                                  <Calendar className="h-4 w-4" />
                                  {t("applicationsPage.interview")}:{" "}
                                  {formatDate(application.interview_at)}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-100 text-emerald-700"
                                >
                                  {formatInterviewTypeLabel(
                                    application.interview_type,
                                    isRu,
                                  )}
                                </Badge>
                              </>
                            )}
                            {application.status === "interview" &&
                              application.meeting_link && (
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-8 rounded-full border-emerald-200 bg-white px-3 text-emerald-700 hover:bg-emerald-50"
                                >
                                  <a
                                    href={application.meeting_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                    {isRu
                                      ? "Ссылка на встречу"
                                      : "Uchrashuv havolasi"}
                                  </a>
                                </Button>
                              )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link href={`/student/applications/${application.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            {t("applicationsPage.view")}
                          </Button>
                        </Link>

                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setActiveMenu(
                                activeMenu === application.id
                                  ? null
                                  : application.id,
                              )
                            }
                            title={
                              isRu
                                ? "Дополнительные действия"
                                : "Qo'shimcha amallar"
                            }
                            aria-label={
                              isRu
                                ? "Дополнительные действия"
                                : "Qo'shimcha amallar"
                            }
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">
                              {isRu
                                ? "Дополнительные действия"
                                : "Qo'shimcha amallar"}
                            </span>
                          </Button>

                          <AnimatePresence>
                            {activeMenu === application.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveMenu(null)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-surface-200 bg-white p-1 shadow-lg dark:border-surface-700 dark:bg-surface-800"
                                >
                                  <Link
                                    href={`/student/jobs/${application.job_id}`}
                                    onClick={() => setActiveMenu(null)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    {t("applicationsPage.viewJob")}
                                  </Link>
                                  <Link
                                    href={`/student/resumes/${application.resume_id}`}
                                    onClick={() => setActiveMenu(null)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100"
                                  >
                                    <FileText className="h-4 w-4" />
                                    {t("applicationsPage.viewResume")}
                                  </Link>
                                  {application.status === "pending" && (
                                    <>
                                      <div className="my-1 border-t border-surface-200" />
                                      <button
                                        onClick={() => setActiveMenu(null)}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                      >
                                        <Ban className="h-4 w-4" />
                                        {t("applicationsPage.withdraw")}
                                      </button>
                                    </>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mt-4 flex items-center gap-2 border-t border-surface-100 pt-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-xs text-surface-500">
                          {t("applicationsPage.applied")}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-surface-200" />
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            application.status !== "pending"
                              ? "bg-green-500"
                              : "bg-surface-300"
                          }`}
                        />
                        <span className="text-xs text-surface-500">
                          {t("applicationsPage.reviewed")}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-surface-200" />
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            application.status === "interview" ||
                            application.status === "accepted"
                              ? "bg-green-500"
                              : "bg-surface-300"
                          }`}
                        />
                        <span className="text-xs text-surface-500">
                          {t("applicationsPage.interview")}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-surface-200" />
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            application.status === "accepted"
                              ? "bg-green-500"
                              : application.status === "rejected"
                                ? "bg-red-500"
                                : "bg-surface-300"
                          }`}
                        />
                        <span className="text-xs text-surface-500">
                          {application.status === "rejected"
                            ? t("applicationsPage.rejected")
                            : t("applicationsPage.offer")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
