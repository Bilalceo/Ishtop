"use client";

/**
 * Privacy policy.
 *
 * Every statement here is checked against the code: the fields the
 * registration and profile endpoints store, what ai_service.py sends to
 * OpenAI, what backend/scripts/ingest harvests from public Telegram channels,
 * the auth cookies set in routes/auth.py, and the fact that DELETE /users/me
 * is a soft delete. Nothing is promised that the product does not do — there
 * is no self-service data export, so none is claimed.
 *
 * This is an accurate description of the system, not legal advice; it has not
 * been reviewed by a lawyer.
 */

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { useTranslation } from "@/hooks/useTranslation";

const SUPPORT_EMAIL = "support@ishtop.uz";

const uz: LegalSection[] = [
  {
    heading: "Bu siyosat nimani qamrab oladi",
    body: [
      "IshTop — O'zbekistondagi talabalar va yosh mutaxassislar uchun ish topish platformasi. Bu hujjat ishtopuz.uz saytida, @ishtop_ariza_bot Telegram botida va IshTop API orqali qanday ma'lumot to'planishini va u bilan nima qilinishini tushuntiradi.",
      "Ma'lumotlaringiz uchun javobgar tomon — IshTop jamoasi. Har qanday savol yoki so'rov uchun: " + SUPPORT_EMAIL + ".",
    ],
  },
  {
    heading: "Qanday ma'lumot to'playmiz",
    body: [
      "Faqat xizmat ishlashi uchun kerak bo'lgan ma'lumot:",
      [
        "Hisob: elektron pochta, ism, telefon raqami, parol (faqat shifrlangan ko'rinishda saqlanadi) va rolingiz — talaba yoki ish beruvchi.",
        "Google orqali kirsangiz: Google bizga ismingiz, pochtangiz va profil rasmingizni beradi. Parolingizni hech qachon ko'rmaymiz.",
        "Profil: qisqacha ma'lumot, joylashuv, avatar; ish beruvchilar uchun kompaniya nomi, sayti va ijtimoiy tarmoqlari.",
        "Rezyume: siz kiritgan yoki AI yaratgan barcha mazmun — ta'lim, ish tajribasi, ko'nikmalar, aloqa ma'lumotlari.",
        "Arizalar: qaysi vakansiyaga, qachon, qaysi rezyume bilan ariza berganingiz va motivatsion xatingiz.",
        "To'lov: obuna holati va to'lov identifikatorlari. Karta ma'lumotlari bizning serverlarimizga umuman tushmaydi — ularni to'lov provayderi qabul qiladi.",
        "Texnik: kirish vaqtlari, IP manzil va brauzer ma'lumotlari — xavfsizlik va suiiste'molni oldini olish uchun.",
      ],
    ],
  },
  {
    heading: "Nima uchun ishlatamiz",
    body: [
      [
        "Hisobingizni yuritish va tizimga kiritish.",
        "Rezyumengizga mos vakansiyalarni tanlash va moslik foizini hisoblash.",
        "AI rezyume, motivatsion xat va suhbat mashqlarini yaratish.",
        "Siz yuborgan arizalarni kuzatib borish.",
        "Obuna va to'lovlarni boshqarish.",
        "Xavfsizlik, firibgarlik va spamga qarshi kurash.",
      ],
      "Ma'lumotlaringizni sotmaymiz va reklama uchun uchinchi tomonlarga bermaymiz.",
    ],
  },
  {
    heading: "Sun'iy intellekt qanday ishlatiladi",
    body: [
      "Rezyume yaratish, motivatsion xat, moslikni tushuntirish va suhbat mashqi funksiyalari OpenAI xizmati orqali ishlaydi. Bu shuni anglatadiki, siz kiritgan rezyume mazmuni — ism, aloqa ma'lumotlari, ish tajribangiz — qayta ishlash uchun OpenAI serverlariga (AQSh) yuboriladi.",
      "AI natijalari xato bo'lishi mumkin. Rezyumeni yuborishdan oldin har doim o'zingiz tekshiring: sanalar, nomlar va raqamlar uchun javobgarlik sizda qoladi.",
      "AI funksiyalarini ishlatmasangiz, rezyume mazmuningiz OpenAI'ga yuborilmaydi.",
    ],
  },
  {
    heading: "Vakansiyalar qayerdan olinadi",
    body: [
      "Katalogdagi vakansiyalarning bir qismi ish beruvchilar tomonidan to'g'ridan-to'g'ri joylashtiriladi. Qolgani ochiq Telegram kanallaridan yig'iladi va faqat e'lonning o'zida ko'rsatilgan aloqa ma'lumoti bo'lsa chop etiladi.",
      "Bunday e'lonlarda ko'rsatilgan telefon raqami yoki Telegram username — e'lon muallifi o'zi ommaga e'lon qilgan ma'lumot. Biz uni o'zgartirmaymiz va o'ylab topmaymiz.",
      "Ariza berganingizda siz ish beruvchiga to'g'ridan-to'g'ri murojaat qilasiz. Biz vositachi emasmiz va rezyumengizni ish beruvchiga avtomatik yubormaymiz — bundan avto-ariza funksiyasi mustasno, u faqat siz yoqqaningizda ishlaydi.",
    ],
  },
  {
    heading: "Kim bilan bo'lishamiz",
    body: [
      "Xizmat ishlashi uchun zarur bo'lgan tashkilotlar bilan:",
      [
        "OpenAI — AI funksiyalari uchun (yuqoriga qarang).",
        "To'lov provayderi — obuna to'lovlari uchun.",
        "Cloudflare — sayt himoyasi va tezligi uchun.",
        "Railway — serverlar va ma'lumotlar bazasi joylashgan platforma.",
        "Google — faqat Google orqali kirishni tanlasangiz.",
      ],
      "Bundan tashqari qonun talab qilgan hollarda ma'lumot berishimiz mumkin.",
    ],
  },
  {
    heading: "Cookie fayllar",
    body: [
      "Faqat zarur cookie'lardan foydalanamiz: tizimga kirganingizni eslab qolish uchun sessiya cookie'lari va Cloudflare'ning xavfsizlik cookie'lari. Reklama yoki kuzatuv cookie'lari yo'q.",
      "Sessiya cookie'larini o'chirsangiz, tizimdan chiqasiz.",
    ],
  },
  {
    heading: "Qancha saqlaymiz va qanday o'chiramiz",
    body: [
      "Hisobingiz faol ekan, ma'lumotlaringiz saqlanadi.",
      "Sozlamalardan hisobni o'chirsangiz, hisobingiz darhol o'chiriladi va profilingiz hech kimga ko'rinmaydi. Texnik jihatdan yozuvlar bazada belgilangan holda qoladi — bu to'lov tarixi va xavfsizlik jurnallari uchun kerak.",
      "Ma'lumotlaringizni butunlay yo'q qilishni istasangiz, " + SUPPORT_EMAIL + " manziliga yozing va biz qo'lda o'chiramiz.",
    ],
  },
  {
    heading: "Sizning huquqlaringiz",
    body: [
      [
        "Ma'lumotlaringizni ko'rish va tahrirlash — profil va rezyume sahifalaridan.",
        "Hisobni o'chirish — sozlamalardan.",
        "Nusxa so'rash yoki butunlay o'chirishni talab qilish — " + SUPPORT_EMAIL + " orqali.",
      ],
      "So'rovlaringizga 30 kun ichida javob beramiz.",
    ],
  },
  {
    heading: "Xavfsizlik",
    body: [
      "Parollar shifrlangan holda saqlanadi, ma'lumotlar HTTPS orqali uzatiladi, sessiyalar cheklangan muddatga ega. Shunga qaramay, internetda hech bir xizmat 100% xavfsizlikni kafolatlay olmaydi.",
      "Ishga joylashish uchun sizdan pul so'rashsa — bu firibgarlik. Bunday holatni bizga xabar qiling.",
    ],
  },
  {
    heading: "O'zgarishlar va aloqa",
    body: [
      "Bu siyosat o'zgarsa, yuqoridagi sana yangilanadi. Jiddiy o'zgarishlar haqida elektron pochta orqali xabar beramiz.",
      "Savollar: " + SUPPORT_EMAIL,
    ],
  },
];

