"use client";

import {
  Award,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Languages,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ResumeContent } from "@/types/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/TranslationContext";

type LooseRecord = Record<string, unknown>;

interface ResumePreviewProps {
  content: ResumeContent | LooseRecord;
  title?: string;
  className?: string;
  isPlaceholder?: boolean;
  locale?: "uz" | "ru";
}

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const asRecord = (value: unknown): LooseRecord =>
  value && typeof value === "object" && !Array.isArray(value) ? value as LooseRecord : {};

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
};

const initialsFrom = (name: string) => {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "S") + (parts[1]?.[0] || "C")).toUpperCase();
};

export function ResumePreview({ content, title, className, isPlaceholder, locale }: ResumePreviewProps) {
  const { locale: contextLocale } = useTranslation();
  const activeLocale = locale || contextLocale;
  const copy =
    activeLocale === "ru"
      ? {
          yourName: "Ваше имя",
          roleFallback: "Профессиональная должность",
          badge: "IshTop Резюме",
          summary: "Краткий профиль",
          experience: "Опыт работы",
          education: "Образование",
          projects: "Проекты",
          current: "По настоящее время",
          position: "Должность",
          fillForm: "Заполните данные, чтобы увидеть предпросмотр резюме.",
          portfolio: "Портфолио",
          skills: "Навыки",
          technical: "Технические",
          soft: "Личные качества",
          languages: "Языки",
          certifications: "Сертификаты",
          verifiedSkills: "Подтверждённые навыки",
          learningSkills: "Навыки в процессе изучения",
        }
      : {
          yourName: "Ismingiz",
          roleFallback: "Professional unvon",
          badge: "IshTop Rezyume",
          summary: "Qisqacha profil",
          experience: "Ish tajribasi",
          education: "Ta'lim",
          projects: "Loyihalar",
          current: "Hozirgi vaqt",
          position: "Lavozim",
          fillForm: "Rezyume ko'rinishini ko'rish uchun ma'lumotlarni to'ldiring.",
          portfolio: "Portfolio",
          skills: "Ko'nikmalar",
          technical: "Texnik",
          soft: "Shaxsiy fazilatlar",
          languages: "Tillar",
          certifications: "Sertifikatlar",
          verifiedSkills: "Tasdiqlangan ko'nikmalar",
          learningSkills: "O'rganilayotgan ko'nikmalar",
        };

  const rawContent = asRecord(content);
  const personalInfo = asRecord(rawContent.personal_info);
  const name = firstText(personalInfo.name, personalInfo.full_name, title, copy.yourName);
  const role = firstText(personalInfo.professional_title, personalInfo.title, copy.roleFallback);
  const email = firstText(personalInfo.email);
  const phone = firstText(personalInfo.phone);
  const location = firstText(personalInfo.location);
  const linkedin = firstText(personalInfo.linkedin_url, personalInfo.linkedin);
  const portfolio = firstText(personalInfo.portfolio_url, personalInfo.website);
  const summary = firstText(rawContent.summary, asRecord(rawContent.professional_summary).text);

  const experience = asArray<LooseRecord>(rawContent.experience || rawContent.work_experience);
  const education = asArray<LooseRecord>(rawContent.education);
  const projects = asArray<LooseRecord>(rawContent.projects);
  const certifications = asArray<LooseRecord>(rawContent.certifications);
  const languages = asArray<LooseRecord>(rawContent.languages);
  const skills = asRecord(rawContent.skills);
  // Skills payloads in the wild come in two shapes:
  //   1. string[]                                  — already flat
  //   2. Array<{ category: string; skills: string[] }>  — nested by category
  // Render-time SkillGroup expects plain strings, so flatten upstream.
  const flattenSkillList = (value: unknown): string[] => {
    const arr = asArray<unknown>(value);
    const out: string[] = [];
    for (const item of arr) {
      if (typeof item === "string") {
        if (item.trim()) out.push(item.trim());
      } else if (item && typeof item === "object") {
        const inner = (item as Record<string, unknown>).skills;
        if (Array.isArray(inner)) {
          for (const s of inner) {
            if (typeof s === "string" && s.trim()) out.push(s.trim());
          }
        }
      }
    }
    return out;
  };
  const technicalSkills = flattenSkillList(
    skills.technical || skills.technical_skills || skills.tools_technologies,
  );
  const softSkills = flattenSkillList(skills.soft || skills.soft_skills);

  // Skill verification statuses (MVP). Absent on older resumes → empty map.
  // The map is keyed by the user-entered quiz skills, while the rendered chips
  // come from the AI-normalized skills list — so match on a folded key
  // (case/punctuation-insensitive: "react.js" ≡ "React JS"), not exact strings.
  const skillVerifications = asRecord(rawContent.skillVerifications) as Record<string, string>;
  const foldSkillKey = (skill: string) => skill.toLowerCase().replace(/[^a-z0-9+#]/g, "");
  const foldedVerifications: Record<string, string> = {};
  for (const [key, status] of Object.entries(skillVerifications)) {
    foldedVerifications[foldSkillKey(key)] = status;
  }
  const verificationFor = (skill: string): "verified" | "learning" | undefined => {
    const status = skillVerifications[skill] ?? foldedVerifications[foldSkillKey(skill)];
    return status === "verified" || status === "learning" ? status : undefined;
  };
  const hasVerified = Object.values(skillVerifications).some((v) => v === "verified");
  const hasLearning = Object.values(skillVerifications).some((v) => v === "learning");

  const hasSkills = technicalSkills.length > 0 || softSkills.length > 0;

  return (
    <article
      className={cn(
        "relative mx-auto min-h-[297mm] w-full max-w-[820px] bg-white text-slate-800",
        "shadow-[0_1px_3px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      {/* Slim accent rail anchors the page without a heavy ink-hungry sidebar. */}
      <span className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-500 to-teal-600" aria-hidden />

      <div className="px-12 py-12">
        {/* ---------------- Header ---------------- */}
        <header className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h2 className="text-[33px] font-bold leading-[1.1] tracking-tight text-slate-900">
              {name}
            </h2>
            <p className="mt-1.5 text-[14px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              {role}
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
            {initialsFrom(name)}
          </div>
        </header>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-slate-500">
          {email && <ContactItem icon={<Mail className="h-3.5 w-3.5" />} text={email} />}
          {phone && <ContactItem icon={<Phone className="h-3.5 w-3.5" />} text={phone} />}
          {location && <ContactItem icon={<MapPin className="h-3.5 w-3.5" />} text={location} />}
          {linkedin && <ContactItem icon={<ExternalLink className="h-3.5 w-3.5" />} text={linkedin} />}
          {portfolio && <ContactItem icon={<ExternalLink className="h-3.5 w-3.5" />} text={portfolio} />}
        </div>

        <div className="mt-6 h-px w-full bg-slate-200" />

        {/* ---------------- Body ---------------- */}
        <div className="mt-7 space-y-7">
          {summary && (
            <Section title={copy.summary}>
              <p className="text-[13.5px] leading-7 text-slate-600">{summary}</p>
            </Section>
          )}

          {experience.length > 0 && (
            <Section title={copy.experience} icon={<Briefcase className="h-3.5 w-3.5" />}>
              <div className="space-y-5">
                {experience.map((item, index) => {
                  const position = firstText(item.position, item.title, item.job_title);
                  const company = firstText(item.company, item.company_name);
                  const period = [
                    firstText(item.start_date),
                    item.is_current ? copy.current : firstText(item.end_date),
                  ].filter(Boolean).join(" — ");
                  const description = firstText(item.description);
                  const achievements = asArray<string>(item.achievements);

                  return (
                    <div key={`${company}-${position}-${index}`} className="relative border-l-2 border-slate-100 pl-4">
                      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                      <div className="flex items-baseline justify-between gap-4">
                        <h3 className="text-[15px] font-semibold text-slate-900">{position || copy.position}</h3>
                        {period && <span className="shrink-0 text-[12px] font-medium text-slate-400">{period}</span>}
                      </div>
                      {company && <p className="text-[13px] font-medium text-emerald-700">{company}</p>}
                      {description && (
                        <p className="mt-2 text-[13px] leading-6 text-slate-600">{description}</p>
                      )}
                      {achievements.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {achievements.map((achievement, achievementIndex) => (
                            <li key={`${achievement}-${achievementIndex}`} className="flex gap-2 text-[13px] leading-6 text-slate-600">
                              <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                              <span>{achievement}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {education.length > 0 && (
            <Section title={copy.education} icon={<GraduationCap className="h-3.5 w-3.5" />}>
              <div className="space-y-4">
                {education.map((item, index) => (
                  <div key={`${item.institution}-${index}`} className="relative border-l-2 border-slate-100 pl-4">
                    <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-[15px] font-semibold text-slate-900">
                        {[firstText(item.degree, item.degree_type), firstText(item.field, item.field_of_study, item.major)].filter(Boolean).join(", ")}
                      </h3>
                      <span className="shrink-0 text-[12px] font-medium text-slate-400">{firstText(item.year, item.graduation_date)}</span>
                    </div>
                    <p className="text-[13px] font-medium text-emerald-700">{firstText(item.institution, item.institution_name)}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {projects.length > 0 && (
            <Section title={copy.projects}>
              <div className="space-y-4">
                {projects.map((project, index) => {
                  const projectName = firstText(project.name, project.project_name);
                  const projectDescription = firstText(project.description);
                  const projectUrl = firstText(project.url);

                  return (
                    <div key={`${projectName}-${index}`} className="relative border-l-2 border-slate-100 pl-4">
                      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                      <div className="flex items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-slate-900">{projectName}</h3>
                        {projectUrl && <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />}
                      </div>
                      {projectDescription && <p className="mt-1.5 text-[13px] leading-6 text-slate-600">{projectDescription}</p>}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {hasSkills && (
            <Section title={copy.skills}>
              <div className="space-y-3">
                {technicalSkills.length > 0 && (
                  <SkillGroup label={copy.technical} skills={technicalSkills} verificationFor={verificationFor} />
                )}
                {softSkills.length > 0 && (
                  <SkillGroup label={copy.soft} skills={softSkills} verificationFor={verificationFor} />
                )}
                {(hasVerified || hasLearning) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[10.5px] text-slate-400">
                    {hasVerified && (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
                        {copy.verifiedSkills}
                      </span>
                    )}
                    {hasLearning && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full border border-dashed border-slate-400" aria-hidden />
                        {copy.learningSkills}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Section>
          )}

          {languages.length > 0 && (
            <Section title={copy.languages} icon={<Languages className="h-3.5 w-3.5" />}>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {languages.map((language, index) => (
                  <div key={`${language.name}-${index}`} className="text-[13px]">
                    <span className="font-semibold text-slate-800">{firstText(language.name)}</span>
                    {firstText(language.proficiency, language.level) && (
                      <span className="text-slate-500"> — {firstText(language.proficiency, language.level)}</span>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {certifications.length > 0 && (
            <Section title={copy.certifications} icon={<Award className="h-3.5 w-3.5" />}>
              <div className="space-y-2">
                {certifications.map((cert, index) => (
                  <div key={`${cert.name}-${index}`} className="flex items-baseline justify-between gap-4 text-[13px]">
                    <span className="font-semibold text-slate-800">{firstText(cert.name)}</span>
                    <span className="shrink-0 text-[12px] text-slate-500">
                      {[firstText(cert.issuer, cert.issuing_organization), firstText(cert.year, cert.date)].filter(Boolean).join(" — ")}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {isPlaceholder && (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <Sparkles className="h-10 w-10 text-emerald-500" />
              <p className="mt-4 max-w-sm text-sm font-medium text-slate-500">
                {copy.fillForm}
              </p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function ContactItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-emerald-600">{icon}</span>
      {text}
    </span>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="h-3.5 w-1 rounded-full bg-emerald-500" aria-hidden />
        <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.2em] text-slate-700">
          {icon && <span className="text-emerald-600">{icon}</span>}
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SkillGroup({
  label,
  skills,
  verificationFor,
}: {
  label: string;
  skills: string[];
  verificationFor?: (skill: string) => "verified" | "learning" | undefined;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          const status = verificationFor?.(skill);
          return (
            <span
              key={skill}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[12px] font-medium",
                status === "verified"
                  ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                  : status === "learning"
                    ? "border-dashed border-slate-300 bg-white text-slate-500"
                    : "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              {status === "verified" && (
                <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden />
              )}
              {skill}
            </span>
          );
        })}
      </div>
    </div>
  );
}
