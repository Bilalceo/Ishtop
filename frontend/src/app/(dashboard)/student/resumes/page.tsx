/**
 * =============================================================================
 * STUDENT DASHBOARD - My Resumes Page
 * =============================================================================
 *
 * Features:
 * - Grid view of resumes (cards)
 * - "Create New Resume" button (Manual entry / Generate with AI)
 * - Resume cards with: Title, Created date, Status, Actions
 * - Filter/sort options
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Plus,
  Sparkles,
  FileText,
  MoreVertical,
  Download,
  Trash2,
  Eye,
  Edit,
  Copy,
  Archive,
  Globe,
  Clock,
  Filter,
  SortAsc,
  Grid,
  List,
  Search,
  Star,
  CheckCircle,
} from "lucide-react";
import { useResume } from "@/hooks/useResume";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatRelativeTime, formatDate } from "@/lib/utils";
import type { Resume } from "@/types/api";

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

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function ResumesPage() {
  const { t, locale } = useTranslation();
  const isRu = locale === "ru";
  const {
    resumes,
    isLoading,
    fetchResumes,
    deleteResume,
    publishResume,
    archiveResume,
    downloadResume,
    createResume,
  } = useResume();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        await fetchResumes();
      } finally {
        setHasLoadedOnce(true);
      }
    };
    void load();
  }, [fetchResumes]);

  // Filter and sort resumes
  const filteredResumes = resumes
    .filter((resume) => {
      const matchesSearch = resume.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || resume.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "updated":
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        case "created":
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "title":
          return a.title.localeCompare(b.title);
        case "views":
          return b.view_count - a.view_count;
        default:
          return 0;
      }
    });

  const handleAction = async (action: string, resume: Resume) => {
    setActiveMenu(null);
    switch (action) {
      case "publish":
        await publishResume(resume.id);
        break;
      case "archive":
        await archiveResume(resume.id);
        break;
      case "download":
        await downloadResume(resume.id);
        break;
      case "duplicate":
        await createResume({
          title: `${resume.title} ${isRu ? "(Копия)" : "(Nusxa)"}`,
          content: resume.content,
        });
        break;
      case "delete":
        if (
          confirm(
            isRu
              ? "Вы уверены, что хотите удалить это резюме?"
              : "Ushbu rezyumeni o'chirishga ishonchingiz komilmi?",
          )
        ) {
          await deleteResume(resume.id);
        }
        break;
    }
  };

  const stats = {
    total: resumes.length,
    published: resumes.filter((r) => r.status === "published").length,
    drafts: resumes.filter((r) => r.status === "draft").length,
    aiGenerated: resumes.filter((r) => r.ai_generated).length,
  };

  const renderStatValue = (value: number) => {
    if (isLoading || !hasLoadedOnce) {
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
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
            {t("resumesPage.title")}
          </h1>
          <p className="mt-1 text-surface-500">{t("resumesPage.subtitle")}</p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("resumesPage.createNew")}
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {renderStatValue(stats.total)}
              </p>
              <p className="text-xs text-surface-500">
                {t("resumesPage.totalResumes")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Globe className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {renderStatValue(stats.published)}
              </p>
              <p className="text-xs text-surface-500">
                {t("resumesPage.published")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {renderStatValue(stats.drafts)}
              </p>
              <p className="text-xs text-surface-500">
                {t("resumesPage.drafts")}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100">
              <Sparkles className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {renderStatValue(stats.aiGenerated)}
              </p>
              <p className="text-xs text-surface-500">
                {t("resumesPage.aiGenerated")}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
                  <Input
                    placeholder={t("resumesPage.searchPlaceholder")}
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={t("resumesPage.allStatus")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("resumesPage.allStatus")}
                    </SelectItem>
                    <SelectItem value="published">
                      {t("resumesPage.published")}
                    </SelectItem>
                    <SelectItem value="draft">
                      {t("resumesPage.drafts")}
                    </SelectItem>
                    <SelectItem value="archived">
                      {t("dashboard.resumes.status.archived")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36">
                    <SortAsc className="mr-2 h-4 w-4" />
                    <SelectValue placeholder={t("resumesPage.sortBy")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated">
                      {t("resumesPage.lastUpdated")}
                    </SelectItem>
                    <SelectItem value="created">
                      {t("resumesPage.dateCreated")}
                    </SelectItem>
                    <SelectItem value="title">
                      {t("resumesPage.titleSort")}
                    </SelectItem>
                    <SelectItem value="views">
                      {t("resumesPage.viewsSort")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Toggle */}
              <div className="flex rounded-lg border border-surface-200 p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-2 transition-colors ${
                    viewMode === "grid"
                      ? "bg-surface-100 text-surface-900"
                      : "text-surface-500 hover:text-surface-900"
                  }`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-2 transition-colors ${
                    viewMode === "list"
                      ? "bg-surface-100 text-surface-900"
                      : "text-surface-500 hover:text-surface-900"
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Resume Grid/List */}
      {isLoading ? (
        <div
          className={`grid gap-4 ${viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : ""}`}
        >
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredResumes.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-100">
                <FileText className="h-10 w-10 text-surface-400" />
              </div>
              <h3 className="font-display text-xl font-semibold text-surface-900 dark:text-white">
                {searchQuery || statusFilter !== "all"
                  ? isRu
                    ? "Резюме не найдены"
                    : "Rezyumelar topilmadi"
                  : isRu
                    ? "Резюме пока нет"
                    : "Hozircha rezyume yo'q"}
              </h3>
              <p className="mt-2 max-w-sm text-surface-500">
                {searchQuery || statusFilter !== "all"
                  ? isRu
                    ? "Попробуйте изменить поиск или фильтры."
                    : "Qidiruv yoki filtrlarni o'zgartirib ko'ring."
                  : isRu
                    ? "Создайте первое резюме, чтобы начать подавать заявки."
                    : "Ish topish uchun birinchi rezyumeni yarating."}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="mt-6 bg-gradient-to-r from-emerald-500 to-teal-600"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isRu
                    ? "Создать первое резюме"
                    : "Birinchi rezyumeni yaratish"}
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          className={`grid gap-4 ${viewMode === "grid" ? "md:grid-cols-2 lg:grid-cols-3" : ""}`}
        >
          {filteredResumes.map((resume, index) => (
            <motion.div
              key={resume.id}
              variants={itemVariants}
              layout
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="group relative overflow-visible hover:shadow-lg transition-all">
                <CardContent className="p-5">
                  {/* Status & AI Badge */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          resume.status === "published"
                            ? "success"
                            : resume.status === "draft"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {resume.status === "published" && (
                          <Globe className="mr-1 h-3 w-3" />
                        )}
                        {resume.status === "draft" && (
                          <Clock className="mr-1 h-3 w-3" />
                        )}
                        {resume.status}
                      </Badge>
                      {resume.ai_generated && (
                        <Badge
                          variant="default"
                          className="gap-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                        >
                          <Sparkles className="h-3 w-3" />
                          AI
                        </Badge>
                      )}
                    </div>

                    {/* ATS Score */}
                    {resume.ats_score && (
                      <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        <CheckCircle className="h-3 w-3" />
                        {resume.ats_score}% ATS
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-display text-lg font-semibold text-surface-900 dark:text-white line-clamp-2">
                    {resume.title}
                  </h3>

                  {/* Meta */}
                  <div className="mt-2 flex items-center gap-4 text-sm text-surface-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatRelativeTime(
                        resume.updated_at,
                        isRu ? "ru" : "uz",
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {resume.view_count} {isRu ? "просмотров" : "ko'rish"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      href={`/student/resumes/${resume.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="mr-2 h-4 w-4" />
                        {isRu ? "Открыть" : "Ochish"}
                      </Button>
                    </Link>
                    <Link href={`/student/resumes/${resume.id}/edit`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        title={
                          isRu ? "Редактировать резюме" : "Rezyumeni tahrirlash"
                        }
                        aria-label={
                          isRu ? "Редактировать резюме" : "Rezyumeni tahrirlash"
                        }
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden text-xs sm:inline">
                          {isRu ? "Изменить" : "Tahrirlash"}
                        </span>
                        <span className="sr-only">
                          {isRu
                            ? "Редактировать резюме"
                            : "Rezyumeni tahrirlash"}
                        </span>
                      </Button>
                    </Link>

                    {/* More menu */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5"
                        onClick={() =>
                          setActiveMenu(
                            activeMenu === resume.id ? null : resume.id,
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
                        <span className="hidden text-xs sm:inline">
                          {isRu ? "Действия" : "Amallar"}
                        </span>
                        <span className="sr-only">
                          {isRu
                            ? "Дополнительные действия"
                            : "Qo'shimcha amallar"}
                        </span>
                      </Button>

                      <AnimatePresence>
                        {activeMenu === resume.id && (
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
                              {resume.status === "draft" && (
                                <button
                                  onClick={() =>
                                    handleAction("publish", resume)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                                >
                                  <Globe className="h-4 w-4" />
                                  {isRu ? "Опубликовать" : "Nashr qilish"}
                                </button>
                              )}
                              {resume.status === "published" && (
                                <button
                                  onClick={() =>
                                    handleAction("archive", resume)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                                >
                                  <Archive className="h-4 w-4" />
                                  {isRu ? "Архивировать" : "Arxivlash"}
                                </button>
                              )}
                              <button
                                onClick={() => handleAction("download", resume)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                              >
                                <Download className="h-4 w-4" />
                                {isRu ? "Скачать PDF" : "PDF yuklab olish"}
                              </button>
                              <button
                                onClick={() =>
                                  handleAction("duplicate", resume)
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-700"
                              >
                                <Copy className="h-4 w-4" />
                                {isRu ? "Дублировать" : "Nusxalash"}
                              </button>
                              <div className="my-1 border-t border-surface-200 dark:border-surface-700" />
                              <button
                                onClick={() => handleAction("delete", resume)}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                                {isRu ? "Удалить" : "O'chirish"}
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Resume Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("resumesPage.createNewResume")}
            </DialogTitle>
            <DialogDescription>
              {t("resumesPage.chooseMethod")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {/* AI Generation Option */}
            <Link
              href="/student/resumes/create-ai"
              onClick={() => setShowCreateDialog(false)}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white cursor-pointer"
              >
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20">
                    <Sparkles className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">
                        {t("resumesPage.generateWithAI")}
                      </h3>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                        {t("resumesPage.recommended")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/80">
                      {t("resumesPage.aiDescription")}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* Manual Entry Option */}
            <Link
              href="/student/resumes/create"
              onClick={() => setShowCreateDialog(false)}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group rounded-2xl border-2 border-surface-200 p-6 cursor-pointer hover:border-surface-300 hover:bg-surface-50"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-100">
                    <FileText className="h-7 w-7 text-surface-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-surface-900">
                      {t("resumesPage.manualEntry")}
                    </h3>
                    <p className="mt-1 text-sm text-surface-500">
                      {t("resumesPage.manualDescription")}
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
