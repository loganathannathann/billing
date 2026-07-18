import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hnqtvshhycszftllhaig.supabase.co";

const supabaseKey =
  "sb_publishable_R8dQVFNcQeFtTl78bVvHwg_bi8yN37R";

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);