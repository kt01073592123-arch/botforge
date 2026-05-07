// 6 ta vertical pack + 2 horizontal template’ni DB’ga yozadi.
// node scripts/seed-packs.mjs

import postgres from "postgres";

const sql = postgres(
  process.env.DATABASE_URL ??
    "postgresql://neondb_owner:npg_hn0wt1HLeJBT@ep-broad-breeze-al9i4b3p-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  { ssl: "require", max: 1 }
);

// ───── Umumiy yordamchilar ─────
const TIERS = [
  { id: "budget", name: "Hamyonbop", multiplier: 0.6 },
  { id: "mid", name: "O‘rtacha", multiplier: 1.0 },
  { id: "premium", name: "Premium", multiplier: 1.5 },
  { id: "luxury", name: "Lyuks", multiplier: 2.5 },
];

const TONES_BEAUTY = [
  {
    id: "formal",
    name: "Rasmiy",
    prompt_addon:
      "Ohangingiz rasmiy va professional. Sizlash bilan murojaat qil. Ortiqcha emoji ishlatma (1-2 ta yetadi).",
  },
  {
    id: "friendly",
    name: "Iliq",
    prompt_addon:
      "Ohangingiz iliq, do‘stona. Sizlash bilan, lekin yumshoq. 2-4 ta nozik emoji (✨🤍💫) ishlatish mumkin.",
  },
  {
    id: "luxury",
    name: "Lyuks",
    prompt_addon:
      "Ohangingiz lyuks, badiiy va nafis. Mijozni mehmondek qabul qil. Tanlangan so‘zlar, ortiqcha qisqartmasiz. Emojilar minimal va estetik (✨🤍).",
  },
];

const TONES_GENERIC = [
  {
    id: "formal",
    name: "Rasmiy",
    prompt_addon: "Ohangingiz rasmiy va professional. Sizlash bilan murojaat qil.",
  },
  {
    id: "friendly",
    name: "Iliq",
    prompt_addon: "Ohangingiz iliq va do‘stona. Yumshoq sizlash.",
  },
];

