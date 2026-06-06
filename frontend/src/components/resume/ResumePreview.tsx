"use client";

import {
  Award,
  Briefcase,
  CheckCircle2,
  Code2,
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
  return (parts[0]?.[0] || "S") + (parts[1]?.[0] || "C");
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
          links: "Ссылки",
          portfolio: "Портфолио",
          skills: "Навыки",
          technical: "Технические",
          soft: "Мягкие",
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
          links: "Havolalar",
          portfolio: "Portfolio",
          skills: "Ko'nikmalar",
          technical: "Texnik",
          soft: "Ijtimoiy",
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
  const skillVerifications = asRecord(rawContent.skillVerifications) as Record<string, string>;
  const verificationFor = (skill: string): "verified" | "learning" | undefined => {
    const status = skillVerifications[skill] ?? skillVerifications[skill.trim()];
    return status === "verified" || status === "learning" ? status : undefined;
  };
  const hasVerified = Object.values(skillVerifications).some((v) => v === "verified");
  const hasLearning = Object.values(skillVerifications).some((v) => v === "learning");

  return (
    <article className={cn("relative min-h-[297mm] overflow-hidden bg-[#f8fafc] text-slate-900", className)}>
      <div className="absolute -right-28 -top-28 h-72 w-72 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />

      <div className="relative grid min-h-[297mm] grid-cols-[1fr_250px]">
        <main className="space-y-8 bg-white px-10 py-10">
          <header className="border-b border-slate-200 pb-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.badge}
            </div>
            {/* h2: ResumePreview is always embedded inside a page that already owns the h1. */}
            <h2 className="text-[34px] font-black leading-tight tracking-tight text-slate-950">
              {name}
            </h2>
            <p className="mt-2 text-lg font-medium text-emerald-700">{role}</p>
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-600">
              {email && <ContactItem icon={<Mail className="h-4 w-4" />} text={email} />}
              {phone && <ContactItem icon={<Phone className="h-4 w-4" />} text={phone} />}
              {location && <ContactItem icon={<MapPin className="h-4 w-4" />} text={location} />}
            </div>
          </header>

          {summary && (
            <Section title={copy.summary} kicker="01">
              <p className="text-[14px] leading-7 text-slate-600">{summary}</p>
            </Section>
          )}

          {experience.length > 0 && (
            <Section title={copy.experience} kicker="02" icon={<Briefcase className="h-4 w-4" />}>
              <div className="space-y-5">
                {experience.map((item, index) => {
                  const position = firstText(item.position, item.title, item.job_title);
                  const company = firstText(item.company, item.company_name);
                  const period = [
                    firstText(item.start_date),
                    item.is_current ? copy.current : firstText(item.end_date),
                  ].filter(Boolean).join(" - ");
                  const description = firstText(item.description);
                  const achievements = asArray<string>(item.achievements);

                  return (
                    <div key={`${company}-${position}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-slate-950">{position || copy.position}</h3>
                          <p className="text-sm font-semibold text-emerald-700">{company}</p>
                        </div>
                        {period && <p className="whitespace-nowrap text-xs font-medium text-slate-500">{period}</p>}
                      </div>
                      {description && (
                        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
                      )}
                      {achievements.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {achievements.map((achievement, achievementIndex) => (
                            <li key={`${achievement}-${achievementIndex}`} className="flex gap-2 text-sm text-slate-600">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
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
            <Section title={copy.education} kicker="03" icon={<GraduationCap className="h-4 w-4" />}>
              <div className="grid gap-3">
                {education.map((item, index) => (
                  <div key={`${item.institution}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="font-bold text-slate-950">
                      {[firstText(item.degree, item.degree_type), firstText(item.field, item.field_of_study, item.major)].filter(Boolean).join(" - ")}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{firstText(item.institution, item.institution_name)}</p>
                    <p className="mt-1 text-xs text-slate-500">{firstText(item.year, item.graduation_date)}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {projects.length > 0 && (
            <Section title={copy.projects} kicker="04">
              <div className="grid gap-3">
                {projects.map((project, index) => {
                  const projectName = firstText(project.name, project.project_name);
                  const projectDescription = firstText(project.description);
                  const projectUrl = firstText(project.url);

                  return (
                    <div key={`${projectName}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-bold text-slate-950">{projectName}</h3>
                        {projectUrl && <ExternalLink className="h-4 w-4 text-emerald-700" />}
                      </div>
                      {projectDescription && <p className="mt-2 text-sm leading-6 text-slate-600">{projectDescription}</p>}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {isPlaceholder && (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 text-center">
              <Sparkles className="h-12 w-12 text-emerald-500" />
              <p className="mt-4 max-w-sm text-sm font-medium text-slate-500">
                {copy.fillForm}
              </p>
            </div>
          )}
        </main>

        <aside className="bg-slate-950 px-7 py-10 text-white">
          <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-emerald-400 to-cyan-300 text-2xl font-black text-slate-950 shadow-lg shadow-emerald-900/30">
            {initialsFrom(name)}
          </div>

          {(linkedin || portfolio) && (
            <div className="mt-8 space-y-3">
              <SidebarTitle title={copy.links} />
              {linkedin && <SidebarText text="LinkedIn" subtext={linkedin} />}
              {portfolio && <SidebarText text={copy.portfolio} subtext={portfolio} />}
            </div>
          )}

          {(technicalSkills.length > 0 || softSkills.length > 0) && (
            <div className="mt-8 space-y-4">
              <SidebarTitle icon={<Code2 className="h-4 w-4" />} title={copy.skills} />
              {technicalSkills.length > 0 && (
                <SkillGroup label={copy.technical} skills={technicalSkills} verificationFor={verificationFor} />
              )}
              {softSkills.length > 0 && (
                <SkillGroup label={copy.soft} skills={softSkills} muted verificationFor={verificationFor} />
              )}
              {(hasVerified || hasLearning) && (
                <div className="space-y-1 border-t border-white/10 pt-3 text-[10px] leading-4 text-slate-400">
                  {hasVerified && (
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-emerald-300" aria-hidden />
                      {copy.verifiedSkills}
                    </p>
                  )}
                  {hasLearning && (
                    <p className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full border border-slate-400" aria-hidden />
                      {copy.learningSkills}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {languages.length > 0 && (
            <div className="mt-8 space-y-3">
              <SidebarTitle icon={<Languages className="h-4 w-4" />} title={copy.languages} />
              {languages.map((language, index) => (
                <SidebarText
                  key={`${language.name}-${index}`}
                  text={firstText(language.name)}
                  subtext={firstText(language.proficiency, language.level)}
                />
              ))}
            </div>
          )}

          {certifications.length > 0 && (
            <div className="mt-8 space-y-3">
              <SidebarTitle icon={<Award className="h-4 w-4" />} title={copy.certifications} />
              {certifications.map((cert, index) => (
                <SidebarText
                  key={`${cert.name}-${index}`}
                  text={firstText(cert.name)}
                  subtext={[firstText(cert.issuer, cert.issuing_organization), firstText(cert.year, cert.date)].filter(Boolean).join(" - ")}
                />
              ))}
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}

function ContactItem({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-emerald-700">{icon}</span>
      {text}
    </span>
  );
}

function Section({
  title,
  kicker,
  icon,
  children,
}: {
  title: string;
  kicker: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-black text-white">{kicker}</span>
        <h2 className="flex items-center gap-2 text-[17px] font-black uppercase tracking-[0.18em] text-slate-950">
          {icon && <span className="text-emerald-700">{icon}</span>}
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function SidebarTitle({ icon, title }: { icon?: ReactNode; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
      {icon}
      {title}
    </h3>
  );
}

function SidebarText({ text, subtext }: { text: string; subtext?: string }) {
  if (!text && !subtext) return null;

  return (
    <div className="rounded-2xl bg-white/[0.07] p-3">
      {text && <p className="text-sm font-bold text-white">{text}</p>}
      {subtext && <p className="mt-1 break-words text-[11px] leading-4 text-slate-300">{subtext}</p>}
    </div>
  );
}

function SkillGroup({
  label,
  skills,
  muted,
  verificationFor,
}: {
  label: string;
  skills: string[];
  muted?: boolean;
  verificationFor?: (skill: string) => "verified" | "learning" | undefined;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => {
          const status = verificationFor?.(skill);
          return (
            <span
              key={skill}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold",
                muted ? "bg-white/10 text-slate-200" : "bg-emerald-300 text-slate-950",
                // Verified: solid ring highlight. Learning: subtle dashed outline.
                status === "verified" && "ring-1 ring-emerald-400",
                status === "learning" && "bg-transparent text-slate-300 ring-1 ring-dashed ring-slate-500",
              )}
            >
              {status === "verified" && (
                <CheckCircle2 className={cn("h-3 w-3", muted ? "text-emerald-300" : "text-emerald-700")} aria-hidden />
              )}
              {skill}
            </span>
          );
        })}
      </div>
    </div>
  );
}
