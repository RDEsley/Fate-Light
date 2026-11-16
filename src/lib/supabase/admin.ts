import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getServerEnvironment } from "@/config/env/server";
import type { Database } from "@/types/database.generated";

/**
 * Cliente com a chave secreta, sem sessão de usuário. Uso restrito ao agendador e ao webhook
 * dos lembretes pelo WhatsApp (ADR-0024), que só chamam RPCs liberados para `service_role`.
 * Nenhuma página ou Server Action deve importar este módulo.
 */
export function createAdminSupabaseClient() {
  const environment = getServerEnvironment();
  if (!environment.SUPABASE_SECRET_KEY) return null;

  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