const ru: LegalSection[] = [
  {
    heading: "Что покрывает эта политика",
    body: [
      "IshTop — платформа поиска работы для студентов и молодых специалистов в Узбекистане. Этот документ объясняет, какие данные собираются на сайте ishtopuz.uz, в Telegram-боте @ishtop_ariza_bot и через API IshTop, и что с ними происходит.",
      "За ваши данные отвечает команда IshTop. Любые вопросы и запросы: " + SUPPORT_EMAIL + ".",
    ],
  },
  {
    heading: "Какие данные мы собираем",
    body: [
      "Только то, что нужно для работы сервиса:",
      [
        "Аккаунт: email, имя, телефон, пароль (хранится только в зашифрованном виде) и роль — соискатель или работодатель.",
        "Вход через Google: Google передаёт нам имя, почту и фото профиля. Ваш пароль мы не видим никогда.",
        "Профиль: описание, местоположение, аватар; для работодателей — название компании, сайт и соцсети.",
        "Резюме: всё содержимое, введённое вами или созданное AI — образование, опыт, навыки, контакты.",
        "Отклики: на какую вакансию, когда и с каким резюме вы откликнулись, и ваше сопроводительное письмо.",
        "Оплата: статус подписки и идентификаторы платежей. Данные карты на наши серверы не попадают — их принимает платёжный провайдер.",
        "Технические: время входов, IP-адрес и данные браузера — для безопасности и защиты от злоупотреблений.",
      ],
    ],
  },
  {
    heading: "Зачем мы их используем",
    body: [
      [
        "Вести ваш аккаунт и выполнять вход.",
        "Подбирать вакансии под ваше резюме и считать процент соответствия.",
        "Генерировать резюме, сопроводительные письма и тренажёр собеседования.",
        "Отслеживать отправленные вами отклики.",
        "Управлять подпиской и платежами.",
        "Обеспечивать безопасность и бороться с мошенничеством и спамом.",
      ],
      "Мы не продаём ваши данные и не передаём их третьим лицам для рекламы.",
    ],
  },
  {
    heading: "Как используется искусственный интеллект",
    body: [
      "Генерация резюме, сопроводительных писем, объяснение соответствия и тренажёр собеседования работают через сервис OpenAI. Это означает, что содержимое вашего резюме — имя, контакты, опыт работы — отправляется на серверы OpenAI (США) для обработки.",
      "Результаты AI могут содержать ошибки. Всегда проверяйте резюме перед отправкой: ответственность за даты, названия и цифры остаётся на вас.",
      "Если вы не пользуетесь AI-функциями, содержимое вашего резюме в OpenAI не отправляется.",
    ],
  },
  {
    heading: "Откуда берутся вакансии",
    body: [
      "Часть вакансий размещают работодатели напрямую. Остальные собираются из открытых Telegram-каналов и публикуются только при наличии контакта в самом объявлении.",
      "Указанные в таких объявлениях телефон или Telegram-ник — это данные, которые автор объявления сам опубликовал открыто. Мы их не меняем и не придумываем.",
      "Откликаясь, вы обращаетесь к работодателю напрямую. Мы не посредник и не отправляем ваше резюме работодателю автоматически — кроме функции авто-отклика, которая работает только если вы её включили.",
    ],
  },
  {
    heading: "С кем мы делимся",
    body: [
      "Только с теми, без кого сервис не работает:",
      [
        "OpenAI — для AI-функций (см. выше).",
        "Платёжный провайдер — для оплаты подписки.",
        "Cloudflare — для защиты и скорости сайта.",
        "Railway — платформа, где размещены серверы и база данных.",
        "Google — только если вы выбрали вход через Google.",
      ],
      "Кроме того, мы можем раскрыть данные, если этого требует закон.",
    ],
  },
  {
    heading: "Файлы cookie",
    body: [
      "Мы используем только необходимые cookie: сессионные — чтобы помнить, что вы вошли, и защитные cookie Cloudflare. Рекламных и трекинговых cookie нет.",
      "Если удалить сессионные cookie, вы выйдете из аккаунта.",
    ],
  },
  {
    heading: "Сколько храним и как удаляем",
    body: [
      "Пока аккаунт активен, данные хранятся.",
      "Если вы удалите аккаунт в настройках, он удаляется сразу и профиль перестаёт быть виден кому-либо. Технически записи остаются в базе помеченными — это нужно для истории платежей и журналов безопасности.",
      "Если вы хотите полного уничтожения данных, напишите на " + SUPPORT_EMAIL + ", и мы удалим их вручную.",
    ],
  },
  {
    heading: "Ваши права",
    body: [
      [
        "Смотреть и изменять свои данные — на страницах профиля и резюме.",
        "Удалить аккаунт — в настройках.",
        "Запросить копию или полное удаление — через " + SUPPORT_EMAIL + ".",
      ],
      "Мы отвечаем на запросы в течение 30 дней.",
    ],
  },
  {
    heading: "Безопасность",
    body: [
      "Пароли хранятся в зашифрованном виде, данные передаются по HTTPS, сессии ограничены по времени. При этом ни один сервис в интернете не может гарантировать стопроцентную безопасность.",
      "Если с вас просят деньги за трудоустройство — это мошенничество. Сообщите нам о таком случае.",
    ],
  },
  {
    heading: "Изменения и контакты",
    body: [
      "Если политика изменится, дата выше будет обновлена. О существенных изменениях сообщим по электронной почте.",
      "Вопросы: " + SUPPORT_EMAIL,
    ],
  },
];

export default function PrivacyPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  return (
    <LegalPage
      title={isRu ? "Политика конфиденциальности" : "Maxfiylik siyosati"}
      updated={isRu ? "Обновлено: 16 сентября 2026" : "Yangilangan: 2026-yil 16-sentabr"}
      intro={
        isRu
          ? "Коротко: мы собираем только то, что нужно для поиска работы, не продаём ваши данные, и честно говорим, что содержимое резюме уходит в OpenAI, когда вы пользуетесь AI-функциями."
          : "Qisqasi: faqat ish topish uchun kerak bo'lgan ma'lumotni yig'amiz, uni sotmaymiz va AI funksiyalaridan foydalanganingizda rezyume mazmuni OpenAI'ga yuborilishini ochiq aytamiz."
      }
      sections={isRu ? ru : uz}
    />
  );
}
