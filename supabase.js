// Só cria se ainda não existir
if (!window.supabaseClient) {
  const SUPABASE_URL = "https://yasvanzqhvvpighfzttv.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlhc3ZhbnpxaHZ2cGlnaGZ6dHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0Mjk3MTQsImV4cCI6MjA5MjAwNTcxNH0.72F7b5Q5NlxpAYXDU74qWzQBDrnl9E9pmOlmapnNgrM";

  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

// NÃO usa const aqui
var supabase = window.supabaseClient;