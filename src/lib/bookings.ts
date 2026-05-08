// Booking helpers — slot topish, yaratish, status boshqaruv.

import { db } from "./supabase/server";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type Booking = {
  id: string;
  bot_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_tg_id: number | null;
  customer_tg_username: string | null;
  slot_start: string;
  slot_end: string;
  service_name: string;
  service_price: string | null;
  service_duration: string | null;
  status: BookingStatus;
  notes: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
};

// Davomiyligi matnini daqiqaga aylantirish: "2 soat", "30 daqiqa", "1.5 soat"
export function parseDurationMinutes(text: string | null | undefined): number {
  if (!text) return 60;
  const t = text.toLowerCase().replace(/,/g, ".").trim();

  // Soat
  const hourMatch = t.match(/([\d.]+)\s*soat/);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    if (!isNaN(hours)) {
      let total = hours * 60;
      const minMatch = t.match(/([\d]+)\s*(daqiqa|min)/);
      if (minMatch) total += parseInt(minMatch[1], 10);
      return Math.round(total);
    }
  }
  // Faqat daqiqa
  const minOnly = t.match(/([\d]+)\s*(daqiqa|min)/);
  if (minOnly) return parseInt(minOnly[1], 10);

  // "30 min" yoki sof son
  const num = t.match(/^([\d]+)$/);
  if (num) return parseInt(num[1], 10);

  return 60;
}

export async function findAvailableSlots(opts: {
  botId: string;
  date: string; // YYYY-MM-DD
  durationMin: number;
  stepMin?: number;
}): Promise<{ start: string; end: string }[]> {
  const { data, error } = await db().rpc("find_available_slots", {
    p_bot_id: opts.botId,
    p_date: opts.date,
    p_duration_min: opts.durationMin,
    p_step_min: opts.stepMin ?? 30,
  });
  if (error) {
    console.error("[findAvailableSlots]", error.message);
    return [];
  }
  // RPC qator-qator qaytaradi (slot_start, slot_end)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  return rows.map((r) => ({ start: r.slot_start, end: r.slot_end }));
}

export async function createBooking(opts: {
  botId: string;
  customer: {
    name?: string;
    phone?: string;
    tg_id?: number;
    tg_username?: string;
  };
  slotStart: string;
  slotEnd: string;
  serviceName: string;
  servicePrice?: string;
  serviceDuration?: string;
  notes?: string;
}): Promise<{ id: string }> {
  const sb = db();

  // Conflict check (RPC slot find allaqachon qildi, lekin race condition uchun)
  const { data: conflict } = await sb
    .from("bookings")
    .select("id")
    .eq("bot_id", opts.botId)
    .lt("slot_start", opts.slotEnd)
    .gt("slot_end", opts.slotStart)
    .not("status", "in", ["cancelled", "no_show"] as never)
    .maybeSingle();
  if (conflict) {
    throw new Error("Bu vaqt allaqachon band. Boshqa vaqtni tanlang.");
  }

  const { data, error } = await sb
    .from("bookings")
    .insert({
      bot_id: opts.botId,
      customer_name: opts.customer.name ?? null,
      customer_phone: opts.customer.phone ?? null,
      customer_tg_id: opts.customer.tg_id ?? null,
      customer_tg_username: opts.customer.tg_username ?? null,
      slot_start: opts.slotStart,
      slot_end: opts.slotEnd,
      service_name: opts.serviceName,
      service_price: opts.servicePrice ?? null,
      service_duration: opts.serviceDuration ?? null,
      notes: opts.notes ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "create failed");
  return { id: data.id as string };
}

export async function listBookings(opts: {
  botId: string;
  fromDate?: string;
  status?: BookingStatus[];
  limit?: number;
}): Promise<Booking[]> {
  let q = db()
    .from("bookings")
    .select("*")
    .eq("bot_id", opts.botId)
    .order("slot_start", { ascending: true })
    .limit(opts.limit ?? 200);
  if (opts.fromDate) q = q.gte("slot_start", opts.fromDate);
  if (opts.status?.length) q = q.in("status", opts.status as never[]);
  const { data } = await q;
  return (data ?? []) as Booking[];
}

export async function updateBookingStatus(opts: {
  botId: string;
  bookingId: string;
  status: BookingStatus;
}) {
  await db()
    .from("bookings")
    .update({ status: opts.status })
    .eq("id", opts.bookingId)
    .eq("bot_id", opts.botId);
}

// Foydalanuvchi haftalik kalendar uchun: keyingi 14 kun uchun bandlik xulosasi
export async function bookingCalendarSummary(opts: {
  botId: string;
  from: string; // YYYY-MM-DD
  days: number;
}): Promise<Record<string, number>> {
  const sb = db();
  const fromDate = new Date(opts.from + "T00:00:00Z");
  const toDate = new Date(fromDate);
  toDate.setUTCDate(toDate.getUTCDate() + opts.days);

  const { data } = await sb
    .from("bookings")
    .select("slot_start, status")
    .eq("bot_id", opts.botId)
    .gte("slot_start", fromDate.toISOString())
    .lt("slot_start", toDate.toISOString());

  const counts: Record<string, number> = {};
  for (const b of (data ?? []) as { slot_start: string; status: string }[]) {
    if (b.status === "cancelled" || b.status === "no_show") continue;
    const day = b.slot_start.slice(0, 10);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  return counts;
}
