"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { adminApi, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Locale = "uz" | "ru";

type PricingPlan = {
  name: string;
  price: string;
  description: string;
  cta: string;
  features: string[];
  notIncluded?: string[];
  popular?: boolean;
};

type Testimonial = {
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
};

type LandingPayload = {
  hero: { title: string; subtitle: string; primaryCta: string; secondaryCta: string };
  stats: Array<{ value: string; label: string }>;
  features: Array<{ title: string; description: string }>;
  howItWorks: Array<{ title: string; description: string }>;
  pricing: PricingPlan[];
  testimonials: Testimonial[];
  cta: { title: string; subtitle: string; button: string };
  footer: { description: string };
};

function buildDefaultPayload(locale: Locale): LandingPayload {
  if (locale === "ru") {
    return {
      hero: {
        title: "ИИ-платформа карьеры для Узбекистана",
        subtitle: "Создавайте резюме с AI и находите лучшие вакансии быстрее.",
        primaryCta: "Начать бесплатно",
        secondaryCta: "Смотреть демо",
      },
      stats: [
        { value: "50K+", label: "Резюме создано" },
        { value: "10K+", label: "Пользователей" },
        { value: "95%", label: "Уровень успеха" },
        { value: "500+", label: "Компаний" },
      ],
      features: [
        { title: "AI Резюме", description: "Профессиональные резюме за секунды." },
        { title: "Умный матчинг", description: "Находите вакансии точнее по вашему профилю." },
        { title: "Авто-отклики", description: "Подавайте заявки быстрее в 1 клик." },
      ],
      howItWorks: [
        { title: "Создайте профиль", description: "Заполните опыт, навыки и цели." },
        { title: "Сгенерируйте резюме", description: "AI подготовит резюме под вашу сферу." },
        { title: "Найдите вакансии", description: "Получайте релевантные предложения." },
        { title: "Устройтесь на работу", description: "Подавайте заявки уверенно." },
      ],
      pricing: [
        {
          name: "Бесплатно",
          price: "0",
          description: "Для старта",
          cta: "Начать",
          features: ["1 AI-резюме", "Базовый поиск", "5 откликов/мес", "Email поддержка"],
          notIncluded: ["Безлимит AI", "Авто-отклики", "Приоритетная поддержка"],
        },
        {
          name: "Pro",
          price: "4",
          description: "Для активных соискателей",
          cta: "Пробный Pro",
          features: ["Безлимит AI", "Расширенный матчинг", "50 откликов/мес", "Авто-отклики"],
          notIncluded: ["Кастом интеграции"],
          popular: true,
        },
        {
          name: "Enterprise",
          price: "Custom",
          description: "Для команд",
          cta: "Связаться",
          features: ["Все из Pro", "Безлимит откликов", "Управление командой", "API доступ"],
          notIncluded: [],
        },
      ],
      testimonials: [
        { name: "Aziz Karimov", role: "Software Developer", company: "EPAM", quote: "Отличная платформа!", rating: 5 },
      ],
      cta: {
        title: "Готовы ускорить карьеру?",
        subtitle: "Присоединяйтесь к тысячам специалистов на IshTop.",
        button: "Начать бесплатно",
      },
      footer: { description: "AI-карьерная платформа для Узбекистана." },
    };
  }

  return {
    hero: {
      title: "O'zbekiston uchun AI-quvvatli karyera platformasi",
      subtitle: "AI yordamida professional rezyume yarating va mos ishlarni tezroq toping.",
      primaryCta: "Bepul boshlash",
      secondaryCta: "Demo ko'rish",
    },
    stats: [
      { value: "50K+", label: "Rezyumelar yaratildi" },
      { value: "10K+", label: "Foydalanuvchilar" },
      { value: "95%", label: "Muvaffaqiyat darajasi" },
      { value: "500+", label: "Kompaniyalar" },
    ],
    features: [
      { title: "AI Rezyume", description: "Soniyalarda professional rezyume yarating." },
      { title: "Aqlli moslik", description: "Profilga mos ishlarni tez toping." },
      { title: "Avto ariza", description: "Bir bosishda ko'p ishga ariza yuboring." },
    ],
    howItWorks: [
      { title: "Profil yarating", description: "Tajriba va ko'nikmalaringizni kiriting." },
      { title: "AI rezyume", description: "AI sizga mos rezyume tayyorlaydi." },
      { title: "Ishlarni ko'ring", description: "Mos vakansiyalarni tanlang." },
      { title: "Ishga kiring", description: "Tez va ishonchli ariza yuboring." },
    ],
    pricing: [
      {
        name: "Bepul",
        price: "0",
        description: "Boshlash uchun",
        cta: "Boshlash",
        features: ["1 ta AI rezyume", "Oddiy qidiruv", "5 ta ariza/oy", "Email yordam"],
        notIncluded: ["Cheksiz AI", "Avto ariza", "Ustuvor yordam"],
      },
      {
        name: "Pro",
        price: "4",
        description: "Faol izlovchilar uchun",
        cta: "Pro sinov",
        features: ["Cheksiz AI", "Kengaytirilgan moslik", "50 ta ariza/oy", "Avto ariza"],
        notIncluded: ["Maxsus integratsiya"],
        popular: true,
      },
      {
        name: "Korxona",
        price: "Kelishuv",
        description: "Jamoalar uchun",
        cta: "Aloqa",
        features: ["Pro dagi hamma narsa", "Cheksiz ariza", "Jamoa boshqaruvi", "API kirish"],
        notIncluded: [],
      },
    ],
    testimonials: [
      { name: "Aziz Karimov", role: "Software Developer", company: "EPAM", quote: "Ajoyib platforma!", rating: 5 },
    ],
    cta: {
      title: "Karyerangizni oshirishga tayyormisiz?",
      subtitle: "IshTop bilan orzuingizdagi ishga tezroq erishing.",
      button: "Bepul boshlash",
    },
    footer: { description: "O'zbekiston uchun AI-quvvatli karyera platformasi." },
  };
}

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function AdminLandingPage() {
  const [locale, setLocale] = useState<Locale>("uz");
  const [payload, setPayload] = useState<LandingPayload>(buildDefaultPayload("uz"));
  const [isPublished, setIsPublished] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const loadContent = async (targetLocale: Locale) => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getLandingContent(targetLocale);
      const content = data.data;
      setPayload((content.payload as LandingPayload) || buildDefaultPayload(targetLocale));
      setIsPublished(Boolean(content.is_published));
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContent(locale);
  }, [locale]);

  const payloadText = useMemo(() => JSON.stringify(payload, null, 2), [payload]);

  const onSave = async () => {
    setIsLoading(true);
    try {
      await adminApi.upsertLandingContent({
        locale,
        payload: payload as Record<string, unknown>,
        is_published: isPublished,
      });
      toast.success("Landing content saved");
      await loadContent(locale);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async () => {
    setIsLoading(true);
    try {
      await adminApi.deleteLandingContent(locale);
      toast.success("Landing content deleted");
      await loadContent(locale);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Landing CMS</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={locale} onValueChange={(value) => setLocale(value as Locale)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="uz">UZ</SelectItem>
                <SelectItem value="ru">RU</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => loadContent(locale)} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reload
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          <div className="flex items-center gap-2">
            <Switch checked={isPublished} onCheckedChange={setIsPublished} id="landing-publish" />
            <Label htmlFor="landing-publish">Published</Label>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Hero</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Title</Label>
                <Input value={payload.hero?.title || ""} onChange={(e) => setPayload((p) => ({ ...p, hero: { ...p.hero, title: e.target.value } }))} />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input value={payload.hero?.subtitle || ""} onChange={(e) => setPayload((p) => ({ ...p, hero: { ...p.hero, subtitle: e.target.value } }))} />
              </div>
              <div>
                <Label>Primary CTA</Label>
                <Input value={payload.hero?.primaryCta || ""} onChange={(e) => setPayload((p) => ({ ...p, hero: { ...p.hero, primaryCta: e.target.value } }))} />
              </div>
              <div>
                <Label>Secondary CTA</Label>
                <Input value={payload.hero?.secondaryCta || ""} onChange={(e) => setPayload((p) => ({ ...p, hero: { ...p.hero, secondaryCta: e.target.value } }))} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Stats</h3>
            {(payload.stats || []).map((item, idx) => (
              <div key={`stat-${idx}`} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                <Input value={item.value} onChange={(e) => setPayload((p) => ({ ...p, stats: p.stats.map((s, i) => (i === idx ? { ...s, value: e.target.value } : s)) }))} placeholder="50K+" />
                <Input value={item.label} onChange={(e) => setPayload((p) => ({ ...p, stats: p.stats.map((s, i) => (i === idx ? { ...s, label: e.target.value } : s)) }))} placeholder="Label" />
                <Button variant="outline" onClick={() => setPayload((p) => ({ ...p, stats: p.stats.filter((_, i) => i !== idx) }))}>Remove</Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setPayload((p) => ({ ...p, stats: [...(p.stats || []), { value: "", label: "" }] }))}><Plus className="mr-2 h-4 w-4" /> Add stat</Button>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Features</h3>
            {(payload.features || []).map((item, idx) => (
              <div key={`feature-${idx}`} className="space-y-2 rounded-xl border p-3">
                <Input value={item.title} onChange={(e) => setPayload((p) => ({ ...p, features: p.features.map((f, i) => (i === idx ? { ...f, title: e.target.value } : f)) }))} placeholder="Feature title" />
                <Textarea value={item.description} onChange={(e) => setPayload((p) => ({ ...p, features: p.features.map((f, i) => (i === idx ? { ...f, description: e.target.value } : f)) }))} placeholder="Feature description" />
                <Button variant="outline" onClick={() => setPayload((p) => ({ ...p, features: p.features.filter((_, i) => i !== idx) }))}>Remove</Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setPayload((p) => ({ ...p, features: [...(p.features || []), { title: "", description: "" }] }))}><Plus className="mr-2 h-4 w-4" /> Add feature</Button>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">How It Works</h3>
            {(payload.howItWorks || []).map((item, idx) => (
              <div key={`how-${idx}`} className="space-y-2 rounded-xl border p-3">
                <Input value={item.title} onChange={(e) => setPayload((p) => ({ ...p, howItWorks: p.howItWorks.map((h, i) => (i === idx ? { ...h, title: e.target.value } : h)) }))} placeholder={`Step ${idx + 1} title`} />
                <Textarea value={item.description} onChange={(e) => setPayload((p) => ({ ...p, howItWorks: p.howItWorks.map((h, i) => (i === idx ? { ...h, description: e.target.value } : h)) }))} placeholder={`Step ${idx + 1} description`} />
                <Button variant="outline" onClick={() => setPayload((p) => ({ ...p, howItWorks: p.howItWorks.filter((_, i) => i !== idx) }))}>Remove</Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setPayload((p) => ({ ...p, howItWorks: [...(p.howItWorks || []), { title: "", description: "" }] }))}><Plus className="mr-2 h-4 w-4" /> Add step</Button>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Pricing</h3>
            {(payload.pricing || []).map((plan, idx) => (
              <div key={`pricing-${idx}`} className="space-y-3 rounded-xl border p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <Input value={plan.name} onChange={(e) => setPayload((p) => ({ ...p, pricing: p.pricing.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)) }))} placeholder="Plan name" />
                  <Input value={plan.price} onChange={(e) => setPayload((p) => ({ ...p, pricing: p.pricing.map((item, i) => (i === idx ? { ...item, price: e.target.value } : item)) }))} placeholder="Price" />
                </div>
                <Input value={plan.description} onChange={(e) => setPayload((p) => ({ ...p, pricing: p.pricing.map((item, i) => (i === idx ? { ...item, description: e.target.value } : item)) }))} placeholder="Description" />
                <Input value={plan.cta} onChange={(e) => setPayload((p) => ({ ...p, pricing: p.pricing.map((item, i) => (i === idx ? { ...item, cta: e.target.value } : item)) }))} placeholder="CTA text" />
                <div className="flex items-center gap-2">
                  <Switch checked={Boolean(plan.popular)} onCheckedChange={(value) => setPayload((p) => ({ ...p, pricing: p.pricing.map((item, i) => (i === idx ? { ...item, popular: value } : item)) }))} id={`popular-${idx}`} />
                  <Label htmlFor={`popular-${idx}`}>Most popular</Label>
                </div>
                <div>
                  <Label>Included features (one per line)</Label>
                  <Textarea value={(plan.features || []).join("\n")} onChange={(e) => setPayload((p) => ({ ...p, pricing: p.pricing.map((item, i) => (i === idx ? { ...item, features: splitLines(e.target.value) } : item)) }))} />
                </div>
                <div>
                  <Label>Not included (one per line)</Label>
                  <Textarea value={(plan.notIncluded || []).join("\n")} onChange={(e) => setPayload((p) => ({ ...p, pricing: p.pricing.map((item, i) => (i === idx ? { ...item, notIncluded: splitLines(e.target.value) } : item)) }))} />
                </div>
                <Button variant="outline" onClick={() => setPayload((p) => ({ ...p, pricing: p.pricing.filter((_, i) => i !== idx) }))}>Remove plan</Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setPayload((p) => ({ ...p, pricing: [...(p.pricing || []), { name: "", price: "", description: "", cta: "", features: [], notIncluded: [], popular: false }] }))}><Plus className="mr-2 h-4 w-4" /> Add plan</Button>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Testimonials</h3>
            {(payload.testimonials || []).map((item, idx) => (
              <div key={`testimonial-${idx}`} className="space-y-2 rounded-xl border p-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <Input value={item.name} onChange={(e) => setPayload((p) => ({ ...p, testimonials: p.testimonials.map((t, i) => (i === idx ? { ...t, name: e.target.value } : t)) }))} placeholder="Name" />
                  <Input value={item.role} onChange={(e) => setPayload((p) => ({ ...p, testimonials: p.testimonials.map((t, i) => (i === idx ? { ...t, role: e.target.value } : t)) }))} placeholder="Role" />
                  <Input value={item.company} onChange={(e) => setPayload((p) => ({ ...p, testimonials: p.testimonials.map((t, i) => (i === idx ? { ...t, company: e.target.value } : t)) }))} placeholder="Company" />
                </div>
                <Textarea value={item.quote} onChange={(e) => setPayload((p) => ({ ...p, testimonials: p.testimonials.map((t, i) => (i === idx ? { ...t, quote: e.target.value } : t)) }))} placeholder="Quote" />
                <Input type="number" min={1} max={5} value={item.rating} onChange={(e) => setPayload((p) => ({ ...p, testimonials: p.testimonials.map((t, i) => (i === idx ? { ...t, rating: Number(e.target.value) || 5 } : t)) }))} placeholder="Rating 1-5" />
                <Button variant="outline" onClick={() => setPayload((p) => ({ ...p, testimonials: p.testimonials.filter((_, i) => i !== idx) }))}>Remove</Button>
              </div>
            ))}
            <Button variant="secondary" onClick={() => setPayload((p) => ({ ...p, testimonials: [...(p.testimonials || []), { name: "", role: "", company: "", quote: "", rating: 5 }] }))}><Plus className="mr-2 h-4 w-4" /> Add testimonial</Button>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">CTA & Footer</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>CTA title</Label>
                <Input value={payload.cta?.title || ""} onChange={(e) => setPayload((p) => ({ ...p, cta: { ...p.cta, title: e.target.value } }))} />
              </div>
              <div>
                <Label>CTA button</Label>
                <Input value={payload.cta?.button || ""} onChange={(e) => setPayload((p) => ({ ...p, cta: { ...p.cta, button: e.target.value } }))} />
              </div>
            </div>
            <div>
              <Label>CTA subtitle</Label>
              <Textarea value={payload.cta?.subtitle || ""} onChange={(e) => setPayload((p) => ({ ...p, cta: { ...p.cta, subtitle: e.target.value } }))} />
            </div>
            <div>
              <Label>Footer description</Label>
              <Input value={payload.footer?.description || ""} onChange={(e) => setPayload((p) => ({ ...p, footer: { ...p.footer, description: e.target.value } }))} />
            </div>
          </section>

          <section>
            <Label>Advanced JSON preview</Label>
            <Textarea readOnly value={payloadText} className="min-h-[220px] font-mono text-xs" />
          </section>

          <div className="flex items-center gap-3">
            <Button onClick={onSave} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" /> Save changes
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={isLoading}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete locale content
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
