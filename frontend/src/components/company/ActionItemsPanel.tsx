"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertCircle, ClipboardCheck, CalendarClock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import { applicationApi } from "@/lib/api";

type ActionData = {
  awaiting_review: number;
  scorecards_pending: number;
  interviews_today: number;
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export default function ActionItemsPanel() {
  const { t } = useTranslation();
  const [data, setData] = useState<ActionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationApi
      .dashboardActions()
      .then((res: { data: { data?: ActionData } & Partial<ActionData> }) =>
        setData(res.data.data ?? (res.data as ActionData)),
      )
      .catch((err: unknown) => {
        console.error("ActionItemsPanel fetch failed", err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const tiles = [
    {
      icon: AlertCircle,
      color: "bg-amber-100 dark:bg-amber-500/20 text-amber-600",
      label: t("companyDashboard.actionItems.awaitingReview"),
      value: data?.awaiting_review,
      href: "/company/applicants?status=pending",
    },
    {
      icon: ClipboardCheck,
      color: "bg-purple-100 dark:bg-purple-500/20 text-purple-600",
      label: t("companyDashboard.actionItems.scorecardsPending"),
      value: data?.scorecards_pending,
      href: "/company/applicants?status=interview&scorecard=pending",
    },
    {
      icon: CalendarClock,
      color: "bg-blue-100 dark:bg-blue-500/20 text-blue-600",
      label: t("companyDashboard.actionItems.interviewsToday"),
      value: data?.interviews_today,
      href: "/company/applicants?status=interview&when=today",
    },
  ];

  return (
    <motion.div {...fadeInUp}>
      <Card>
        <CardHeader>
          <CardTitle>{t("companyDashboard.actionItems.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {tiles.map(({ icon: Icon, color, label, value, href }) => (
              <Link key={href} href={href}>
                <div className="flex cursor-pointer items-center justify-between rounded-xl border border-surface-200 p-4 transition-all hover:border-surface-300 hover:shadow-sm dark:border-surface-700">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="mb-1 h-7 w-10" />
                      ) : (
                        <p className="text-2xl font-bold text-surface-900 dark:text-white">
                          {data === null ? "—" : (value ?? 0)}
                        </p>
                      )}
                      <p className="text-xs text-surface-500">{label}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-surface-400" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
