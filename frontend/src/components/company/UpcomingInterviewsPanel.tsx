"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarX } from "lucide-react";
import { isToday, isTomorrow, format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/useTranslation";
import Image from "next/image";
import { applicationApi } from "@/lib/api";

type Interview = {
  application_id: string;
  candidate_name: string;
  candidate_avatar_url: string | null;
  job_id: string;
  job_title: string;
  interview_at: string;
  interview_type: string | null;
  meeting_link: string | null;
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatInterviewTime(isoString: string, t: (key: string) => string): string {
  const date = new Date(isoString);
  const timeStr = format(date, "HH:mm");
  if (isToday(date)) return `${t("companyDashboard.upcomingInterviews.today")}, ${timeStr}`;
  if (isTomorrow(date)) return `${t("companyDashboard.upcomingInterviews.tomorrow")}, ${timeStr}`;
  return `${format(date, "EEE, d MMM")} · ${timeStr}`;
}

export default function UpcomingInterviewsPanel() {
  const { t } = useTranslation();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    applicationApi
      .upcomingInterviews({ days: 7 })
      .then(
        (res: {
          data: { data?: { interviews: Interview[]; total: number } } & Partial<{
            interviews: Interview[];
            total: number;
          }>;
        }) => {
          const payload = res.data.data ?? (res.data as { interviews?: Interview[] });
          setInterviews(payload?.interviews ?? []);
        },
      )
      .catch((err: unknown) => {
        console.error("UpcomingInterviewsPanel fetch failed", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const visible = interviews.slice(0, 5);

  return (
    <motion.div {...fadeInUp} className="h-full">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t("companyDashboard.upcomingInterviews.title")}</CardTitle>
          <p className="text-sm text-surface-500">
            {t("companyDashboard.upcomingInterviews.subtitle")}
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CalendarX className="h-10 w-10 text-surface-400" />
              <p className="mt-2 text-sm text-surface-500">
                {t("companyDashboard.upcomingInterviews.empty")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((item) => (
                <div
                  key={item.application_id}
                  className="flex items-center gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700"
                >
                  {item.candidate_avatar_url ? (
                    <Image
                      src={item.candidate_avatar_url}
                      alt={item.candidate_name}
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white">
                      {getInitials(item.candidate_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-surface-900 dark:text-white">
                      {item.candidate_name}
                    </p>
                    <p className="truncate text-xs text-surface-500">{item.job_title}</p>
                  </div>
                  <p className="flex-shrink-0 text-xs text-surface-500">
                    {formatInterviewTime(item.interview_at, t)}
                  </p>
                </div>
              ))}
            </div>
          )}
          {!loading && interviews.length > 0 && (
            <Link
              href="/company/applicants?status=interview&when=upcoming"
              className="mt-4 block text-center text-sm text-purple-600 hover:underline"
            >
              {t("companyDashboard.upcomingInterviews.viewAll")}
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
