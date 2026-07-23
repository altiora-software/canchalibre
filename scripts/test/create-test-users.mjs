import { createClient } from "@supabase/supabase-js";

const confirmation = process.env.TEST_USER_SEED_CONFIRM;
const supabaseUrl = process.env.TEST_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.TEST_USER_PASSWORD;

if (confirmation !== "CREATE_TEST_USERS") {
  throw new Error('Set TEST_USER_SEED_CONFIRM="CREATE_TEST_USERS" to run this seed.');
}
if (!supabaseUrl || !serviceRoleKey || !password || password.length < 12) {
  throw new Error("TEST_SUPABASE_URL (or VITE_SUPABASE_URL), TEST_SUPABASE_SERVICE_ROLE_KEY and a 12+ character TEST_USER_PASSWORD are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { key: "admin", email: "admin.pruebas@canchalibre.test", fullName: "Admin de Pruebas", phone: "+543881000001", role: "admin" },
  { key: "owner", email: "owner.pruebas@canchalibre.test", fullName: "Owner de Pruebas", phone: "+543881000002", role: "owner" },
  { key: "customer", email: "usuario.pruebas@canchalibre.test", fullName: "Usuario de Pruebas", phone: "+543881000003", role: "customer" },
];

async function findUser(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function createOrUpdateUser(definition) {
  const existing = await findUser(definition.email);
  const payload = {
    email: definition.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: definition.fullName },
  };
  const result = existing
    ? await supabase.auth.admin.updateUserById(existing.id, payload)
    : await supabase.auth.admin.createUser(payload);
  if (result.error || !result.data.user) throw result.error ?? new Error(`Could not create ${definition.key}`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert({
      user_id: result.data.user.id,
      email: definition.email,
      full_name: definition.fullName,
      phone: definition.phone,
      role: definition.role,
    }, { onConflict: "user_id" })
    .select("id")
    .single();
  if (profileError) throw profileError;
  return { ...definition, userId: result.data.user.id, profileId: profile.id };
}

async function ensureDemoComplex(owner) {
  const complexName = "Complejo Demo Cancha Libre";
  const complexPayload = {
    owner_id: owner.profileId,
    name: complexName,
    description: "Complejo de demostración para probar catálogo, reservas y gestión de propietario.",
    address: "Av. Forestal 150",
    neighborhood: "Alto Comedero",
    latitude: -24.2205,
    longitude: -65.2945,
    phone: owner.phone,
    whatsapp: owner.phone,
    email: owner.email,
    opening_hours: { mon_fri: "09:00-23:00", sat_sun: "10:00-22:00" },
    amenities: ["Iluminada", "Césped sintético"],
    is_active: true,
    is_approved: true,
    payment_status: "paid",
    subscription_expires_at: "2099-12-31T23:59:59Z",
  };
  const { data: existing, error: existingError } = await supabase
    .from("sport_complexes")
    .select("id")
    .eq("owner_id", owner.profileId)
    .eq("name", complexName)
    .maybeSingle();
  if (existingError) throw existingError;

  const result = existing
    ? await supabase.from("sport_complexes").update(complexPayload).eq("id", existing.id).select("id").single()
    : await supabase.from("sport_complexes").insert(complexPayload).select("id").single();
  if (result.error || !result.data) throw result.error ?? new Error("Could not seed test complex");
  return result.data.id;
}

async function ensureDemoCourt(complexId) {
  const courtName = "Cancha Demo 5";
  const courtPayload = {
    complex_id: complexId,
    name: courtName,
    sport: "futbol",
    players_capacity: 10,
    surface_type: "Césped sintético",
    has_lighting: true,
    has_roof: true,
    hourly_price: 18000,
    is_active: true,
  };
  const { data: existing, error: existingError } = await supabase
    .from("sport_courts")
    .select("id")
    .eq("complex_id", complexId)
    .eq("name", courtName)
    .maybeSingle();
  if (existingError) throw existingError;
  const result = existing
    ? await supabase.from("sport_courts").update(courtPayload).eq("id", existing.id).select("id").single()
    : await supabase.from("sport_courts").insert(courtPayload).select("id").single();
  if (result.error || !result.data) throw result.error ?? new Error("Could not seed test court");

  const { data: availability, error: availabilityError } = await supabase
    .from("court_availability")
    .select("day_of_week")
    .eq("court_id", result.data.id)
    .eq("is_available", true);
  if (availabilityError) throw availabilityError;
  const availableDays = new Set(availability.map((row) => row.day_of_week));
  const missingDays = Array.from({ length: 7 }, (_, day) => day)
    .filter((day) => !availableDays.has(day))
    .map((day_of_week) => ({ court_id: result.data.id, day_of_week, start_time: "09:00", end_time: "23:00", is_available: true }));
  if (missingDays.length > 0) {
    const { error } = await supabase.from("court_availability").insert(missingDays);
    if (error) throw error;
  }
  return result.data.id;
}

const seededUsers = await Promise.all(users.map(createOrUpdateUser));
const owner = seededUsers.find((user) => user.key === "owner");
if (!owner) throw new Error("Owner test user was not created");
const complexId = await ensureDemoComplex(owner);
const courtId = await ensureDemoCourt(complexId);

console.table(users.map(({ key, email, role }) => ({ account: key, email, role })));
console.log(`Demo complex: ${complexId}`);
console.log(`Demo court: ${courtId}`);
console.log("All three accounts use TEST_USER_PASSWORD. The seed does not create reservations.");
