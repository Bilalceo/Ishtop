"use client";

/**
 * Terms of use.
 *
 * Written against what the product actually does: it aggregates listings from
 * public Telegram channels, routes the candidate to the employer's own contact
 * rather than mediating, sells one enforced quota (auto-apply, 50 per month at
 * 25 000 so'm — see src/lib/plans.ts), and generates AI output the user is
 * responsible for checking.
 *
 * An accurate description of the service, not legal advice; not reviewed by a
 * lawyer.
 */

import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { useTranslation } from "@/hooks/useTranslation";
import { AUTO_APPLY_PER_MONTH, PLAN_PRICES_UZS } from "@/lib/plans";

const SUPPORT_EMAIL = "support@ishtop.uz";
const price = PLAN_PRICES_UZS.premium.monthly.toLocaleString("ru-RU").replace(/,/g, " ");

const uz: LegalSection[] = [
  {
    heading: "Xizmat nima va nima emas",
    body: [
      "IshTop — vakansiyalarni bir joyga to'playdigan va rezyume, moslik hamda suhbatga tayyorgarlik uchun AI vositalarini beradigan platforma.",
      "IshTop ish beruvchi emas, kadrlar agentligi emas va vositachi emas. Ishga qabul qilish to'g'risidagi qarorni faqat ish beruvchi qabul qiladi. Biz ish topishni kafolatlamaymiz.",
    ],
  },
  {
    heading: "Hisob",
    body: [
      "Ro'yxatdan o'tish uchun to'g'ri ma'lumot berishingiz kerak. Hisobingiz va parolingiz xavfsizligi uchun javobgarsiz.",
      "Agar siz 18 yoshga to'lmagan bo'lsangiz, platformadan ota-onangiz yoki vasiyingiz roziligi bilan foydalaning.",
      "Bitta shaxs uchun bitta hisob. Boshqa odamning nomidan hisob ochish taqiqlanadi.",
    ],
  },
  {
    heading: "Vakansiya ma'lumoti",
    body: [
      "Katalogdagi e'lonlarning bir qismi ochiq Telegram kanallaridan yig'iladi. Biz faqat aloqa ma'lumoti ko'rsatilgan e'lonlarni chop etamiz va matnni o'zgartirmaymiz.",
      "Shuning uchun e'londagi maosh, talablar yoki aloqa ma'lumotining to'g'riligiga kafolat bera olmaymiz — ular e'lon muallifining so'zlari.",
      "Ish beruvchi bilan bog'lanishdan oldin uni o'zingiz tekshiring. Ishga joylashish uchun sizdan pul, karta ma'lumoti yoki hujjat garovi so'ralsa — bu firibgarlik. Darhol to'xtating va bizga xabar bering: " + SUPPORT_EMAIL + ".",
    ],
  },
  {
    heading: "Ariza berish",
    body: [
      "Ariza berganingizda siz ish beruvchiga to'g'ridan-to'g'ri murojaat qilasiz — uning telefoni, Telegram username'i yoki elektron pochtasi orqali. IshTop bu yozishmada ishtirok etmaydi.",
      "Ish beruvchining javob berishi yoki bermasligi bizga bog'liq emas. E'lon olib tashlansa, arizangiz yopilgan deb belgilanadi.",
    ],
  },
  {
    heading: "AI natijalari",
    body: [
      "Rezyume, motivatsion xat, moslik foizi va suhbat savollari sun'iy intellekt yordamida yaratiladi va xato bo'lishi mumkin.",
      "Ish beruvchiga yuboriladigan har qanday hujjatni yuborishdan oldin o'zingiz tekshirib chiqing. Rezyumedagi ma'lumotning to'g'riligi uchun javobgarlik sizda.",
      "Moslik foizi — bu tavsiya, kafolat emas. U rezyumengiz va e'lon matnini taqqoslash natijasidir.",
    ],
  },
  {
    heading: "Bepul va pullik tariflar",
    body: [
      "Vakansiyalar katalogi, AI rezyume, suhbat murabbiyi va ish beruvchiga ariza berish — bepul tarifda mavjud.",
      `Premium tarif oyiga ${price} so'm turadi va avto-ariza funksiyasini qo'shadi: oyiga ${AUTO_APPLY_PER_MONTH.premium} tagacha. Hisob har oy boshida yangilanadi.`,
      "Obunani istalgan vaqtda bekor qilishingiz mumkin — keyingi davr boshlanmaydi, to'langan davr esa oxirigacha ishlaydi. Ishlatilgan davr uchun pul qaytarilmaydi.",
      "Narx o'zgarsa, sizga oldindan xabar beramiz va o'zgarish faqat keyingi davrdan boshlab qo'llaniladi.",
    ],
  },
  {
    heading: "Taqiqlanadigan harakatlar",
    body: [
      [
        "Yolg'on ma'lumot bilan rezyume yoki vakansiya joylashtirish.",
        "Boshqa foydalanuvchilarning ma'lumotlarini yig'ish yoki ularga spam yuborish.",
        "Platformani avtomatlashtirilgan vositalar bilan ortiqcha yuklash yoki himoya choralarini chetlab o'tish.",
        "Ish izlovchilardan pul undirish yoki firibgarlik maqsadida e'lon joylashtirish.",
        "Qonunga zid yoki kamsituvchi mazmun joylashtirish.",
      ],
      "Bu qoidalar buzilsa, hisobni ogohlantirishsiz to'xtatishimiz mumkin.",
    ],
  },
  {
    heading: "Javobgarlik chegarasi",
    body: [
      "Platforma \"qanday bo'lsa shundayligicha\" taqdim etiladi. Uzilishlar, xatolar yoki uchinchi tomon e'lonidagi noto'g'ri ma'lumot natijasida yuzaga kelgan zarar uchun javobgar emasmiz.",
      "Har qanday holatda javobgarligimiz siz so'nggi 12 oyda to'lagan summadan oshmaydi.",
    ],
  },
  {
    heading: "Tugatish",
    body: [
      "Hisobingizni istalgan vaqtda sozlamalardan o'chirishingiz mumkin.",
      "Qoidalar buzilgan yoki qonun talab qilgan hollarda biz ham hisobni to'xtatishimiz mumkin.",
    ],
  },
  {
    heading: "O'zgarishlar, qo'llaniladigan huquq va aloqa",
    body: [
      "Shartlar o'zgarsa, yuqoridagi sana yangilanadi; jiddiy o'zgarishlar haqida xabar beramiz.",
      "Ushbu shartlarga O'zbekiston Respublikasi qonunchiligi qo'llaniladi.",
      "Savollar: " + SUPPORT_EMAIL,
    ],
  },
];

