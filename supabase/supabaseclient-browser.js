// Supabase client for browser (non-module) usage
const SUPABASE_URL = "https://orbrcktuzhvjqjdtvfgi.supabase.co";
const SUPABASE_KEY = "sb-publishable_ZTMRfjMxgUuT2Dz–zZmqYQ_qrHb2U6z";

// Initialize Supabase client
let supabaseClient = null;

function initSupabase() {
  if (typeof supabase === 'undefined') {
    console.error('[Supabase] Supabase JS library not loaded');
    return null;
  }
  
  if (!supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

// Error handling helper
function checkError(error) {
  if (error) {
    console.error("Supabase error:", error);
    alert("데이터 저장 중 오류가 발생했습니다.");
    throw error;
  }
}

// Expose globally
window.initSupabase = initSupabase;
window.checkError = checkError;
window.getSupabaseClient = function() {
  return initSupabase();
};