const PACKS = [
  // ════════════════════════════════════════════
  // 1. LASH STUDIO
  // ════════════════════════════════════════════
  {
    id: "lash_studio",
    is_pack: true,
    vertical: "lash",
    category: "beauty",
    name: "Lash Studio",
    icon: "👁️",
    description:
      "Klassik · 2D-3D · Lifting · Brow. Kipriklar va qoshlarga ixtisoslashgan biznes uchun to‘liq tayyor pack.",
    default_welcome:
      "Salom! Lash Studiomizga xush kelibsiz 🤍 Qanday xizmatga qiziqdingiz?",
    default_buttons: [
      { text: "Xizmatlar va narxlar" },
      { text: "Bo‘sh vaqt ko‘rish" },
      { text: "Bron qilish" },
      { text: "Manzil va aloqa" },
      { text: "Operator bilan bog‘lanish" },
    ],
    sub_types: [
      {
        id: "solo",
        name: "Yakka master",
        description: "Uyda yoki kabinetda yakka ishlovchi master",
        icon: "🏠",
        prompt_addon:
          "Sen yakka lash master administratorisan. O‘zingni ‘men’ deb gapir, kabinet/uyda ishlaganingni unutma. Vaqt cheklov bor — kuniga 4-6 mijoz qabul qila olasan.",
      },
      {
        id: "studio",
        name: "Lash Studio",
        description: "1-3 master, alohida joy",
        icon: "🏢",
        prompt_addon:
          "Sen lash studio administratorisan. Studioda bir nechta master ishlaydi, har biri o‘z grafigi bilan. Mijoz ‘qaysi master’ deb so‘rasa, biznes nomini ayt va ‘bron qilingan vaqtga eng mos master tayinlanadi’ de.",
      },
      {
        id: "salon_dept",
        name: "Salon ichida bo‘lim",
        description: "Umumiy salon ichidagi lash bo‘limi",
        icon: "🏛️",
        prompt_addon:
          "Sen salon ichidagi lash bo‘limi administratorisan. Salonda boshqa xizmatlar ham bor (manikur, soch va h.k.) — lash bo‘limidan tashqarisiga ‘admindan so‘rang’ deb yo‘nalt.",
      },
    ],
    price_tiers: TIERS,
    tones: TONES_BEAUTY,
    brand_kit: {
      primary_color: "#F4C2C2",
      accent_color: "#B76E79",
      background_tint: "#FFF5F7",
      text_on_primary: "#2C1810",
      emoji_set: ["🤍", "✨", "💫", "🌸", "🪷"],
      font_hint: "elegant",
      gradient: "linear-gradient(135deg, #FFE5EC 0%, #FFC2D1 100%)",
    },
    default_system_prompt: `Sen — beauty lash studiosining muloyim, professional AI administratorisan. Sening vazifang: mijozlar bilan iliq aloqa, xizmatlarni tushuntirish, bron olish va lead yig‘ish.

QOIDALAR:
- Faqat berilgan xizmatlar va narxlardan gapir.
- Yangi narx, yangi xizmat o‘ylab topma. Ishonch past bo‘lsa: «Aniqlashtirib, admin tasdiqlaydi» de.
- Mijozning ismi va telefon raqamini muloyim so‘ra (faqat bron yoki konsultatsiya kerak bo‘lsa).
- Allergiyaga ehtiyot. «Oldin lash qilganmisiz? Reaksiya bo‘lganmi?» savol ber.
- Bron uchun: kun + taxminiy soat + xizmat turi. Telefon olganingdan keyin save_lead chaqir.
- Mijoz «odam bilan gaplashmoqchi» bo‘lsa darhol request_human chaqir.
- Lash haqidagi tibbiy/dori savollariga qaysi javob bersang, oxirida «aniq qoidalar uchun mastergaga konsultatsiya» de.`,
    default_services: [
      { name: "Klassik (1D)", base_price_uzs: 250000, duration: "2 soat" },
      { name: "2D hajm", base_price_uzs: 350000, duration: "2.5 soat" },
      { name: "3D hajm", base_price_uzs: 450000, duration: "3 soat" },
      { name: "Mega volume (5D-7D)", base_price_uzs: 600000, duration: "3.5 soat" },
      { name: "Lash lifting + bo‘yash", base_price_uzs: 300000, duration: "1 soat" },
      { name: "Korrektsiya (3 hafta)", base_price_uzs: 200000, duration: "1.5 soat" },
      { name: "Lashlarni olib tashlash", base_price_uzs: 80000, duration: "30 daqiqa" },
      { name: "Brow architect + bo‘yash", base_price_uzs: 150000, duration: "1 soat" },
      { name: "Brow lamination", base_price_uzs: 250000, duration: "1 soat" },
    ],
    default_faq: [
      {
        q: "Lash qancha turadi?",
        a: "O‘rtacha 3-4 hafta. Sizning kipriklaringizning tabiiy o‘sish davriga bog‘liq. Eng yaxshi natija uchun 3 hafta keyin korrektsiyaga keling.",
      },
      {
        q: "Allergiya bo‘lishi mumkinmi?",
        a: "Yelimimiz hipoallergen. Lekin agar siz oldin yelim/lateksga reaksiya bergan bo‘lsangiz, master ustaga bron paytida albatta aytishingizni so‘raymiz.",
      },
      {
        q: "Lashdan keyin nima qilmaslik kerak?",
        a: "24 soat suvga tegmaslik, 48 soat bug‘/sauna kirmaslik, yog‘li krem ishlatmaslik, kipriklarni ishqalamaslik. To‘liq ko‘rsatmalarni master beradi.",
      },
      {
        q: "Bron qancha oldin qilish kerak?",
        a: "Hafta oldin yaxshi. Juma-shanba kunlari band bo‘ladi, shuning uchun 7-10 kun oldin band qilish tavsiya etiladi.",
      },
      {
        q: "Bekor qilish mumkinmi?",
        a: "24 soat oldin xabar bersangiz bepul. Soat oldin yoki kelmasangiz keyingi seansda 50% to‘lov qo‘llaniladi.",
      },
      {
        q: "To‘lov qaysi shaklda?",
        a: "Naqd, Click, Payme, Uzcard/Humo — barchasi qabul qilinadi.",
      },
      {
        q: "Erkaklar uchun ham qilasizmi?",
        a: "Ha, klassik lash va lash lifting xizmatlari erkaklar uchun ham mavjud.",
      },
    ],
    default_working_hours: {
      mon: [10, 20], tue: [10, 20], wed: [10, 20], thu: [10, 20],
      fri: [10, 20], sat: [10, 20], sun: null,
    },
    default_contacts_template: {
      phone: "+998 __ ___ __ __",
      address: "[Manzilni kiriting]",
      instagram: "[@username]",
    },
    sample_broadcasts: [
      {
        title: "🎁 Yangi yil aksiyasi",
        text:
          "🎁 Yangi yil aksiyasi! 28-dekabrdan 2-yanvargacha 2D + bepul brow architect. Bayram libosingizga mos ko‘zlar uchun ✨\n\nBron: shu botga yozing yoki 📞 telefon orqali.",
        suggested_segment: "all",
      },
      {
        title: "🌸 8-mart sertifikat",
        text:
          "🌸 8-mart yaqinlashmoqda! Onangiz, opa-singlingizga lash sertifikat — eng kutilgan sovg‘a.\n\n50k, 100k, 200k nominalda. Botda buyurtma qoldiring 🤍",
        suggested_segment: "all",
      },
      {
        title: "💝 Tug‘ilgan kun chegirma",
        text:
          "Sizning kuningiz — bizning bayramimiz 💝 Tug‘ilgan kun haftasida BotForge’dan 20% chegirma!\n\nKelishni rejalashtiryapsizmi? Telefonga yozing — biz bron qo‘yib qo‘yamiz.",
        suggested_segment: "leads",
      },
      {
        title: "🌷 Navruz yangilanish",
        text:
          "🌷 Bahor keldi — yangilanish vaqti! 21-martgacha lash + brow seti 15% off.\n\nFaol mijozlarimiz uchun maxsus narx ✨",
        suggested_segment: "converted",
      },
      {
        title: "💌 Sizni sog‘indik",
        text:
          "Salom! Sizni 6 haftadan beri ko‘rmadik 💌\n\nQaytib kelishingizni 25% chegirma bilan kutamiz. Faol bo‘lish 7 kun.",
        suggested_segment: "no_lead",
      },
      {
        title: "📅 Korrektsiya eslatmasi",
        text:
          "Salam! Lashingiz 3 haftaga yaqinlashayotgan bo‘lsa, korrektsiya vaqti yetib keldi 📅\n\nBron qoldirsangiz, eng yaxshi vaqtlarni saqlab qo‘yamiz.",
        suggested_segment: "converted",
      },
    ],
  },

  // ════════════════════════════════════════════
  // 2. SALON FULL-SERVICE
  // ════════════════════════════════════════════
  {
    id: "salon_full",
    is_pack: true,
    vertical: "salon",
    category: "beauty",
    name: "Salon (full-service)",
    icon: "💇",
    description:
      "Soch · Manikur · Pedikur · Epilatsiya · Makiyaj. To‘liq beauty salon uchun pack.",
    default_welcome:
      "Salom! Salonimizga xush kelibsiz 💇‍♀️ Qaysi xizmatga qiziqasiz?",
    default_buttons: [
      { text: "Soch xizmatlari" },
      { text: "Manikur va pedikur" },
      { text: "Makiyaj va styling" },
      { text: "Bron qilish" },
      { text: "Operator" },
    ],
    sub_types: [
      {
        id: "express",
        name: "Express barbershop/nail bar",
        description: "1-2 yo‘nalishga ixtisoslashgan",
        icon: "⚡",
        prompt_addon: "Sen express salon administratorisan. Tezkor xizmat asosiy farqing.",
      },
      {
        id: "full_service",
        name: "Full-service salon",
        description: "Soch + manikur + epilatsiya hammasi bir joyda",
        icon: "💎",
        prompt_addon:
          "Sen full-service salon administratorisan. Mijoz bir joyda hamma narsani ola olishini ta’kidla.",
      },
      {
        id: "premium",
        name: "Premium beauty studio",
        description: "Lyuks xizmatlar, tanlangan brendlar",
        icon: "✨",
        prompt_addon:
          "Sen premium salon administratorisan. Sifatli brendlar, professional masterlar — bu sizning farqingiz.",
      },
    ],
    price_tiers: TIERS,
    tones: TONES_BEAUTY,
    brand_kit: {
      primary_color: "#F7E7CE",
      accent_color: "#8B0000",
      background_tint: "#FFFAF0",
      text_on_primary: "#2C1810",
      emoji_set: ["💇‍♀️", "💅", "✨", "👑"],
      font_hint: "classic",
      gradient: "linear-gradient(135deg, #FFF8DC 0%, #F7E7CE 100%)",
    },
    default_system_prompt: `Sen — beauty salonning professional AI administratorisan. Soch, manikur, makiyaj — barcha xizmatlar bo‘yicha mijozga yordam berasan.

QOIDALAR:
- Faqat berilgan xizmatlar va narxlardan gapir.
- Soch bo‘yashi uchun birinchi mijozga test tavsiya etiladi.
- Bron uchun: kun, soat, xizmat — barchasini qisqa va aniq so‘ra.
- Telefon olib save_lead chaqir.
- Mijoz «qaysi master» deb so‘rasa: «Bron qilingan vaqtga eng tajribali master tayinlanadi» yoki ustani aniq biznes nomidan ber.
- Toy/tantana paketlari haqida so‘rasalar batafsil ber, qiziqsa save_lead.`,
    default_services: [
      { name: "Soch olish (ayollar)", base_price_uzs: 150000, duration: "45 daq" },
      { name: "Soch olish (erkaklar)", base_price_uzs: 80000, duration: "30 daq" },
      { name: "Soch bo‘yash (1 ton)", base_price_uzs: 350000, duration: "2 soat" },
      { name: "Ombre/Balayage", base_price_uzs: 600000, duration: "3 soat" },
      { name: "Soch tushirish (botoks)", base_price_uzs: 400000, duration: "2 soat" },
      { name: "Manikur klassik", base_price_uzs: 100000, duration: "45 daq" },
      { name: "Apparat manikur + shellak", base_price_uzs: 180000, duration: "1.5 soat" },
      { name: "Pedikur (klassik + lak)", base_price_uzs: 200000, duration: "1.5 soat" },
      { name: "Epilatsiya (oyoq to‘liq, shakar)", base_price_uzs: 250000, duration: "1 soat" },
      { name: "Sahnaga makiyaj + soch", base_price_uzs: 700000, duration: "2 soat" },
      { name: "Toy paketi (makiyaj + soch + manikur)", base_price_uzs: 1200000, duration: "4 soat" },
    ],
    default_faq: [
      {
        q: "Bron qancha oldin qilish kerak?",
        a: "Oddiy xizmatlar uchun 2-3 kun, toy/sahna paketi uchun 1-2 hafta oldin tavsiya etiladi.",
      },
      {
        q: "Soch bo‘yashdan oldin test kerakmi?",
        a: "Birinchi marta yoki teri sezgir bo‘lsa, biz 24 soat oldin allergiya testini tavsiya etamiz.",
      },
      {
        q: "Manikur shellak qancha turadi?",
        a: "2-3 hafta. Apparat manikur + shellak eng uzun chidaydi.",
      },
      {
        q: "Qaysi brendlar bilan ishlaysizlar?",
        a: "Sertifikatlangan professional brendlar: CND, Kodi, Estel, Wella, Loreal.",
      },
      {
        q: "Toy paketi narxi qancha?",
        a: "Asosiy paket 1.2M dan boshlanadi (makiyaj + soch + manikur). Aniq narx libos va idealni ko‘rib aytamiz.",
      },
      {
        q: "Erkaklar uchun alohida xizmatlar bormi?",
        a: "Ha, soch olish, soqol formati, manikur barbershop uslubida — barchasi mavjud.",
      },
    ],
    default_working_hours: {
      mon: [9, 21], tue: [9, 21], wed: [9, 21], thu: [9, 21],
      fri: [9, 21], sat: [9, 21], sun: [10, 20],
    },
    default_contacts_template: {
      phone: "+998 __ ___ __ __",
      address: "[Manzilni kiriting]",
      instagram: "[@username]",
    },
    sample_broadcasts: [
      {
        title: "🎉 Yangi yil paketi",
        text:
          "🎉 Yangi yil bayramiga tayyorlanmoqdamisiz?\n\nBayram paketi: makiyaj + soch + manikur — 1M so‘mdan boshlab. Joylar cheklangan, bron olib qo‘ying 💎",
        suggested_segment: "all",
      },
      {
        title: "🌸 8-mart toy paketi",
        text:
          "🌸 8-mart yaqin! Onangiz/opangiz uchun beauty paket sertifikati 200k, 500k, 1M nominalda mavjud.\n\nBuyurtma uchun shu botda yozing.",
        suggested_segment: "all",
      },
      {
        title: "💎 Yangi mijozga 15%",
        text:
          "Birinchi tashrif uchun maxsus narx — har qanday xizmatga 15% chegirma 💎\n\nBron qilish uchun 'Bron' ni bosing.",
        suggested_segment: "no_lead",
      },
      {
        title: "💝 Tug‘ilgan kun",
        text:
          "Sizning oyingizda tug‘ilgansiz? 💝 Salonda 25% chegirma + bepul shellak (manikur bilan birga).\n\nBron tugmasini bosing.",
        suggested_segment: "leads",
      },
      {
        title: "📅 Soch bo‘yash eslatmasi",
        text:
          "Soch ildizingiz ko‘rina boshladimi? 📅\n\nBron qoldirsangiz, sizning master uchun mos vaqtni saqlab qo‘yamiz.",
        suggested_segment: "converted",
      },
    ],
  },

  // ════════════════════════════════════════════
  // 3. KOSMETOLOG
  // ════════════════════════════════════════════
  {
    id: "kosmetolog",
    is_pack: true,
    vertical: "kosmetolog",
    category: "beauty",
    name: "Kosmetolog kabineti",
    icon: "✨",
    description:
      "Yuz tozalash · Peeling · Mezo · RF-lifting. Kosmetolog kabineti uchun professional pack.",
    default_welcome:
      "Salom! Kabinetimizga xush kelibsiz ✨ Qaysi muammoga yechim izlayapsiz — yoki qaysi xizmatga qiziqasiz?",
    default_buttons: [
      { text: "Yuz tozalash" },
      { text: "Peeling" },
      { text: "Mezoterapiya / Bioreviltal" },
      { text: "Bepul konsultatsiya" },
      { text: "Operator" },
    ],
    sub_types: [
      {
        id: "solo",
        name: "Yakka kosmetolog",
        description: "Kabinet ichida yakka master",
        icon: "👩‍⚕️",
        prompt_addon:
          "Sen yakka kosmetolog administratorisan. Bitta master, bitta kabinet — vaqt nazoratli. Konsultatsiyani majburiy qil.",
      },
      {
        id: "clinic",
        name: "Kosmetologiya markazi",
        description: "Bir necha mutaxassis, kompleks xizmatlar",
        icon: "🏥",
        prompt_addon:
          "Sen kosmetologiya markazi administratorisan. Markazda bir necha mutaxassis bor — har biri o‘z yo‘nalishi (peeling, mezo, apparat) bo‘yicha.",
      },
    ],
    price_tiers: TIERS,
    tones: [
      ...TONES_GENERIC,
      {
        id: "medical",
        name: "Tibbiy",
        prompt_addon:
          "Ohang tibbiy va aniq. Tibbiy savollarda «konsultatsiyada aniqlashtiramiz» de. Va’da bermay, real natija haqida gapir.",
      },
    ],
    brand_kit: {
      primary_color: "#E8F0F2",
      accent_color: "#5DADE2",
      background_tint: "#F0F8FA",
      text_on_primary: "#1A3A4A",
      emoji_set: ["✨", "🌿", "💧", "🪷"],
      font_hint: "clinical",
      gradient: "linear-gradient(135deg, #E8F0F2 0%, #B8DCE6 100%)",
    },
    default_system_prompt: `Sen — kosmetologiya kabinetining professional AI administratorisan. Yuz, teri, anti-aging xizmatlari bo‘yicha mijozga yordam berasan.

QOIDALAR:
- Tibbiy va’da berma. Aniq natija/muddat «individual» de.
- Procedurali oldin/keyin qoidalar muhim — har savolda ularni eslatma.
- Hayz vaqti, homiladorlik, surunkali kasallik haqida so‘rab tur, kerak bo‘lsa konsultatsiyaga taklif qil.
- Birinchi kelganlarga BEPUL konsultatsiya tavsiya qil.
- save_lead da request maydoniga muammoni yoz (akne / qarish / dog‘ va h.k).
- Procedurali kombinatsiyasi haqida savollar bo‘lsa: «konsultatsiyada teri turingizga moslashtiramiz» de.`,
    default_services: [
      { name: "Bepul konsultatsiya", base_price_uzs: 0, duration: "30 daq" },
      { name: "Yuz tozalash (mexanik)", base_price_uzs: 250000, duration: "1 soat" },
      { name: "Yuz tozalash + ultratovush", base_price_uzs: 350000, duration: "1.5 soat" },
      { name: "Karbon peeling (Hollywood)", base_price_uzs: 400000, duration: "1 soat" },
      { name: "Kimyoviy peeling (sirtqi)", base_price_uzs: 500000, duration: "45 daq" },
      { name: "Kimyoviy peeling (medium)", base_price_uzs: 800000, duration: "1 soat" },
      { name: "Mezoterapiya (yuz)", base_price_uzs: 600000, duration: "1 soat" },
      { name: "Bioreviltalizatsiya", base_price_uzs: 1200000, duration: "1 soat" },
      { name: "Botoks (Allergan, 1 zona)", base_price_uzs: 1500000, duration: "30 daq" },
      { name: "RF-lifting (1 seans)", base_price_uzs: 450000, duration: "1 soat" },
      { name: "Yuz massaj (lifting)", base_price_uzs: 200000, duration: "45 daq" },
    ],
    default_faq: [
      {
        q: "Procedurali oldin nima qilmaslik kerak?",
        a: "2 hafta quyoshda yotmaslik, soliarii yo‘q, yangi kosmetik mahsulot ishlatishni boshlamang. Aniq qoidalar har turga qarab — konsultatsiyada beramiz.",
      },
      {
        q: "Procedurali keyin?",
        a: "24 soat krem yo‘q (faqat ko‘rsatilgan), 48 soat bug‘/sauna/quyosh yo‘q. SPF 50+ majburiy 2 hafta davomida.",
      },
      {
        q: "Hayz vaqtida procedurali bo‘ladimi?",
        a: "Mezoterapiya, peeling kabi inyeksion va og‘riqli procedurali tavsiya etilmaydi. Konsultatsiyada aniqlashtiramiz.",
      },
      {
        q: "Effekt qachondan ko‘rinadi?",
        a: "Yuz tozalash darhol, peeling 5-7 kun, mezo 2-3 hafta. Optimal natija uchun ko‘pincha 3-5 seans kerak.",
      },
      {
        q: "Yosh chegarasi bormi?",
        a: "Yuz tozalash 16+, peeling/mezo odatda 25+, anti-aging procedurali 30+. Konsultatsiyada teri holatiga qarab.",
      },
      {
        q: "Mezo qanday tarkibda?",
        a: "Sertifikatlangan brendlar (Filorga, Restylane, Mesopharm). Tarkibni teringiz va muammoga qarab tanlaymiz.",
      },
      {
        q: "Bepul konsultatsiya nimani o‘z ichiga oladi?",
        a: "Teri tahlili, muammo aniqlash, individual procedurali rejasi. 30 daqiqa, hech qanday majburiyatsiz.",
      },
    ],
    default_working_hours: {
      mon: [10, 19], tue: [10, 19], wed: [10, 19], thu: [10, 19],
      fri: [10, 19], sat: [10, 18], sun: null,
    },
    default_contacts_template: {
      phone: "+998 __ ___ __ __",
      address: "[Manzilni kiriting]",
      instagram: "[@username]",
    },
    sample_broadcasts: [
      {
        title: "✨ Bepul konsultatsiya kuni",
        text:
          "Bu hafta — bepul konsultatsiya kunlari ✨\n\nTeri tahlili + individual reja, hech qanday majburiyatsiz. Bron uchun bot menyusini bosing.",
        suggested_segment: "no_lead",
      },
      {
        title: "🌸 Bahor seriyasi (3 seans)",
        text:
          "🌸 Bahor seriyasi — bahor 3 seans peeling 1.2M dan boshlab (10% tejaysiz).\n\nQaysi yo‘nalish (akne, qarish, dog‘) — botda yozing, mos rejani yuboramiz.",
        suggested_segment: "all",
      },
      {
        title: "💎 Doimiy mijoz uchun",
        text:
          "Sizga rahmat 💎 Doimiy mijozlarimiz uchun: 5-seansdan keyin har 6-si BEPUL.\n\nProgrammaga qo‘shilish — botga yozing.",
        suggested_segment: "converted",
      },
      {
        title: "📅 Keyingi seans",
        text:
          "Salom! Keyingi seansingiz vaqti yaqinlashmoqda 📅\n\nKursni to‘g‘ri davom ettirish — natijaning kaliti. Bron uchun yozing.",
        suggested_segment: "converted",
      },
    ],
  },

  // ════════════════════════════════════════════
  // 4. RESTORAN / CAFÉ
  // ════════════════════════════════════════════
  {
    id: "restoran",
    is_pack: true,
    vertical: "restoran",
    category: "food",
    name: "Restoran / Café",
    icon: "🍽️",
    description:
      "Menyu · Yetkazib berish · Stol bron · Aksiyalar. Café/restoran uchun pack.",
    default_welcome: "Salom! Bizga xush kelibsiz 🍽️ Bugun nima yegingiz keldi?",
    default_buttons: [
      { text: "Menyu ko‘rish" },
      { text: "Yetkazib berish" },
      { text: "Stol bron qilish" },
      { text: "Aksiyalar" },
      { text: "Manzil va ish vaqti" },
    ],
    sub_types: [
      {
        id: "cafe",
        name: "Café / kichik joy",
        description: "Qahvaxona, dessert bar, snack",
        icon: "☕",
        prompt_addon: "Sen café administratorisan. Iliq, do‘stona ohang.",
      },
      {
        id: "restoran",
        name: "Restoran",
        description: "To‘liq menyuli restoran, stol bron muhim",
        icon: "🍽️",
        prompt_addon:
          "Sen restoran administratorisan. Stol bron va yetkazib berishni tartibli bajarib ber. Menyu — asosiy ahamiyat.",
      },
      {
        id: "fastfood",
        name: "Fast-food / Pizza",
        description: "Tezkor xizmat, yetkazib berish dominant",
        icon: "🍕",
        prompt_addon:
          "Sen fast-food administratorisan. Yetkazib berish — eng muhim. Tezda buyurtma to‘plab adminga uzat.",
      },
    ],
    price_tiers: TIERS,
    tones: TONES_GENERIC,
    brand_kit: {
      primary_color: "#E07856",
      accent_color: "#FFFAF0",
      background_tint: "#FFF5EE",
      text_on_primary: "#FFFFFF",
      emoji_set: ["🍽️", "🔥", "🌿", "🥘"],
      font_hint: "warm",
      gradient: "linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)",
    },
    default_system_prompt: `Sen — restoran/café administratorisan. Mijozni iliq qabul qil, menyu va yetkazib berish bo‘yicha yordam ber.

QOIDALAR:
- Menyu/narx haqida aniq ma’lumot ber, taklifni shoshilmasdan tushuntir.
- Yetkazib berish: manzil + telefon + buyurtma — uchchovini ol.
- Stol bron: kun, soat, odam soni — uchchovi muhim.
- Halal sertifikat haqida so‘ralsa: berilgan ma’lumotdan javob ber.
- Allergen savollariga: «menyuga qarab aniqlashtirish kerak — admin yuboradi» de.
- save_lead da buyurtma/bron tafsilotlarini request maydoniga yoz.`,
    default_services: [
      { name: "Yetkazib berish 0–5 km", base_price_uzs: 15000 },
      { name: "Yetkazib berish 5–10 km", base_price_uzs: 25000 },
      { name: "Yetkazib berish 10+ km", base_price_uzs: 35000 },
      { name: "200k+ buyurtmaga bepul yetkazish", base_price_uzs: 0 },
      { name: "Stol bron (depozit)", base_price_uzs: 50000 },
      { name: "Yubiley/tantana paketi (10 odam)", base_price_uzs: 1500000 },
    ],
    default_faq: [
      {
        q: "Yetkazib berish qancha vaqt?",
        a: "30–60 daqiqa, transport va masofaga bog‘liq. Buyurtmangiz qabul qilingach kuryer telefonidan tasdiq olasiz.",
      },
      {
        q: "Stol qancha oldin bron?",
        a: "1-2 soat oldin OK, hafta oxirida (juma-shanba) 1 kun oldin yaxshi. Odam soni 10+ bo‘lsa — oldindan kelishamiz.",
      },
      {
        q: "Halal sertifikat bormi?",
        a: "Ha, hamma go‘sht halal manbadan, sertifikat oshxonada yopishgan.",
      },
      {
        q: "Allergen ma’lumotlari?",
        a: "Menyumizda har taom allergen yorlig‘i bilan. Aniq ro‘yxat kerak bo‘lsa, admin yuboradi.",
      },
      {
        q: "To‘lov turi?",
        a: "Naqd, karta yetkazuvchida, Click, Payme, Uzcard/Humo — barchasi mavjud.",
      },
      {
        q: "Yetkazib berish minimum buyurtma?",
        a: "60k. 200k dan yuqori buyurtma — yetkazib berish bepul.",
      },
    ],
    default_working_hours: {
      mon: [10, 23], tue: [10, 23], wed: [10, 23], thu: [10, 23],
      fri: [10, 24], sat: [10, 24], sun: [10, 23],
    },
    default_contacts_template: {
      phone: "+998 __ ___ __ __",
      address: "[Manzilni kiriting]",
      instagram: "[@username]",
    },
    sample_broadcasts: [
      {
        title: "🍕 Hafta oxiri taklif",
        text:
          "🍕 Hafta oxiri sizniki!\n\nJuma-yakshanba: 2-buyurtmaga 20% chegirma. Yetkazib berish 200k+ — bepul.\n\nMenyuni botdan ko‘ring.",
        suggested_segment: "all",
      },
      {
        title: "🎂 Tug‘ilgan kun bonusi",
        text:
          "Tug‘ilgan kun haftasidamisiz? 🎂 Restoran ichida nishonlasangiz — bonusli desert + 15% off umumiy hisobga.\n\nBron qoldiring botda.",
        suggested_segment: "leads",
      },
      {
        title: "🆕 Yangi menyu",
        text:
          "🆕 Yangi taom! Bu hafta menyumizga qo‘shildi: [taom nomi].\n\nIlk 50 buyurtmaga 25% off — tezroq sinab ko‘ring.",
        suggested_segment: "all",
      },
      {
        title: "⏰ Tushlik vaqti tezkor",
        text:
          "⏰ Tushlik (12:00–15:00) — biznes meni 80k. 30 daqiqada yetkazib beramiz.\n\nBugungi taom: [aniqlanmoqda]. Bot orqali buyurtma.",
        suggested_segment: "all",
      },
    ],
  },

  // ════════════════════════════════════════════
  // 5. AVTO SERVIS
  // ════════════════════════════════════════════
  {
    id: "avto_servis",
    is_pack: true,
    vertical: "avto",
    category: "service",
    name: "Avto servis",
    icon: "🔧",
    description:
      "TO · Diagnostika · Kuzov · Shinalar. Avto servis va ta’mirlash uchun pack.",
    default_welcome:
      "Salom! Avto servisimizga xush kelibsiz 🔧 Mashinangiz uchun nima kerak?",
    default_buttons: [
      { text: "Texnik xizmat (TO)" },
      { text: "Diagnostika" },
      { text: "Shinalar / balansirovka" },
      { text: "Kuzov / bo‘yoq" },
      { text: "Bron" },
    ],
    sub_types: [
      {
        id: "general",
        name: "Universal servis",
        description: "Hamma marka, asosiy ish",
        icon: "🛠️",
        prompt_addon: "Sen universal avto servis administratorisan. Hamma markalar bilan ishlaysiz.",
      },
      {
        id: "specialized",
        name: "Marka mutaxassis",
        description: "Bitta marka (BMW, Mercedes va h.k.)",
        icon: "🏷️",
        prompt_addon:
          "Sen marka mutaxassisi servisi administratorisan. Faqat sizning markangiz — boshqa marka kelsa rejext qiling, lekin xushmuomalalik bilan.",
      },
      {
        id: "tire_only",
        name: "Shinalar markazi",
        description: "Faqat shina/disk/balansirovka",
        icon: "🛞",
        prompt_addon: "Sen shina markazi administratorisan. Faqat shina/balansirovka/razval.",
      },
    ],
    price_tiers: TIERS,
    tones: [
      ...TONES_GENERIC,
      {
        id: "technical",
        name: "Texnik",
        prompt_addon:
          "Ohangin texnik va aniq. «Mashinaga qarab aniqlashtirib aytamiz» — odat. Va’da berma.",
      },
    ],
    brand_kit: {
      primary_color: "#2C2C2C",
      accent_color: "#FF6B35",
      background_tint: "#1A1A1A",
      text_on_primary: "#FFFFFF",
      emoji_set: ["🔧", "⚙️", "🚗", "🛠️"],
      font_hint: "industrial",
      gradient: "linear-gradient(135deg, #232526 0%, #414345 100%)",
    },
    default_system_prompt: `Sen — avto servisning AI administratorisan. Mashina va xizmatlar bo‘yicha mijozga yordam berasan.

QOIDALAR:
- Aniq narx faqat mashinani ko‘rgandan keyin — «konkret summa diagnostikadan keyin» de.
- Mijozdan: marka + model + yili + muammoni so‘ra.
- Naqd va karta — aytib qo‘y.
- Kafolat (ish 14 kun, qism — ishlab chiqaruvchi) — savol bo‘lsa shu javob.
- save_lead da mashina ma’lumoti + muammoni request ga yoz.
- «O‘zim qila olamanmi?» kabi savollarga — «murakkab qism uchun professional kerak» de, lekin diqqat bilan.`,
    default_services: [
      { name: "TO (yog‘ + filtr)", base_price_uzs: 250000, duration: "1.5 soat" },
      { name: "Diagnostika (komp. tahlil)", base_price_uzs: 100000, duration: "30 daq" },
      { name: "Balansirovka (4 g‘ildirak)", base_price_uzs: 80000, duration: "30 daq" },
      { name: "Razval-shoyilanish (3D)", base_price_uzs: 200000, duration: "1 soat" },
      { name: "Tormoz kolodkalari (old)", base_price_uzs: 250000, duration: "1 soat" },
      { name: "Tormoz kolodkalari (orqa)", base_price_uzs: 200000, duration: "1 soat" },
      { name: "Kondatsioner to‘ldirish", base_price_uzs: 250000, duration: "45 daq" },
      { name: "Polirovka (kuzov)", base_price_uzs: 600000, duration: "3 soat" },
      { name: "Bo‘yash (1 element)", base_price_uzs: 800000, duration: "1 kun" },
      { name: "Shinani o‘zgartirish (4 ta)", base_price_uzs: 120000, duration: "30 daq" },
    ],
    default_faq: [
      {
        q: "Qaysi markalar bilan ishlaysizlar?",
        a: "Hammasi: Chevrolet, Hyundai, Kia, Toyota, BMW, Mercedes va boshqalar. Aniqlik uchun marka/model/yilini ayting.",
      },
      {
        q: "Ehtiyot qism qaerdan?",
        a: "Asosiy markalar uchun stockda. Maxsus qism 1-2 kun ichida olib kelamiz. OEM yoki analog — sizga moslashtirib taklif qilamiz.",
      },
      {
        q: "Kafolat bormi?",
        a: "Ish — 14 kun. Ehtiyot qism — ishlab chiqaruvchi kafolatga muvofiq (odatda 6 oy yoki 10 000 km).",
      },
      {
        q: "TO qancha vaqt oladi?",
        a: "Klassik TO — 1-2 soat. Diagnostika kerak bo‘lsa qo‘shimcha 30 daq.",
      },
      {
        q: "Mashina bilan kelishdan oldin nima?",
        a: "Kalit + tehnik passport olib keling. Mashina yuvilmagan bo‘lsa ham xizmatga halal — diagnozni e’tibor bilan qilamiz.",
      },
      {
        q: "Naqd-karta?",
        a: "Ikkalasi ham OK. Click, Payme, Uzcard/Humo — barchasi mavjud.",
      },
    ],
    default_working_hours: {
      mon: [9, 19], tue: [9, 19], wed: [9, 19], thu: [9, 19],
      fri: [9, 19], sat: [9, 17], sun: null,
    },
    default_contacts_template: {
      phone: "+998 __ ___ __ __",
      address: "[Manzilni kiriting]",
      instagram: "[@username]",
    },
    sample_broadcasts: [
      {
        title: "🔧 Bahor TO aksiyasi",
        text:
          "🔧 Bahor TO! Mart-aprel: standart TO + diagnostika BEPUL.\n\nMos vaqtni botda yoki 📞 telefon orqali bron qiling.",
        suggested_segment: "all",
      },
      {
        title: "🛞 Shina almashtirish vaqti",
        text:
          "🛞 Bahor keldi — yozgi shinaga o‘tish vaqti. Almashtirish + balansirovka + saqlash 1 yilga: 250k.\n\nBron — botda.",
        suggested_segment: "all",
      },
      {
        title: "❄️ Kondatsioner xizmati",
        text:
          "❄️ Issiq kunlar yaqin — kondatsioneringiz tayyormi?\n\nTo‘liq tekshiruv + to‘ldirish 250k. 30 daqiqa, navbatsiz.",
        suggested_segment: "all",
      },
    ],
  },

  // ════════════════════════════════════════════
  // 6. O‘QUV MARKAZ
  // ════════════════════════════════════════════
  {
    id: "oquv_markaz",
    is_pack: true,
    vertical: "oquv",
    category: "education",
    name: "O‘quv markaz",
    icon: "📚",
    description:
      "Til kurslari · IT · Repetitor · Bepul demo. O‘quv markaz uchun pack.",
    default_welcome:
      "Salom! O‘quv markazimizga xush kelibsiz 📚 Qaysi yo‘nalish sizni qiziqtiradi?",
    default_buttons: [
      { text: "Til kurslari" },
      { text: "IT/dasturlash" },
      { text: "Maktab fanlari" },
      { text: "Bepul demo dars" },
      { text: "To‘lov va imkoniyatlar" },
    ],
    sub_types: [
      {
        id: "language",
        name: "Til markazi",
        description: "Ingliz, rus, koreys va boshqalar",
        icon: "🌍",
        prompt_addon: "Sen til markazi administratorisan. IELTS/TOEFL kabi sertifikatlarga e’tibor.",
      },
      {
        id: "it",
        name: "IT akademiya",
        description: "Dasturlash, dizayn, marketing",
        icon: "💻",
        prompt_addon:
          "Sen IT o‘quv markazi administratorisan. Karyera natija, ishga joylashish — sotuvning kaliti.",
      },
      {
        id: "tutor",
        name: "Repetitor markazi",
        description: "Maktab fanlari, individual",
        icon: "✏️",
        prompt_addon:
          "Sen repetitor markazi administratorisan. Maktab dasturi, abituriyent — fokus shu yerda.",
      },
    ],
    price_tiers: TIERS,
    tones: [
      ...TONES_GENERIC,
      {
        id: "academic",
        name: "Akademik",
        prompt_addon: "Ohangin akademik va ishonchli. Faktlar va natijalarga tayan.",
      },
    ],
    brand_kit: {
      primary_color: "#4F46E5",
      accent_color: "#FBBF24",
      background_tint: "#EEF2FF",
      text_on_primary: "#FFFFFF",
      emoji_set: ["📚", "✏️", "🎓", "💡"],
      font_hint: "academic",
      gradient: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
    },
    default_system_prompt: `Sen — o‘quv markazning AI administratorisan. Kurslar, narxlar, qabul jarayoni bo‘yicha yordam berasan.

QOIDALAR:
- Birinchi tashrifda — BEPUL demo dars taklif qil.
- Kurs darajasini aniqlash uchun bepul test bor — savol bo‘lsa shu yo‘l ber.
- To‘lov: oylik yoki kurs uchun chegirma bilan — har ikkala variantni tushuntir.
- Sertifikat haqida aytib qo‘y (kurs tugashi bilan).
- save_lead da: ism + telefon + qaysi kursga qiziqsa shuni request ga yoz.
- Karyera natijalari haqida so‘ralsa — aniq misollar bo‘lmasa va’da berma.`,
    default_services: [
      { name: "Bepul demo dars", base_price_uzs: 0, duration: "1 soat" },
      { name: "Bepul daraja testi", base_price_uzs: 0, duration: "30 daq" },
      { name: "Ingliz tili (boshlang‘ich)", base_price_uzs: 600000, duration: "3 oy" },
      { name: "Ingliz IELTS preparation", base_price_uzs: 1200000, duration: "2 oy" },
      { name: "Rus tili", base_price_uzs: 500000, duration: "3 oy" },
      { name: "Koreys tili", base_price_uzs: 700000, duration: "3 oy" },
      { name: "Web dasturlash (full-stack)", base_price_uzs: 1500000, duration: "6 oy" },
      { name: "UI/UX dizayn", base_price_uzs: 1200000, duration: "4 oy" },
      { name: "Matematika (maktab)", base_price_uzs: 500000, duration: "oylik" },
      { name: "Repetitor 1-on-1 (1 soat)", base_price_uzs: 150000, duration: "1 soat" },
    ],
    default_faq: [
      {
        q: "Demo dars bepulmi?",
        a: "Ha, har kursda 1 ta bepul demo. Dars + savol-javob — 1 soat. Bron uchun shu botga yozing.",
      },
      {
        q: "Guruhda nechta odam?",
        a: "Til/akademik kurslar 6-10 ta talaba, IT 8-12 ta. Repetitor — individual.",
      },
      {
        q: "Sertifikat berasizlarmi?",
        a: "Ha, kurs tugagach davlat tomonidan tan olingan sertifikat. IT kursida portfolio + GitHub layihasi ham qo‘shiladi.",
      },
      {
        q: "Online dars bormi?",
        a: "Ha, hamma kurslar online + offline formatda. Aralash format ham mumkin.",
      },
      {
        q: "To‘lov bo‘lib bo‘ladimi?",
        a: "Ha. Oylik to‘lov — eng ko‘p. 3 oy oldindan to‘lasangiz 10% chegirma. 6 oy — 15% chegirma.",
      },
      {
        q: "Sinov uchun joy bormi?",
        a: "1 hafta sinov — agar kurs sizga to‘g‘ri kelmasa, pul to‘liq qaytariladi.",
      },
      {
        q: "Qaysi vaqtda darslar bo‘ladi?",
        a: "Ertalab, kunduz, kechqurun guruhlari mavjud. Sizga mos vaqt — bron paytida tanlaysiz.",
      },
    ],
    default_working_hours: {
      mon: [9, 21], tue: [9, 21], wed: [9, 21], thu: [9, 21],
      fri: [9, 21], sat: [10, 18], sun: null,
    },
    default_contacts_template: {
      phone: "+998 __ ___ __ __",
      address: "[Manzilni kiriting]",
      instagram: "[@username]",
    },
    sample_broadcasts: [
      {
        title: "🎓 Yangi guruh ochilmoqda",
        text:
          "🎓 Yangi guruh ochilmoqda! Boshlang‘ich daraja — keyingi haftadan.\n\nIlk 10 talaba uchun 20% chegirma. Bepul demo darsga botda yozing.",
        suggested_segment: "no_lead",
      },
      {
        title: "💡 Bepul demo kuni",
        text:
          "💡 Bu hafta — bepul demo kunlari!\n\nQaysi kurs sizni qiziqtiradi? — Yozing, biz mos vaqt taklif qilamiz.",
        suggested_segment: "all",
      },
      {
        title: "🏆 Karyera tarixi",
        text:
          "🏆 Bizning bitiruvchimiz [Ism] xalqaro kompaniyaga ishga olishidi!\n\nSiz ham karyerangizda navbatdagi qadamga tayyormisiz? — Bepul konsultatsiya botda.",
        suggested_segment: "all",
      },
      {
        title: "📅 Kursingiz davom etmoqda",
        text:
          "Salom! Kursingizdagi keyingi modul boshlanmoqda 📅\n\nDavom ettirish + yangi modul uchun birga to‘lov 10% off.\n\nQiziqsangiz — admin bilan bog‘lanasiz.",
        suggested_segment: "converted",
      },
    ],
  },
];