const ru: LegalSection[] = [
  {
    heading: "Что такое сервис и чем он не является",
    body: [
      "IshTop — платформа, которая собирает вакансии в одном месте и даёт AI-инструменты для резюме, подбора и подготовки к собеседованию.",
      "IshTop не является работодателем, кадровым агентством или посредником. Решение о найме принимает только работодатель. Мы не гарантируем трудоустройство.",
    ],
  },
  {
    heading: "Аккаунт",
    body: [
      "При регистрации нужно указывать достоверные данные. Вы отвечаете за сохранность аккаунта и пароля.",
      "Если вам меньше 18 лет, пользуйтесь платформой с согласия родителя или опекуна.",
      "Один аккаунт на человека. Регистрация от чужого имени запрещена.",
    ],
  },
  {
    heading: "Информация о вакансиях",
    body: [
      "Часть объявлений собирается из открытых Telegram-каналов. Мы публикуем только объявления с указанным контактом и не меняем их текст.",
      "Поэтому мы не можем гарантировать достоверность зарплаты, требований или контактов — это слова автора объявления.",
      "Проверяйте работодателя самостоятельно. Если за трудоустройство просят деньги, данные карты или оригиналы документов в залог — это мошенничество. Прекратите общение и сообщите нам: " + SUPPORT_EMAIL + ".",
    ],
  },
  {
    heading: "Отклики",
    body: [
      "Откликаясь, вы обращаетесь к работодателю напрямую — по телефону, в Telegram или по почте. IshTop в этой переписке не участвует.",
      "Ответит работодатель или нет — от нас не зависит. Если объявление снимут, ваш отклик будет помечен как закрытый.",
    ],
  },
  {
    heading: "Результаты AI",
    body: [
      "Резюме, сопроводительные письма, процент соответствия и вопросы для собеседования создаются искусственным интеллектом и могут содержать ошибки.",
      "Проверяйте любой документ перед отправкой работодателю. Ответственность за достоверность данных в резюме остаётся на вас.",
      "Процент соответствия — это рекомендация, а не гарантия. Он получен сравнением вашего резюме с текстом объявления.",
    ],
  },
  {
    heading: "Бесплатный и платный тарифы",
    body: [
      "Каталог вакансий, AI-резюме, тренажёр собеседования и отклик работодателю доступны на бесплатном тарифе.",
      `Premium стоит ${price} сум в месяц и добавляет авто-отклик: до ${AUTO_APPLY_PER_MONTH.premium} в месяц. Счётчик обнуляется в начале месяца.`,
      "Подписку можно отменить в любой момент — следующий период не начнётся, а оплаченный доработает до конца. За использованный период возврат не производится.",
      "Если цена изменится, мы сообщим заранее, и изменение вступит в силу только со следующего периода.",
    ],
  },
  {
    heading: "Запрещённые действия",
    body: [
      [
        "Публиковать резюме или вакансии с ложной информацией.",
        "Собирать данные других пользователей или рассылать им спам.",
        "Перегружать платформу автоматизированными средствами или обходить защиту.",
        "Требовать деньги с соискателей или размещать объявления с целью мошенничества.",
        "Размещать незаконный или дискриминирующий контент.",
      ],
      "При нарушении этих правил мы можем заблокировать аккаунт без предупреждения.",
    ],
  },
  {
    heading: "Ограничение ответственности",
    body: [
      "Платформа предоставляется «как есть». Мы не отвечаем за ущерб из-за перебоев, ошибок или недостоверных данных в стороннем объявлении.",
      "В любом случае наша ответственность не превышает суммы, уплаченной вами за последние 12 месяцев.",
    ],
  },
  {
    heading: "Прекращение",
    body: [
      "Вы можете удалить аккаунт в настройках в любой момент.",
      "Мы также можем приостановить аккаунт при нарушении правил или по требованию закона.",
    ],
  },
  {
    heading: "Изменения, применимое право и контакты",
    body: [
      "Если условия изменятся, дата выше будет обновлена; о существенных изменениях сообщим.",
      "К этим условиям применяется законодательство Республики Узбекистан.",
      "Вопросы: " + SUPPORT_EMAIL,
    ],
  },
];

export default function TermsPage() {
  const { locale } = useTranslation();
  const isRu = locale === "ru";

  return (
    <LegalPage
      title={isRu ? "Условия использования" : "Foydalanish shartlari"}
      updated={isRu ? "Обновлено: 16 сентября 2026" : "Yangilangan: 2026-yil 16-sentabr"}
      intro={
        isRu
          ? "Коротко: мы собираем вакансии и даём AI-инструменты, но не нанимаем и не выступаем посредником. Проверяйте работодателя и то, что генерирует AI."
          : "Qisqasi: biz vakansiyalarni to'playmiz va AI vositalarini beramiz, lekin ishga olmaymiz va vositachi emasmiz. Ish beruvchini ham, AI yozganini ham o'zingiz tekshiring."
      }
      sections={isRu ? ru : uz}
    />
  );
}
