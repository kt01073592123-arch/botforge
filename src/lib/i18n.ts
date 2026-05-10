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

  // Mini App — tabs
  mini_tab_home: { uz: "Bosh", ru: "Главная", en: "Home" },
  mini_tab_favorites: { uz: "Sevimli", ru: "Избранное", en: "Favorites" },
  mini_tab_orders: { uz: "Buyurtma", ru: "Заказы", en: "Orders" },
  mini_tab_refer: { uz: "Taklif", ru: "Друзьям", en: "Refer" },
  mini_tab_profile: { uz: "Profil", ru: "Профиль", en: "Profile" },

  // Mini App — search/catalog
  mini_search: { uz: "Qidirish...", ru: "Поиск...", en: "Search..." },
  mini_no_products: { uz: "Mahsulot topilmadi", ru: "Товары не найдены", en: "No products" },
  mini_out_of_stock: { uz: "Yo'q", ru: "Нет", en: "Out" },
  mini_book: { uz: "📅 Bron", ru: "📅 Записаться", en: "📅 Book" },
  mini_add_to_cart: { uz: "+ Savatga", ru: "+ В корзину", en: "+ Add" },
  mini_reviews_title: { uz: "Mijozlarimiz fikrlari", ru: "Отзывы клиентов", en: "Customer reviews" },
  mini_default_customer: { uz: "Mijoz", ru: "Клиент", en: "Customer" },

  // Mini App — cart/checkout
  mini_cart: { uz: "🛒 Savat", ru: "🛒 Корзина", en: "🛒 Cart" },
  mini_clear_cart: { uz: "Tozalash", ru: "Очистить", en: "Clear" },
  mini_checkout_btn: { uz: "Buyurtma berish →", ru: "Оформить →", en: "Checkout →" },
  mini_total: { uz: "Jami:", ru: "Итого:", en: "Total:" },
  mini_order_title: { uz: "📦 Buyurtma", ru: "📦 Заказ", en: "📦 Order" },
  mini_field_name: { uz: "Ism", ru: "Имя", en: "Name" },
  mini_name_ph: { uz: "Ismingiz (ixtiyoriy)", ru: "Имя (необязательно)", en: "Name (optional)" },
  mini_field_phone: { uz: "Telefon *", ru: "Телефон *", en: "Phone *" },
  mini_field_note: { uz: "Izoh", ru: "Примечание", en: "Note" },
  mini_note_ph: {
    uz: "Yetkazib berish manzili...",
    ru: "Адрес доставки...",
    en: "Delivery address...",
  },
  mini_confirm: { uz: "✅ Tasdiqlash", ru: "✅ Подтвердить", en: "✅ Confirm" },
  mini_submitting: { uz: "Yuborilmoqda...", ru: "Отправка...", en: "Submitting..." },
  mini_order_received: { uz: "Buyurtma qabul qilindi!", ru: "Заказ принят!", en: "Order received!" },
  mini_admin_will_contact: {
    uz: "Tez orada admin bog'lanadi",
    ru: "Скоро администратор свяжется",
    en: "Admin will contact you",
  },

  // Mini App — promo
  mini_promo_label: { uz: "🎟 Promo kod", ru: "🎟 Промокод", en: "🎟 Promo code" },
  mini_promo_apply: { uz: "Qo'llash", ru: "Применить", en: "Apply" },
  mini_promo_remove: { uz: "O'chirish", ru: "Убрать", en: "Remove" },

  // Mini App — profile
  mini_locked_title: {
    uz: "Telegram orqali kiring",
    ru: "Откройте через Telegram",
    en: "Open via Telegram",
  },
  mini_locked_subtitle: {
    uz: "Profil saqlash uchun bot orqali Mini App'ni oching",
    ru: "Откройте Mini App через бота для сохранения профиля",
    en: "Open Mini App via bot to save profile",
  },
  mini_stat_orders: { uz: "Buyurtmalar", ru: "Заказы", en: "Orders" },
  mini_stat_spent: { uz: "Sarflandi", ru: "Потрачено", en: "Spent" },
  mini_stat_bonus: { uz: "Bonus", ru: "Бонус", en: "Bonus" },
  mini_save: { uz: "💾 Saqlash", ru: "💾 Сохранить", en: "💾 Save" },
  mini_saving: { uz: "Saqlanmoqda...", ru: "Сохранение...", en: "Saving..." },
  mini_saved_check: { uz: "✓ Saqlandi", ru: "✓ Сохранено", en: "✓ Saved" },

  // Mini App — orders tab
  mini_no_orders: { uz: "Buyurtmalar yo'q", ru: "Заказов нет", en: "No orders" },
  mini_no_orders_sub: {
    uz: "Birinchi buyurtmangiz shu yerda ko'rinadi",
    ru: "Ваш первый заказ появится здесь",
    en: "Your first order will appear here",
  },
  mini_order_status_pending: { uz: "Kutilmoqda", ru: "Ожидание", en: "Pending" },
  mini_order_status_confirmed: { uz: "Qabul qilindi", ru: "Подтверждён", en: "Confirmed" },
  mini_order_status_in_progress: { uz: "Yo'lda", ru: "В пути", en: "In transit" },
  mini_order_status_completed: { uz: "Yetkazildi", ru: "Доставлен", en: "Delivered" },
  mini_order_status_cancelled: { uz: "Bekor qilindi", ru: "Отменён", en: "Cancelled" },

  // Mini App — refer
  mini_refer_title: { uz: "Do'stni taklif qiling", ru: "Пригласите друга", en: "Invite a friend" },
  mini_refer_subtitle: {
    uz: "Do'stingiz birinchi xaridini qilganda 2% keshbek sizga qaytadi",
    ru: "Когда друг сделает первую покупку, 2% кэшбек вернётся вам",
    en: "When friend makes first purchase, 2% cashback comes back",
  },
  mini_refer_invited: { uz: "Taklif qilindi", ru: "Приглашено", en: "Invited" },
  mini_refer_bonus: { uz: "Bonus to'plandi", ru: "Накоплено", en: "Earned" },
  mini_refer_link_label: { uz: "Sizning havola", ru: "Ваша ссылка", en: "Your link" },
  mini_refer_copy: { uz: "🔗 Havolani nusxa olish", ru: "🔗 Скопировать ссылку", en: "🔗 Copy link" },
  mini_refer_copied: { uz: "✓ Nusxalandi", ru: "✓ Скопировано", en: "✓ Copied" },

  // Mini App — common
  mini_loading: { uz: "Yuklanmoqda...", ru: "Загрузка...", en: "Loading..." },

  // Mini App — push notifications
  mini_push_enable: {
    uz: "🔔 Buyurtma haqida xabarlar",
    ru: "🔔 Уведомления о заказе",
    en: "🔔 Order notifications",
  },
  mini_push_enable_btn: { uz: "Yoqish", ru: "Включить", en: "Enable" },
  mini_push_enabled: {
    uz: "✓ Push yoqilgan",
    ru: "✓ Push включён",
    en: "✓ Push enabled",
  },
  mini_push_disable_btn: { uz: "O'chirish", ru: "Отключить", en: "Disable" },
  mini_push_denied: {
    uz: "Brauzer ruxsat bermadi. Sozlamalardan yoqing.",
    ru: "Браузер не дал разрешение. Включите в настройках.",
    en: "Browser denied. Enable in settings.",
  },
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
