import postgres from "postgres";

const TG = Number(process.argv[2]);
if (!TG) { console.error("Usage: node user-lookup.mjs <telegram_id>"); process.exit(1); }

const sql = postgres(process.env.DB_URL, { ssl: "require", max: 1 });

console.log("=== APP_USERS (BotForge platforma foydalanuvchisi sifatida) ===");
const u = await sql`select * from app_users where telegram_id = ${TG}`;
console.log(JSON.stringify(u[0] ?? null, null, 2));

if (u.length > 0) {
  const uid = u[0].id;

  console.log("\n=== SUBSCRIPTION (tarif) ===");
  const s = await sql`select s.*, p.name as plan_name, p.bot_limit, p.message_limit from subscriptions s left join plans p on p.id = s.plan_id where s.user_id = ${uid}`;
  console.log(JSON.stringify(s[0] ?? null, null, 2));

  console.log("\n=== YARATGAN BOTLARI ===");
  const bots = await sql`select id, name, business_name, status, tg_username, ai_model, monthly_messages_used, monthly_message_limit, created_at from bots where owner_id = ${uid} and deleted_at is null order by created_at desc`;
  if (bots.length === 0) console.log("Hali bot yaratmagan");
  else for (const b of bots) console.log(`- ${b.name} (${b.status}) ${b.tg_username ? "@"+b.tg_username : "token yo'q"} — ${b.business_name ?? "biznes nomi yo'q"}`);

  console.log("\n=== TO'LOV TARIXI ===");
  const pays = await sql`select id, plan_id, provider, amount_uzs, status, created_at from payments where user_id = ${uid} order by created_at desc`;
  if (pays.length === 0) console.log("To'lov tarixi yo'q");
  else for (const p of pays) console.log(`- ${p.created_at}: ${p.plan_id} ${p.amount_uzs} so'm — ${p.status}`);
}

console.log("\n=== MIJOZ SIFATIDA (boshqa botlarga yozgan) ===");
const cp = await sql`select cp.*, b.name as bot_name, b.tg_username as bot_username, b.business_name from customer_profiles cp join bots b on b.id = cp.bot_id where cp.tg_user_id = ${TG}`;
if (cp.length === 0) console.log("Hech qaysi botda mijoz sifatida ko'rinmagan");
else for (const c of cp) console.log(`- @${c.bot_username} (${c.business_name ?? c.bot_name}): ${c.total_messages || 0} xabar, ${c.total_orders || 0} buyurtma, ${c.total_bookings || 0} bron, jami xarajat: ${c.lifetime_value_uzs || 0} so'm`);

console.log("\n=== SUHBATLAR (mijoz sifatida) ===");
const conv = await sql`select count(*)::int as cnt, count(distinct bot_id)::int as bot_cnt from conversations where tg_user_id = ${TG}`;
console.log(`${conv[0].cnt} ta suhbat, ${conv[0].bot_cnt} ta turli bot bilan`);

console.log("\n=== LEAD/BUYURTMA/BRONLAR (boshqa botlarda) ===");
const leads = await sql`select count(*)::int as cnt from leads l join bots b on b.id = l.bot_id where l.phone in (select phone from customer_profiles where tg_user_id = ${TG} and phone is not null)`;
const orders = await sql`select count(*)::int as cnt, sum(total_uzs)::bigint as total from orders where customer_tg_id = ${TG}`;
const bookings = await sql`select count(*)::int as cnt from bookings where customer_tg_id = ${TG}`;
console.log(`${leads[0].cnt} lead, ${orders[0].cnt} buyurtma (jami ${orders[0].total ?? 0} so'm), ${bookings[0].cnt} bron`);

await sql.end();
