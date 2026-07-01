# Ishtop — Higgsfield Video Kontent Kiti

Instagram Reels + Telegram uchun AI video/motion dizayn. Higgsfield promptlari **inglizcha**
(AI ingliz promptni yaxshi tushunadi), izohlar o'zbekcha.

> **Yo'l A** — kontent yasash (kod kerak emas). Higgsfield saytida prompt yozib video
> generatsiya qilasan → CapCut/Canva'da logo+matn qo'shasan → Instagram/Telegramga qo'yasan.

---

## ⚙️ Texnik asos (har doim shu)

| Parametr | Qiymat | Nega |
|----------|--------|------|
| Format | 9:16 (vertical) | Reels/Stories/TikTok |
| Uzunlik | 5–8 son | Reels hook 3 sonda bo'lishi shart |
| Model | Kling 3.0 / Veo 3.1 (harakat), Sora 2 (murakkab sahna) | Kling — motion uchun barqaror |
| Rejim | Image-to-Video (logo/dizaynli kadrdan) > Text-to-Video | Brendda matn/logo aniq chiqadi |
| Ovoz | Seed Audio yoki CapCut'da trend musiqa | Reels algoritmi trend audioni yoqtiradi |

> **Muhim:** Higgsfield videoga aniq matn/logo yozolmaydi (harflar buziladi).
> (1) Higgsfield'da fon/harakat yasa → (2) CapCut/Canva'da ustidan Ishtop logo + matn qo'sh.

---

## 🔵 A. Brend videolari (Ishtop reklamasi)

### Konsept 1 — "Ishsizlikdan → ishga" (hissiy hook)
```
A young Uzbek man sitting alone in a dim room looking at his phone with worried
expression, then the scene smoothly transitions as warm golden light fills the room,
he stands up smiling with confidence. Cinematic, shallow depth of field, 50mm lens,
slow push-in camera movement, emotional warm color grading, 9:16 vertical.
```
CapCut: boshida "Ish topolmayapsizmi?" → oxirida "Ishtop bilan — 3 daqiqada" + logo.

### Konsept 2 — "Motion logo intro" (5 son, har videoning boshiga)
```
Minimalist logo reveal animation, geometric shapes assembling into a modern app icon,
clean blue and white gradient background, smooth motion graphics, particles flowing,
premium tech startup aesthetic, soft studio lighting, 9:16 vertical.
```
Foyda: shu 5 sonlik intro'ni HAR videoning boshiga qo'y → brend tanilishi.

### Konsept 3 — "Telefonda app demo" (kinematik)
```
Close-up cinematic shot of hands holding a smartphone showing a sleek job-search app
interface, screen glowing, camera slowly orbits around the phone, blurred modern office
background, professional lighting, depth of field, 9:16 vertical.
```
CapCut: ekran ustiga haqiqiy Ishtop skrinshotini qo'y (screen replace).

---

## 🟢 B. Vakansiya videolari (top jobs)

### Konsept 4 — "Haftaning top vakansiyalari" (haftalik seriya)
```
Dynamic motion graphics background with floating cards and job icons, blue and teal
gradient, smooth parallax movement, modern corporate style, particles and light rays,
energetic but professional, 9:16 vertical.
```
CapCut: ustiga 3–5 vakansiya (lavozim + maosh + kompaniya) chiqadi. Har hafta shu shablon, matn almashadi.

### Konsept 5 — "Kasb spotlight" (masalan: dasturchi)
```
A confident young software developer working at a modern desk with multiple monitors
showing code, warm office lighting, camera slowly pushes in, cinematic tech atmosphere,
teal and orange color grade, shallow depth of field, 9:16 vertical.
```
Foyda: har kasb uchun bittadan → "IT", "Marketing", "Sotuv" seriyasi.

### Konsept 6 — "Maosh reveal" (viral hook)
```
Cinematic close-up of hands counting cash money that transforms into rising numbers
and coins floating upward, dark background with golden bokeh light, satisfying smooth
motion, luxury feel, 9:16 vertical.
```
CapCut: "Bu kasb qancha to'laydi? 👀" → maosh raqami reveal.

---

## 🎯 Umumiy prompt formulasi (yangi yasash uchun)

```
[KIM/NIMA] + [NIMA QILYAPTI] + [KAMERA HARAKATI] + [YORUG'LIK/MUHIT] + [STIL/RANG] + 9:16 vertical
```

- Kamera harakati (motion kaliti): `slow push-in`, `orbit around`, `dolly out`, `crane up`, `whip pan`, `parallax`
- Stil kalit so'zlari: `cinematic`, `shallow depth of field`, `50mm lens`, `color grading`, `bokeh`, `motion graphics`
- Viral Presets: "Zoom Blast", "3D Rotation", "Crash Zoom" — hook uchun zo'r

---

## 📅 Boshlash plani (1-hafta)
1. Konsept 2 (logo intro) yasab qo'y — barcha videolarda ishlatasan
2. Konsept 4 (top vakansiyalar) shablonini yasab, birinchi haftalik post chiqar
3. 3–4 xil stilni sinab ko'r, qaysi biri ko'p ko'rilishini kuzat
4. Ishlaydigan formula topilsa → Yo'l B (backend + Instagram API avtomatlashtirish) rejasi

---

## 🔮 Keyingi bosqich (Yo'l B — avtomatlashtirish)
Ishlaydigan formula topilgach: Higgsfield video API + Instagram Graph API'ni Ishtop
backend'iga ulash → vakansiya joylanganda avto promo video + avto-post.
Ogohlantirish: video sekin (1–3 daq) va qimmat (~$0.5–2/video); Instagram avto-posting
Business akkaunt + Facebook Developer app review talab qiladi.
