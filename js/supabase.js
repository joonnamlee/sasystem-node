import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://orbcrktuzhvjqjdtvfgi.supabase.co";
export const SUPABASE_KEY = "sb_publishable_ZTMRfjMxgUuT2Dz-zZmqYQ_qrHb2U6z";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Edge Function 호출을 위해 supabaseUrl 추가
supabase.supabaseUrl = SUPABASE_URL;

