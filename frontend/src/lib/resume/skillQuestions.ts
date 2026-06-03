/**
 * Skill Verification — local question bank (MVP, frontend-only).
 *
 * Purpose: lightly verify that a user actually knows a skill they added to
 * their resume, WITHOUT a heavy exam system. One simple junior-level question
 * per important skill, max 3 per session, fully skippable.
 *
 * No backend dependency. Category is detected from the skill string via
 * keyword matching, then one question is drawn from that category's pool.
 */

export type VerificationStatus = "verified" | "learning" | "unverified";

export type SkillCategory =
  | "it"
  | "data"
  | "teaching"
  | "sales"
  | "fitness"
  | "support"
  | "marketing"
  | "accounting"
  | "logistics";

export interface VerificationQuestion {
  id: string;
  category: SkillCategory;
  uz: { q: string; options: string[] };
  ru: { q: string; options: string[] };
  /** index of the correct option (same for uz/ru) */
  correct: number;
}

// ---------------------------------------------------------------------------
// Category detection — keyword → category. Order matters (first match wins).
// Keywords are matched case-insensitively against the normalized skill string.
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS: Array<{ category: SkillCategory; keywords: string[] }> = [
  { category: "it", keywords: ["html", "css", "javascript", "js", "react", "vue", "python", "django", "fastapi", "node", "typescript", "php", "java", "sql", "git", "rest", "api", "docker", "linux", "dasturlash", "backend", "frontend", "telegram bot", "figma"] },
  { category: "data", keywords: ["excel", "google sheets", "sheets", "power bi", "data analy", "data entry", "ma'lumot", "statistic", "dashboard"] },
  { category: "accounting", keywords: ["buxgalter", "accountant", "1c", "1с", "hisobot", "soliq", "ledger", "payroll", "reconcil", "moliya", "audit"] },
  { category: "teaching", keywords: ["teacher", "o'qituvchi", "oqituvchi", "dars", "ielts", "tutor", "mentor", "ta'lim", "talim", "education", "o'quvchi", "o'quv"] },
  { category: "marketing", keywords: ["smm", "instagram", "marketing", "content", "copywrit", "targetolog", "canva", "ads", "reels", "kontent", "video montaj"] },
  { category: "sales", keywords: ["sotuv", "savdo", "sales", "crm", "negotiat", "b2b", "merchandis", "savdo vakili", "konsultant"] },
  { category: "fitness", keywords: ["fitness", "fitnes", "trener", "trainer", "sport", "yoga", "pilates", "gym", "trening"] },
  { category: "support", keywords: ["support", "call center", "call-center", "mijoz", "customer", "operator", "qo'ng'iroq", "qollab"] },
  { category: "logistics", keywords: ["logistic", "logistika", "haydovchi", "kuryer", "courier", "ombor", "warehouse", "dispatch", "ekspeditor", "yetkaz", "delivery", "marshrut"] },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[`'']/g, "'").trim();
}

export function detectCategory(skill: string): SkillCategory | null {
  const n = normalize(skill);
  for (const { category, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => n.includes(k))) return category;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Question bank — 3–5 junior-level questions per category (UZ + RU).
// ---------------------------------------------------------------------------

export const QUESTION_BANK: VerificationQuestion[] = [
  // ----------------------------- IT -----------------------------
  { id: "it-1", category: "it", correct: 1,
    uz: { q: "HTML nima uchun ishlatiladi?", options: ["Ma'lumotlar bazasi uchun", "Veb-sahifa tuzilmasi (struktura) uchun", "Rasm tahrirlash uchun", "Antivirus uchun"] },
    ru: { q: "Для чего используется HTML?", options: ["Для базы данных", "Для структуры веб-страницы", "Для редактирования фото", "Для антивируса"] } },
  { id: "it-2", category: "it", correct: 2,
    uz: { q: "JavaScript asosan qayerda ishlaydi?", options: ["Faqat printerda", "Faqat Excelda", "Brauzerda (veb-sahifada)", "Faqat bosma kitobda"] },
    ru: { q: "Где в основном работает JavaScript?", options: ["Только в принтере", "Только в Excel", "В браузере (на веб-странице)", "Только в печатной книге"] } },
  { id: "it-3", category: "it", correct: 0,
    uz: { q: "Git nima uchun kerak?", options: ["Kod versiyalarini boshqarish uchun", "Qahva tayyorlash uchun", "Rasm chizish uchun", "Musiqa tinglash uchun"] },
    ru: { q: "Для чего нужен Git?", options: ["Для контроля версий кода", "Для приготовления кофе", "Для рисования", "Для прослушивания музыки"] } },
  { id: "it-4", category: "it", correct: 1,
    uz: { q: "SQL nima uchun ishlatiladi?", options: ["Video montaj", "Ma'lumotlar bazasi bilan ishlash", "Logo chizish", "Fitnes dasturi"] },
    ru: { q: "Для чего используется SQL?", options: ["Видеомонтаж", "Работа с базой данных", "Рисование логотипа", "Программа фитнеса"] } },
  { id: "it-5", category: "it", correct: 2,
    uz: { q: "Python — bu nima?", options: ["Brauzer", "Operatsion tizim", "Dasturlash tili", "Antivirus"] },
    ru: { q: "Python — это что?", options: ["Браузер", "Операционная система", "Язык программирования", "Антивирус"] } },
  { id: "it-6", category: "it", correct: 0,
    uz: { q: "React asosan nima uchun ishlatiladi?", options: ["Foydalanuvchi interfeysi (UI) yaratish", "Soliq hisoboti", "Ovqat yetkazish", "Sport mashqi"] },
    ru: { q: "Для чего в основном используется React?", options: ["Создание пользовательского интерфейса (UI)", "Налоговая отчётность", "Доставка еды", "Спортивные упражнения"] } },

  // --------------------------- Excel/Data ---------------------------
  { id: "data-1", category: "data", correct: 1,
    uz: { q: "Excelda yig'indini hisoblovchi funksiya qaysi?", options: ["PRINT()", "SUM()", "COLOR()", "OPEN()"] },
    ru: { q: "Какая функция в Excel считает сумму?", options: ["PRINT()", "SUM()", "COLOR()", "OPEN()"] } },
  { id: "data-2", category: "data", correct: 2,
    uz: { q: "Excelda katakdagi formula nima bilan boshlanadi?", options: ["# belgisi", "@ belgisi", "= belgisi", "Bo'sh joy"] },
    ru: { q: "С чего начинается формула в ячейке Excel?", options: ["Со знака #", "Со знака @", "Со знака =", "С пробела"] } },
  { id: "data-3", category: "data", correct: 0,
    uz: { q: "O'rtacha qiymatni topish uchun qaysi funksiya?", options: ["AVERAGE()", "DELETE()", "SAVE()", "MAX() faqat"] },
    ru: { q: "Какая функция находит среднее значение?", options: ["AVERAGE()", "DELETE()", "SAVE()", "Только MAX()"] } },

  // ---------------------------- Teaching ----------------------------
  { id: "teach-1", category: "teaching", correct: 1,
    uz: { q: "Yangi o'quvchi darsni tushunmasa, eng to'g'ri yo'l qaysi?", options: ["Darrov baho qo'yib o'tib ketish", "Sodda misol bilan qayta tushuntirish", "E'tibor bermaslik", "Uyga yuborish"] },
    ru: { q: "Если новый ученик не понял урок, что правильнее?", options: ["Сразу поставить оценку и идти дальше", "Объяснить заново на простом примере", "Игнорировать", "Отправить домой"] } },
  { id: "teach-2", category: "teaching", correct: 2,
    uz: { q: "IELTS imtihonida nechta asosiy bo'lim bor?", options: ["2 ta", "3 ta", "4 ta (Listening, Reading, Writing, Speaking)", "6 ta"] },
    ru: { q: "Сколько основных секций в экзамене IELTS?", options: ["2", "3", "4 (Listening, Reading, Writing, Speaking)", "6"] } },
  { id: "teach-3", category: "teaching", correct: 0,
    uz: { q: "Dars rejasi (lesson plan) nima uchun kerak?", options: ["Darsni tartibli va maqsadli o'tish uchun", "Faqat qog'oz sarflash uchun", "O'quvchini qo'rqitish uchun", "Hech narsaga"] },
    ru: { q: "Зачем нужен план урока (lesson plan)?", options: ["Чтобы провести урок структурно и по цели", "Чтобы тратить бумагу", "Чтобы пугать ученика", "Незачем"] } },

  // ----------------------------- Sales -----------------------------
  { id: "sales-1", category: "sales", correct: 1,
    uz: { q: "Mijoz mahsulotdan shubhalansa, sotuvchi avval nima qiladi?", options: ["Bahslashadi", "Mijozni tinglab, ehtiyojini aniqlaydi", "Indamay turadi", "Boshqa mijozga o'tadi"] },
    ru: { q: "Если клиент сомневается в товаре, что делает продавец сначала?", options: ["Спорит", "Слушает клиента и выявляет потребность", "Молчит", "Переходит к другому клиенту"] } },
  { id: "sales-2", category: "sales", correct: 0,
    uz: { q: "CRM tizimi nima uchun ishlatiladi?", options: ["Mijozlar va sotuvlarni hisobga olish uchun", "Ovqat tayyorlash uchun", "Rasm chizish uchun", "Sport uchun"] },
    ru: { q: "Для чего используется CRM-система?", options: ["Для учёта клиентов и продаж", "Для готовки", "Для рисования", "Для спорта"] } },
  { id: "sales-3", category: "sales", correct: 2,
    uz: { q: "\"Upsell\" nimani anglatadi?", options: ["Narxni tushirish", "Mijozni rad etish", "Qo'shimcha yoki qimmatroq mahsulot taklif qilish", "Do'konni yopish"] },
    ru: { q: "Что означает «upsell»?", options: ["Снизить цену", "Отказать клиенту", "Предложить доп. или более дорогой товар", "Закрыть магазин"] } },

  // ---------------------------- Fitness ----------------------------
  { id: "fit-1", category: "fitness", correct: 1,
    uz: { q: "Mashg'ulotdan oldin nima qilish muhim?", options: ["Darrov og'ir vazn ko'tarish", "Qizdiruvchi mashqlar (warm-up) qilish", "Ko'p ovqat yeyish", "Uxlab olish"] },
    ru: { q: "Что важно сделать перед тренировкой?", options: ["Сразу взять большой вес", "Сделать разминку (warm-up)", "Плотно поесть", "Поспать"] } },
  { id: "fit-2", category: "fitness", correct: 0,
    uz: { q: "Yangi mijozga dastur tuzishda avval nima hisobga olinadi?", options: ["Sog'lig'i va maqsadi", "Faqat yoshi", "Telefon rangi", "Hech narsa"] },
    ru: { q: "Что учитывается в первую очередь при составлении программы новичку?", options: ["Здоровье и цель", "Только возраст", "Цвет телефона", "Ничего"] } },
  { id: "fit-3", category: "fitness", correct: 2,
    uz: { q: "To'g'ri texnika nima uchun muhim?", options: ["Faqat chiroyli ko'rinish uchun", "Ahamiyatsiz", "Jarohatdan saqlanish va natija uchun", "Vaqt yo'qotish uchun"] },
    ru: { q: "Почему важна правильная техника?", options: ["Только для красоты", "Неважна", "Для защиты от травм и результата", "Чтобы терять время"] } },

  // ------------------------ Customer Support ------------------------
  { id: "sup-1", category: "support", correct: 1,
    uz: { q: "Jahli chiqqan mijoz qo'ng'iroq qildi. Birinchi qadam?", options: ["Telefonni o'chirish", "Tinch tinglab, muammoni tushunish", "Baqirish", "Boshqa bo'limga otish"] },
    ru: { q: "Позвонил рассерженный клиент. Первый шаг?", options: ["Сбросить звонок", "Спокойно выслушать и понять проблему", "Кричать", "Перекинуть в другой отдел"] } },
  { id: "sup-2", category: "support", correct: 0,
    uz: { q: "Mijozga xizmatda eng muhim sifat qaysi?", options: ["Sabr va xushmuomalalik", "Tezda jahl chiqarish", "Javob bermaslik", "Mijozni ayblash"] },
    ru: { q: "Какое качество важнее всего в поддержке?", options: ["Терпение и вежливость", "Быстро злиться", "Не отвечать", "Винить клиента"] } },
  { id: "sup-3", category: "support", correct: 2,
    uz: { q: "Savolga javobni bilmasangiz nima qilasiz?", options: ["O'ylab topib aytasiz", "Indamaysiz", "Tekshirib yoki mas'ul xodimga yo'naltirasiz", "Telefonni o'chirasiz"] },
    ru: { q: "Что делать, если не знаете ответ на вопрос?", options: ["Придумать ответ", "Промолчать", "Уточнить или направить ответственному", "Сбросить звонок"] } },

  // ------------------------- Marketing/SMM -------------------------
  { id: "mkt-1", category: "marketing", correct: 1,
    uz: { q: "Instagramda \"Stories\" nima?", options: ["Doimiy post", "24 soatdan keyin yo'qoladigan kontent", "To'lov tizimi", "Shaxsiy xabar"] },
    ru: { q: "Что такое «Stories» в Instagram?", options: ["Постоянный пост", "Контент, исчезающий через 24 часа", "Платёжная система", "Личное сообщение"] } },
  { id: "mkt-2", category: "marketing", correct: 0,
    uz: { q: "\"Target\" (taom emas, reklama) nimani anglatadi?", options: ["Aniq auditoriyaga reklama ko'rsatish", "Tasodifiy odamga sms", "Logoni o'chirish", "Sahifani yopish"] },
    ru: { q: "Что означает «таргет» в рекламе?", options: ["Показ рекламы конкретной аудитории", "Случайная смс", "Удаление логотипа", "Закрытие страницы"] } },
  { id: "mkt-3", category: "marketing", correct: 2,
    uz: { q: "Canva nima uchun ishlatiladi?", options: ["Kod yozish", "Ombor hisobi", "Dizayn va vizual kontent tayyorlash", "Avto haydash"] },
    ru: { q: "Для чего используется Canva?", options: ["Написание кода", "Складской учёт", "Создание дизайна и визуала", "Вождение авто"] } },

  // ------------------------- Accounting -------------------------
  { id: "acc-1", category: "accounting", correct: 1,
    uz: { q: "1C dasturi asosan nima uchun?", options: ["O'yin uchun", "Buxgalteriya va hisob uchun", "Video uchun", "Navigatsiya uchun"] },
    ru: { q: "Для чего в основном программа 1С?", options: ["Для игр", "Для бухгалтерии и учёта", "Для видео", "Для навигации"] } },
  { id: "acc-2", category: "accounting", correct: 0,
    uz: { q: "Debet va Kredit nimaga taalluqli?", options: ["Buxgalteriya yozuvlariga", "Sport turlariga", "Ranglarga", "Ob-havoga"] },
    ru: { q: "К чему относятся Дебет и Кредит?", options: ["К бухгалтерским записям", "К видам спорта", "К цветам", "К погоде"] } },
  { id: "acc-3", category: "accounting", correct: 2,
    uz: { q: "Birlamchi hujjat (faktura) nima uchun kerak?", options: ["Bezak uchun", "Hech narsaga", "Operatsiyani rasmiy tasdiqlash uchun", "Reklama uchun"] },
    ru: { q: "Зачем нужен первичный документ (накладная/счёт)?", options: ["Для украшения", "Низачем", "Для официального подтверждения операции", "Для рекламы"] } },

  // -------------------------- Logistics --------------------------
  { id: "log-1", category: "logistics", correct: 1,
    uz: { q: "Kuryer uchun eng muhim sifat qaysi?", options: ["Sekinlik", "Punktuallik va shaharni bilish", "Telefon o'chirish", "Buyurtmani ochish"] },
    ru: { q: "Какое качество важнее всего для курьера?", options: ["Медлительность", "Пунктуальность и знание города", "Выключенный телефон", "Вскрывать заказ"] } },
  { id: "log-2", category: "logistics", correct: 0,
    uz: { q: "Omborda mahsulotni qabul qilishda avval nima qilinadi?", options: ["Miqdor va sifatni tekshirish", "Darrov sotish", "Tashlab yuborish", "Hisobga olmaslik"] },
    ru: { q: "Что делают при приёмке товара на складе сначала?", options: ["Проверяют количество и качество", "Сразу продают", "Выбрасывают", "Не учитывают"] } },
  { id: "log-3", category: "logistics", correct: 2,
    uz: { q: "Marshrutni optimallashtirish nima beradi?", options: ["Ko'proq yoqilg'i sarfi", "Kechikish", "Vaqt va xarajatni tejash", "Hech narsa"] },
    ru: { q: "Что даёт оптимизация маршрута?", options: ["Больше расхода топлива", "Опоздания", "Экономию времени и затрат", "Ничего"] } },
];

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/** Skills (from any list) that have at least one matching question. */
export function getVerifiableSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of skills) {
    if (!s) continue;
    if (seen.has(s)) continue;
    if (detectCategory(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

/**
 * Pick one question for a skill, avoiding already-used question ids.
 * Deterministic per (skill + usedIds) so re-renders are stable.
 */
export function pickQuestionForSkill(
  skill: string,
  usedIds: Set<string>,
): VerificationQuestion | null {
  const category = detectCategory(skill);
  if (!category) return null;
  const inCategory = QUESTION_BANK.filter((q) => q.category === category);
  if (!inCategory.length) return null;

  const n = normalize(skill);
  // 1) Prefer a question that actually mentions this exact skill (e.g. "Python",
  //    "Excel", "Instagram") so the question matches the skill, not just the area.
  const skillMatch = inCategory.find(
    (q) => !usedIds.has(q.id) && normalize(q.uz.q).includes(n),
  );
  if (skillMatch) return skillMatch;

  // 2) Otherwise a stable unused question from the same category.
  const unused = inCategory.filter((q) => !usedIds.has(q.id));
  const list = unused.length ? unused : inCategory;
  return list[skill.length % list.length];
}

export const MAX_QUESTIONS_PER_SESSION = 3;