// ───── Mavjud horizontal templates (Lead, Support) ni saqlaymiz ─────
const HORIZONTAL = [
  {
    id: "lead_capture",
    is_pack: false,
    name: "AI Lead Capture",
    icon: "📞",
    category: "sales",
    description: "Reklamadan kelgan mijozdan ism, telefon va talabni yig‘ib adminga uzatadi.",
  },
  {
    id: "support_faq",
    is_pack: false,
    name: "AI Support FAQ",
    icon: "🛟",
    category: "support",
    description: "Tez-tez beriladigan savollarga javob beradi, javob topa olmasa operatorga uzatadi.",
  },
];

async function upsertPack(p) {
  const r = await sql`
    insert into bot_templates (
      id, name, icon, category, description,
      vertical, is_pack, sub_types, price_tiers, tones, brand_kit,
      default_system_prompt, default_welcome, default_buttons,
      default_services, default_faq, default_working_hours,
      default_contacts_template, sample_broadcasts, is_active
    )
    values (
      ${p.id}, ${p.name}, ${p.icon}, ${p.category}, ${p.description},
      ${p.vertical}, ${p.is_pack},
      ${JSON.stringify(p.sub_types ?? [])}::jsonb,
      ${JSON.stringify(p.price_tiers ?? [])}::jsonb,
      ${JSON.stringify(p.tones ?? [])}::jsonb,
      ${JSON.stringify(p.brand_kit ?? {})}::jsonb,
      ${p.default_system_prompt ?? ""}, ${p.default_welcome ?? ""},
      ${JSON.stringify(p.default_buttons ?? [])}::jsonb,
      ${JSON.stringify(p.default_services ?? [])}::jsonb,
      ${JSON.stringify(p.default_faq ?? [])}::jsonb,
      ${JSON.stringify(p.default_working_hours ?? {})}::jsonb,
      ${JSON.stringify(p.default_contacts_template ?? {})}::jsonb,
      ${JSON.stringify(p.sample_broadcasts ?? [])}::jsonb,
      true
    )
    on conflict (id) do update set
      name = excluded.name,
      icon = excluded.icon,
      category = excluded.category,
      description = excluded.description,
      vertical = excluded.vertical,
      is_pack = excluded.is_pack,
      sub_types = excluded.sub_types,
      price_tiers = excluded.price_tiers,
      tones = excluded.tones,
      brand_kit = excluded.brand_kit,
      default_system_prompt = excluded.default_system_prompt,
      default_welcome = excluded.default_welcome,
      default_buttons = excluded.default_buttons,
      default_services = excluded.default_services,
      default_faq = excluded.default_faq,
      default_working_hours = excluded.default_working_hours,
      default_contacts_template = excluded.default_contacts_template,
      sample_broadcasts = excluded.sample_broadcasts,
      is_active = true
  `;
  console.log(`✓ ${p.id}`);
}

async function ensureHorizontal(t) {
  await sql`
    update bot_templates
    set is_pack = ${t.is_pack},
        is_active = true
    where id = ${t.id}
  `;
  console.log(`✓ ${t.id} (horizontal preserved)`);
}

for (const p of PACKS) await upsertPack(p);
for (const t of HORIZONTAL) await ensureHorizontal(t);

console.log("\n✓ Done. Total templates:");
const res = await sql`select id, name, is_pack from bot_templates where is_active order by is_pack desc, name`;
for (const r of res) console.log(`  ${r.is_pack ? "📦" : "📄"} ${r.id} — ${r.name}`);

await sql.end();
