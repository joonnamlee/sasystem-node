// Supabase client configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://orbrcktuzhvjqjdtvfgi.supabase.co";
const supabaseKey = "sb-publishable_ZTMRfjMxgUuT2Dz–zZmqYQ_qrHb2U6z";

export const supabase = createClient(supabaseUrl, supabaseKey);

