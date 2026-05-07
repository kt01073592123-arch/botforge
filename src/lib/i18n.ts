// Yengil i18n: Telegram language_code dan oladi yoki localStorage’dan.
// Markazlashtirilgan dictionary; yangi til qo‘shish uchun shu fayl yetadi.

export type Lang = "uz" | "ru" | "en";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "uz", label: "O‘zbekcha", flag: "🇺🇿" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

type Dict = Record<string, Record<Lang, string>>;

export const T: Dict = {
  // Common
  loading: { uz: "Yuklanmoqda…", ru: "Загрузка…", en: "Loading…" },
  save: { uz: "Saqlash", ru: "Сохранить", en: "Save" },
  cancel: { uz: "Bekor qilish", ru: "Отмена", en: "Cancel" },
  delete: { uz: "O‘chirish", ru: "Удалить", en: "Delete" },
  back: { uz: "Orqaga", ru: "Назад", en: "Back" },
  saved: { uz: "✓ Saqlandi", ru: "✓ Сохранено", en: "✓ Saved" },

  // Bots list
  my_bots: { uz: "Mening botlarim", ru: "Мои боты", en: "My bots" },
  new_bot: { uz: "+ Yangi", ru: "+ Новый", en: "+ New" },
  no_bots_yet: { uz: "Birinchi botingizni yaratamiz", ru: "Создадим первого бота", en: "Let’s create your first bot" },
  three_steps_5_min: { uz: "3 qadamda — taxminan 5 daqiqa", ru: "3 шага — около 5 минут", en: "3 steps — about 5 minutes" },

  // Onboarding
  step_botfather: {
    uz: "BotFather’dan token oling",
    ru: "Получите токен у BotFather",
    en: "Get a token from BotFather",
  },
  step_template: {
    uz: "Bot turini tanlang",
    ru: "Выберите тип бота",
    en: "Choose a bot type",
  },
  step_data: {
    uz: "Xizmatlar va narxlarni kiriting",
    ru: "Заполните услуги и цены",
    en: "Fill in services and prices",
  },

  // Bot detail
  status_active: { uz: "Faol", ru: "Активен", en: "Active" },
  status_paused: { uz: "Pauza", ru: "Пауза", en: "Paused" },
  status_draft: { uz: "Tayyorlanmoqda", ru: "Черновик", en: "Draft" },
  status_error: { uz: "Xatolik", ru: "Ошибка", en: "Error" },
  activate_bot: { uz: "▶ Botni faollashtirish", ru: "▶ Активировать бота", en: "▶ Activate bot" },
  pause_bot: { uz: "⏸ Pauza", ru: "⏸ Пауза", en: "⏸ Pause" },
  connect_token: { uz: "Token ulash →", ru: "Подключить токен →", en: "Connect token →" },

  // Nav cards
  nav_services: { uz: "Xizmatlar va narxlar", ru: "Услуги и цены", en: "Services & prices" },
  nav_kb: { uz: "Bilim bazasi", ru: "База знаний", en: "Knowledge base" },
  nav_conversations: { uz: "Suhbatlar", ru: "Диалоги", en: "Conversations" },
  nav_leads: { uz: "Leadlar", ru: "Лиды", en: "Leads" },
  nav_broadcast: { uz: "Xabar tarqatish", ru: "Рассылка", en: "Broadcast" },
  nav_analytics: { uz: "Analytics", ru: "Аналитика", en: "Analytics" },
  nav_settings: { uz: "Sozlamalar", ru: "Настройки", en: "Settings" },

  // Stats
  today_conv: { uz: "Bugun suhbat", ru: "Сегодня диалогов", en: "Today convs" },
  today_leads: { uz: "Bugun lead", ru: "Сегодня лидов", en: "Today leads" },
  today_msg: { uz: "Bugun xabar", ru: "Сегодня сообщений", en: "Today msgs" },
  total_conv: { uz: "Jami suhbat", ru: "Всего диалогов", en: "Total convs" },
  total_leads: { uz: "Jami lead", ru: "Всего лидов", en: "Total leads" },

  // Billing
  pricing: { uz: "Tariflar", ru: "Тарифы", en: "Pricing" },
  current_plan: { uz: "Hozirgi tarif", ru: "Текущий тариф", en: "Current plan" },
  upgrade_to: { uz: "tarifiga o‘tish", ru: "перейти на", en: "upgrade to" },
  free: { uz: "Bepul", ru: "Бесплатно", en: "Free" },
  per_month: { uz: "/ oy", ru: "/ мес", en: "/ mo" },
};

export function getLang(): Lang {
  if (typeof window === "undefined") return "uz";
  const stored = localStorage.getItem("bf_lang");
  if (stored && ["uz", "ru", "en"].includes(stored)) return stored as Lang;
  // Telegram WebApp language
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tg = (window as any).Telegram?.WebApp;
  const code = (tg?.initDataUnsafe?.user?.language_code ?? navigator.language?.split("-")[0]) as
    | string
    | undefined;
  if (code === "ru") return "ru";
  if (code === "en") return "en";
  return "uz";
}

export function setLang(lang: Lang) {
  if (typeof window !== "undefined") {
    localStorage.setItem("bf_lang", lang);
    window.location.reload();
  }
}

export function t(key: string, lang?: Lang): string {
  const l = lang ?? getLang();
  return T[key]?.[l] ?? T[key]?.uz ?? key;
}
