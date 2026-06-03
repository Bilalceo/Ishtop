/**
 * Company Settings Page
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Users,
  Camera,
  Save,
  Key,
  Bell,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { api, getErrorMessage } from "@/lib/api";

const companySchema = z.object({
  company_name: z.string().min(2, "Название компании обязательно / Kompaniya nomi majburiy"),
  company_description: z.string().max(2000).optional(),
  company_website: z.string().url("Неверный URL / Noto'g'ri URL").optional().or(z.literal("")),
  company_cover_photo_url: z.string().url("Неверный URL / Noto'g'ri URL").optional().or(z.literal("")),
  company_gallery_images: z.string().optional(),
  company_culture: z.string().max(4000).optional(),
  company_linkedin_url: z.string().url("Неверный URL / Noto'g'ri URL").optional().or(z.literal("")),
  company_telegram_url: z.string().url("Неверный URL / Noto'g'ri URL").optional().or(z.literal("")),
  company_instagram_url: z.string().url("Неверный URL / Noto'g'ri URL").optional().or(z.literal("")),
  company_facebook_url: z.string().url("Неверный URL / Noto'g'ri URL").optional().or(z.literal("")),
  company_founded_year: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(1700).max(2200).optional(),
  ),
  company_video_url: z.string().url("Неверный URL / Noto'g'ri URL").optional().or(z.literal("")),
  company_size: z.string().optional(),
  company_industry: z.string().optional(),
  full_name: z.string().min(2, "Имя контакта обязательно / Kontakt nomi majburiy"),
  email: z.string().email("Неверный email / Noto'g'ri email"),
  phone: z.string().optional(),
  location: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

type CompanyNotificationPreferences = {
  email_applications: boolean;
  email_interviews: boolean;
  email_jobs: boolean;
  email_tips: boolean;
  push_applications: boolean;
  push_messages: boolean;
  telegram_enabled: boolean;
  telegram_new_applications: boolean;
  telegram_deadline_reminders: boolean;
  telegram_chat_id: string;
  telegram_channel: string;
  preferred_salary_currency: "UZS" | "USD";
  company_size: string;
  company_industry: string;
};

const defaultNotificationPrefs: CompanyNotificationPreferences = {
  email_applications: true,
  email_interviews: true,
  email_jobs: true,
  email_tips: false,
  push_applications: true,
  push_messages: true,
  telegram_enabled: false,
  telegram_new_applications: true,
  telegram_deadline_reminders: true,
  telegram_chat_id: "",
  telegram_channel: "",
  preferred_salary_currency: "UZS",
  company_size: "",
  company_industry: "",
};

const companySizes = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

const industries = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Manufacturing",
  "Retail",
  "Media",
  "Consulting",
  "Real Estate",
  "Transportation",
  "Other",
];

function parseGalleryUrls(input?: string | null): string[] {
  if (!input) return [];
  return input
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export default function CompanySettingsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";
  const { user, updateUser, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("company");
  const [notificationPrefs, setNotificationPrefs] = useState<CompanyNotificationPreferences>(defaultNotificationPrefs);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      company_name: user?.company_name || "",
      company_description: user?.bio || "",
      company_website: user?.company_website || "",
      company_cover_photo_url: user?.company_cover_photo_url || "",
      company_gallery_images: (user?.company_gallery_images || []).join("\n"),
      company_culture: user?.company_culture || "",
      company_linkedin_url: user?.company_linkedin_url || "",
      company_telegram_url: user?.company_telegram_url || "",
      company_instagram_url: user?.company_instagram_url || "",
      company_facebook_url: user?.company_facebook_url || "",
      company_founded_year: user?.company_founded_year as any,
      company_video_url: user?.company_video_url || "",
      company_size: "",
      company_industry: "",
      full_name: user?.full_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      location: user?.location || "",
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    try {
      await updateUser({
        company_name: data.company_name,
        company_website: data.company_website || undefined,
        company_cover_photo_url: data.company_cover_photo_url || undefined,
        company_gallery_images: parseGalleryUrls(data.company_gallery_images),
        company_culture: data.company_culture || undefined,
        company_linkedin_url: data.company_linkedin_url || undefined,
        company_telegram_url: data.company_telegram_url || undefined,
        company_instagram_url: data.company_instagram_url || undefined,
        company_facebook_url: data.company_facebook_url || undefined,
        company_founded_year: data.company_founded_year || undefined,
        company_video_url: data.company_video_url || undefined,
        full_name: data.full_name,
        phone: data.phone || undefined,
        location: data.location || undefined,
        bio: data.company_description || undefined,
      });
      await api.put("/users/me/notification-preferences", {
        ...notificationPrefs,
        company_size: data.company_size || "",
        company_industry: data.company_industry || "",
      });
      toast.success(isRu ? "Настройки успешно обновлены!" : "Sozlamalar muvaffaqiyatli yangilandi!");
    } catch (error) {
      toast.error(getErrorMessage(error) || (isRu ? "Не удалось обновить настройки" : "Sozlamalarni yangilab bo'lmadi"));
    }
  };

  const handleSaveNotifications = async () => {
    setIsSavingNotifications(true);
    try {
      const payload = {
        ...notificationPrefs,
        company_size: watch("company_size") || "",
        company_industry: watch("company_industry") || "",
      };
      await api.put("/users/me/notification-preferences", payload);
      setNotificationPrefs(payload);
      toast.success(isRu ? "Уведомления обновлены" : "Bildirishnomalar yangilandi");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSavingNotifications(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    reset({
      company_name: user.company_name || "",
      company_description: user.bio || "",
      company_website: user.company_website || "",
      company_cover_photo_url: user.company_cover_photo_url || "",
      company_gallery_images: (user.company_gallery_images || []).join("\n"),
      company_culture: user.company_culture || "",
      company_linkedin_url: user.company_linkedin_url || "",
      company_telegram_url: user.company_telegram_url || "",
      company_instagram_url: user.company_instagram_url || "",
      company_facebook_url: user.company_facebook_url || "",
      company_founded_year: user.company_founded_year as any,
      company_video_url: user.company_video_url || "",
      company_size: "",
      company_industry: "",
      full_name: user.full_name || "",
      email: user.email || "",
      phone: user.phone || "",
      location: user.location || "",
    });
  }, [reset, user]);

  useEffect(() => {
    api
      .get("/users/me/notification-preferences")
      .then((res) => {
        const data = res.data?.data || {};
        const merged: CompanyNotificationPreferences = {
          ...defaultNotificationPrefs,
          ...data,
          preferred_salary_currency:
            String(data.preferred_salary_currency || "UZS").toUpperCase() === "USD" ? "USD" : "UZS",
          telegram_chat_id: data.telegram_chat_id || "",
          telegram_channel: data.telegram_channel || "",
          company_size: data.company_size || "",
          company_industry: data.company_industry || "",
        };
        setNotificationPrefs(merged);
        setValue("company_size", merged.company_size, { shouldDirty: false });
        setValue("company_industry", merged.company_industry, { shouldDirty: false });
      })
      .catch(() => {});
  }, [setValue]);

  const companyNameValue = watch("company_name") || "";
  const companyWebsiteValue = watch("company_website") || "";
  const companySizeValue = watch("company_size") || "";
  const companyIndustryValue = watch("company_industry") || "";
  const companyLocationValue = watch("location") || "";
  const companyDescriptionValue = watch("company_description") || "";

  const completionData = useMemo(() => {
    const fields = [
      { key: "logo", label: isRu ? "Логотип компании" : "Kompaniya logosi", done: !!user?.avatar_url },
      { key: "company_name", label: isRu ? "Название компании" : "Kompaniya nomi", done: !!companyNameValue.trim() },
      { key: "company_website", label: isRu ? "Веб-сайт" : "Veb-sayt", done: !!companyWebsiteValue.trim() },
      { key: "company_size", label: isRu ? "Размер компании" : "Kompaniya hajmi", done: !!companySizeValue.trim() },
      { key: "company_industry", label: isRu ? "Отрасль" : "Soha", done: !!companyIndustryValue.trim() },
      { key: "location", label: isRu ? "Локация" : "Joylashuv", done: !!companyLocationValue.trim() },
      { key: "company_description", label: isRu ? "О компании" : "Kompaniya haqida", done: !!companyDescriptionValue.trim() },
    ];

    const completed = fields.filter((item) => item.done).length;
    const percent = Math.round((completed / fields.length) * 100);
    const missing = fields.filter((item) => !item.done);
    return { percent, missing };
  }, [
    companyDescriptionValue,
    companyIndustryValue,
    companyLocationValue,
    companyNameValue,
    companySizeValue,
    companyWebsiteValue,
    isRu,
    user?.avatar_url,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-surface-900 dark:text-white">
          {isRu ? "Настройки компании" : "Kompaniya sozlamalari"}
        </h1>
        <p className="mt-1 text-surface-500">
          {isRu ? "Управляйте профилем компании и аккаунтом" : "Kompaniya profili va akkaunt sozlamalarini boshqaring"}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="company">{isRu ? "Профиль компании" : "Kompaniya profili"}</TabsTrigger>
          <TabsTrigger value="account">{isRu ? "Аккаунт" : "Akkaunt"}</TabsTrigger>
          <TabsTrigger value="notifications">{isRu ? "Уведомления" : "Bildirishnomalar"}</TabsTrigger>
        </TabsList>

        {/* Company Profile Tab */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isRu ? "Информация о компании" : "Kompaniya ma'lumotlari"}</CardTitle>
              <CardDescription>
                {isRu ? "Эта информация будет отображаться в ваших вакансиях" : "Bu ma'lumotlar vakansiyalaringizda ko'rsatiladi"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/60">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-surface-900 dark:text-white">
                        {isRu ? "Заполненность профиля компании" : "Kompaniya profili to'liqligi"}
                      </p>
                      <p className="text-xs text-surface-500">
                        {isRu
                          ? "Заполните поля, чтобы повысить доверие кандидатов"
                          : "Nomzodlar ishonchini oshirish uchun profilni to'ldiring"}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                      {completionData.percent}%
                    </span>
                  </div>
                  <Progress value={completionData.percent} className="mt-3 h-2" />
                  {completionData.missing.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-surface-600 dark:text-surface-300">
                        {isRu ? "Не заполнено:" : "To'ldirilmagan maydonlar:"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {completionData.missing.map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              const target = document.getElementById(item.key);
                              target?.scrollIntoView({ behavior: "smooth", block: "center" });
                              target?.focus();
                            }}
                            className="rounded-full border border-surface-300 px-2.5 py-1 text-xs text-surface-700 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-200 dark:hover:bg-surface-700"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {user?.verification_state === "approved" && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                    {isRu ? "Проверенная компания" : "Tasdiqlangan kompaniya"}
                  </div>
                )}

                {/* Logo */}
                <div id="logo" className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900 dark:to-brand-800">
                    {user?.company_logo_url ? (
                      <img
                        src={user.company_logo_url}
                        alt={user.company_name || (isRu ? "Компания" : "Kompaniya")}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <Building2 className="h-10 w-10 text-brand-600" />
                    )}
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      <Camera className="mr-2 h-4 w-4" />
                      {isRu ? "Загрузить" : "Logo yuklash"}
                    </Button>
                    <p className="mt-1 text-xs text-surface-500">
                      {isRu ? "Рекомендуется: 200x200px, PNG или JPG" : "Tavsiya: 200x200px, PNG yoki JPG"}
                    </p>
                  </div>
                </div>

                {/* Company Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">{isRu ? "Название компании" : "Kompaniya nomi"}</Label>
                    <Input
                      id="company_name"
                      icon={<Building2 className="h-5 w-5" />}
                      error={errors.company_name?.message}
                      {...register("company_name")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_website">{isRu ? "Veb-sayt" : "Veb-sayt"}</Label>
                    <Input
                      id="company_website"
                      icon={<Globe className="h-5 w-5" />}
                      placeholder="https://yourcompany.com"
                      error={errors.company_website?.message}
                      {...register("company_website")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_size">{isRu ? "Размер компании" : "Kompaniya hajmi"}</Label>
                    <Select
                      value={watch("company_size")}
                      onValueChange={(value) => setValue("company_size", value, { shouldDirty: true })}
                    >
                      <SelectTrigger id="company_size">
                        <SelectValue placeholder={isRu ? "Выберите размер" : "Hajmni tanlang"} />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {isRu
                              ? size.label
                                  .replace("employees", "сотрудников")
                                  .replace("employee", "сотрудник")
                              : size.label.replace("employees", "xodim")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_industry">{isRu ? "Отрасль" : "Soha"}</Label>
                    <Select
                      value={watch("company_industry")}
                      onValueChange={(value) => setValue("company_industry", value, { shouldDirty: true })}
                    >
                      <SelectTrigger id="company_industry">
                        <SelectValue placeholder={isRu ? "Выберите отрасль" : "Soha tanlang"} />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry} value={industry}>
                            {isRu
                              ? ({
                                  Technology: "Технологии",
                                  Finance: "Финансы",
                                  Healthcare: "Здравоохранение",
                                  Education: "Образование",
                                  Manufacturing: "Производство",
                                  Retail: "Розничная торговля",
                                  Media: "Медиа",
                                  Consulting: "Консалтинг",
                                  "Real Estate": "Недвижимость",
                                  Transportation: "Транспорт",
                                  Other: "Другое",
                                } as Record<string, string>)[industry]
                              : ({
                                  Technology: "Texnologiya",
                                  Finance: "Moliya",
                                  Healthcare: "Sog'liqni saqlash",
                                  Education: "Ta'lim",
                                  Manufacturing: "Ishlab chiqarish",
                                  Retail: "Savdo",
                                  Media: "Media",
                                  Consulting: "Konsalting",
                                  "Real Estate": "Ko'chmas mulk",
                                  Transportation: "Transport",
                                  Other: "Boshqa",
                                } as Record<string, string>)[industry]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">{isRu ? "Локация" : "Joylashuv"}</Label>
                    <Input
                      id="location"
                      icon={<MapPin className="h-5 w-5" />}
                      placeholder={isRu ? "Ташкент, Узбекистан" : "Toshkent, O'zbekiston"}
                      error={errors.location?.message}
                      {...register("location")}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="company_description">{isRu ? "О компании" : "Kompaniya haqida"}</Label>
                  <Textarea
                    id="company_description"
                    placeholder={
                      isRu
                        ? "Расскажите кандидатам о компании, культуре и ваших преимуществах..."
                        : "Nomzodlarga kompaniyangiz, madaniyatingiz va ustunliklaringiz haqida yozing..."
                    }
                    className="min-h-[150px]"
                    error={errors.company_description?.message}
                    {...register("company_description")}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_cover_photo_url">
                      {isRu ? "Обложка компании (URL, 1200x400)" : "Kompaniya cover rasmi (URL, 1200x400)"}
                    </Label>
                    <Input
                      id="company_cover_photo_url"
                      placeholder="https://..."
                      error={errors.company_cover_photo_url?.message}
                      {...register("company_cover_photo_url")}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_gallery_images">
                      {isRu ? "Галерея фото (до 6 URL, новая строка)" : "Kompaniya galereyasi (6 tagacha URL, har qatorda bittadan)"}
                    </Label>
                    <Textarea
                      id="company_gallery_images"
                      placeholder={"https://..."}
                      className="min-h-[120px]"
                      error={errors.company_gallery_images?.message as string | undefined}
                      {...register("company_gallery_images")}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_culture">{isRu ? "Культура компании" : "Bizning madaniyatimiz"}</Label>
                    <Textarea
                      id="company_culture"
                      placeholder={
                        isRu
                          ? "Опишите принципы, командную среду и рабочий стиль..."
                          : "Jamoa qadriyatlari, ish uslubi va muhit haqida yozing..."
                      }
                      className="min-h-[120px]"
                      error={errors.company_culture?.message}
                      {...register("company_culture")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_linkedin_url">LinkedIn</Label>
                    <Input
                      id="company_linkedin_url"
                      placeholder="https://linkedin.com/company/..."
                      error={errors.company_linkedin_url?.message}
                      {...register("company_linkedin_url")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_telegram_url">Telegram</Label>
                    <Input
                      id="company_telegram_url"
                      placeholder="https://t.me/..."
                      error={errors.company_telegram_url?.message}
                      {...register("company_telegram_url")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_instagram_url">Instagram</Label>
                    <Input
                      id="company_instagram_url"
                      placeholder="https://instagram.com/..."
                      error={errors.company_instagram_url?.message}
                      {...register("company_instagram_url")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_facebook_url">Facebook</Label>
                    <Input
                      id="company_facebook_url"
                      placeholder="https://facebook.com/..."
                      error={errors.company_facebook_url?.message}
                      {...register("company_facebook_url")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_founded_year">{isRu ? "Год основания" : "Tashkil topgan yil"}</Label>
                    <Input
                      id="company_founded_year"
                      type="number"
                      min={1700}
                      max={2200}
                      error={errors.company_founded_year?.message as string | undefined}
                      {...register("company_founded_year")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_video_url">{isRu ? "Видео компании (YouTube/Vimeo)" : "Kompaniya video URL (YouTube/Vimeo)"}</Label>
                    <Input
                      id="company_video_url"
                      placeholder="https://youtube.com/watch?v=..."
                      error={errors.company_video_url?.message}
                      {...register("company_video_url")}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end">
                  <Button type="submit" disabled={!isDirty} isLoading={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isRu ? "Сохранить" : "Saqlash"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isRu ? "Контактная информация" : "Kontakt ma'lumotlari"}</CardTitle>
              <CardDescription>
                {isRu ? "Основной контакт для аккаунта компании" : "Kompaniya akkaunti uchun asosiy kontakt"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">{isRu ? "Kontakt ismi" : "Kontakt nomi"}</Label>
                    <Input
                      id="full_name"
                      error={errors.full_name?.message}
                      {...register("full_name")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      icon={<Mail className="h-5 w-5" />}
                      error={errors.email?.message}
                      {...register("email")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">{isRu ? "Телефон" : "Telefon"}</Label>
                    <Input
                      id="phone"
                      icon={<Phone className="h-5 w-5" />}
                      error={errors.phone?.message}
                      {...register("phone")}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={!isDirty} isLoading={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isRu ? "Сохранить" : "Saqlash"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{isRu ? "Сменить пароль" : "Parolni o'zgartirish"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">{isRu ? "Текущий пароль" : "Joriy parol"}</Label>
                  <Input id="current_password" type="password" icon={<Key className="h-5 w-5" />} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_password">{isRu ? "Новый пароль" : "Yangi parol"}</Label>
                  <Input id="new_password" type="password" icon={<Key className="h-5 w-5" />} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">{isRu ? "Подтвердите новый пароль" : "Yangi parolni tasdiqlang"}</Label>
                  <Input id="confirm_password" type="password" icon={<Key className="h-5 w-5" />} />
                </div>
                <Button>{isRu ? "Обновить пароль" : "Parolni yangilash"}</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-600">{isRu ? "Опасная зона" : "Xavfli bo'lim"}</CardTitle>
              <CardDescription>
                {isRu ? "Навсегда удалить аккаунт компании" : "Kompaniya akkauntini butunlay o'chirish"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {isRu ? "Удалить аккаунт компании" : "Kompaniya akkauntini o'chirish"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isRu ? "Email уведомления" : "Email bildirishnomalari"}</CardTitle>
              <CardDescription>
                {isRu ? "Настройте, когда получать email уведомления" : "Qachon email bildirishnomalarini olishni sozlang"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: isRu ? "Новые заявки" : "Yangi arizalar",
                  description: isRu ? "Уведомлять, когда кто-то откликается на ваши вакансии" : "Vakansiyalarga kimdir ariza yuborsa xabar berish",
                  key: "email_applications",
                },
                {
                  title: isRu ? "Обновления заявок" : "Ariza yangilanishlari",
                  description: isRu ? "Когда кандидат обновляет или отзывает заявку" : "Nomzodlar arizasini yangilasa yoki bekor qilsa",
                  key: "email_interviews",
                },
                {
                  title: isRu ? "Срок вакансии" : "Vakansiya muddati",
                  description: isRu ? "Напоминания перед истечением срока вакансии" : "Vakansiya muddati tugashidan oldingi eslatmalar",
                  key: "email_jobs",
                },
                {
                  title: isRu ? "Еженедельный отчёт" : "Haftalik hisobot",
                  description: isRu ? "Сводка заявок и просмотров по всем вакансиям" : "Barcha vakansiyalar bo'yicha ariza va ko'rishlar xulosasi",
                  key: "email_tips",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between py-3 border-b border-surface-200 dark:border-surface-700 last:border-0"
                >
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="text-sm text-surface-500">{item.description}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(notificationPrefs[item.key as keyof CompanyNotificationPreferences])}
                    onChange={(event) =>
                      setNotificationPrefs((prev) => ({
                        ...prev,
                        [item.key]: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                </div>
              ))}

              <div className="space-y-4 rounded-xl border border-surface-200 p-4 dark:border-surface-700">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {isRu ? "Telegram уведомления" : "Telegram bildirishnomalari"}
                    </p>
                    <p className="text-sm text-surface-500">
                      {isRu
                        ? "Получайте уведомления о новых заявках и дедлайнах вакансий"
                        : "Yangi ariza va vakansiya muddati bo'yicha Telegram xabarlari"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationPrefs.telegram_enabled}
                    onChange={(event) =>
                      setNotificationPrefs((prev) => ({
                        ...prev,
                        telegram_enabled: event.target.checked,
                      }))
                    }
                    className="mt-1 h-5 w-5 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="telegram_chat_id">{isRu ? "Chat ID" : "Chat ID"}</Label>
                    <Input
                      id="telegram_chat_id"
                      value={notificationPrefs.telegram_chat_id}
                      onChange={(event) =>
                        setNotificationPrefs((prev) => ({
                          ...prev,
                          telegram_chat_id: event.target.value,
                        }))
                      }
                      placeholder="-1001234567890"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram_channel">{isRu ? "Канал username" : "Kanal username"}</Label>
                    <Input
                      id="telegram_channel"
                      value={notificationPrefs.telegram_channel}
                      onChange={(event) =>
                        setNotificationPrefs((prev) => ({
                          ...prev,
                          telegram_channel: event.target.value,
                        }))
                      }
                      placeholder="@ishtop_updates"
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center justify-between rounded-lg border border-surface-200 px-3 py-2 dark:border-surface-700">
                    <span className="text-sm text-surface-700 dark:text-surface-200">
                      {isRu ? "Новые заявки" : "Yangi arizalar"}
                    </span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.telegram_new_applications}
                      onChange={(event) =>
                        setNotificationPrefs((prev) => ({
                          ...prev,
                          telegram_new_applications: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-surface-300 text-brand-600"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-surface-200 px-3 py-2 dark:border-surface-700">
                    <span className="text-sm text-surface-700 dark:text-surface-200">
                      {isRu ? "Скорый дедлайн вакансии" : "Vakansiya muddati yaqin"}
                    </span>
                    <input
                      type="checkbox"
                      checked={notificationPrefs.telegram_deadline_reminders}
                      onChange={(event) =>
                        setNotificationPrefs((prev) => ({
                          ...prev,
                          telegram_deadline_reminders: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-surface-300 text-brand-600"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-surface-200 p-4 dark:border-surface-700">
                <Label htmlFor="salary_currency_pref">
                  {isRu ? "Валюта зарплаты по умолчанию" : "Standart maosh valyutasi"}
                </Label>
                <Select
                  value={notificationPrefs.preferred_salary_currency}
                  onValueChange={(value) =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      preferred_salary_currency: value === "USD" ? "USD" : "UZS",
                    }))
                  }
                >
                  <SelectTrigger id="salary_currency_pref">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UZS">UZS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-surface-500">
                  {isRu
                    ? "Эта валюта будет использоваться по умолчанию при создании вакансии."
                    : "Bu valyuta yangi vakansiya yaratishda default bo'lib ishlatiladi."}
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={isSavingNotifications}>
                  <Bell className="mr-2 h-4 w-4" />
                  {isSavingNotifications
                    ? isRu
                      ? "Сохраняется..."
                      : "Saqlanmoqda..."
                    : isRu
                    ? "Сохранить уведомления"
                    : "Bildirishnomalarni saqlash"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
















