import { createClient } from "@supabase/supabase-js";
import { resolve } from "path";
import { config } from "dotenv";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const satnaId = 'a0000000-0000-0000-0000-000000000001';
  
  console.log("Renaming Satna Screen 1...");
  await supabase.from("auditoriums").update({ name: "Screen 1" }).eq("theatre_id", satnaId).eq("name", "Screen 1 — Platinum");
  
  console.log("Renaming Satna Screen 2...");
  await supabase.from("auditoriums").update({ name: "Screen 2" }).eq("theatre_id", satnaId).eq("name", "Screen 2 — Gold");
  
  console.log("Renaming Satna Screen 3...");
  await supabase.from("auditoriums").update({ name: "Screen 3" }).eq("theatre_id", satnaId).eq("name", "Screen 3 — Silver");
  
  console.log("Done Satna!");
}

run().catch(console.error);
