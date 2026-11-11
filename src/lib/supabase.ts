import { createClient } from '@supabase/supabase-js';

// Clave pública (anon): solo permite leer el catálogo, subir fotos y registrar
// checklists a través de la función validada `registrar_inspeccion`.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://cygtbbihkjrfcepobdce.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5Z3RiYmloa2pyZmNlcG9iZGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMzgxNzIsImV4cCI6MjEwOTgxNDE3Mn0.9toQwh6i1AG0kRfesNIMgyl_lV40G58GMi4cGEOoefg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const FOTOS_BUCKET = 'checklist-fotos';
