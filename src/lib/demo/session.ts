import "server-only";

import { cookies, headers } from "next/headers";

import { isoDateInTimeZone } from "@/features/mvp/format";

import { createDemoClient } from "./client";
import { buildDemoDataset, demoProfile, demoUserId, demoWorkspaceId } from "./dataset";
import { guestCookieName, guestCookieValue } from "./guest";

export async function hasGuestCookie() {
  return (await cookies()).get(guestCookieName)?.value === guestCookieValue;
}

/**
 * Toda Server Action chega por POST: com o cabeçalho `next-action` quando o React a
 * dispara, ou como formulário comum quando não há JavaScript. Página nenhuma é
 * renderizada assim, então isto separa "olhar" de "tentar mudar".
 */
export async function isActionRequest() {
  const requestHeaders = await headers();
  const contentType = requestHeaders.get("content-type") ?? "";
  return (
    requestHeaders.has("next-action") ||
    /^(multipart\/form-data|application\/x-www-form-urlencoded)/i.test(contentType)
  );
}

/**
 * Contexto do visitante: mesma forma do contexto de um workspace real, mas com um
 * cliente que só lê os dados fictícios em memória. Nada aqui alcança o banco.
 */
export function demoWorkspaceContext() {
  const today = isoDateInTimeZone(demoProfile.timezone);
  return {
    fullName: demoProfile.fullName,
    guest: true,
    supabase: createDemoClient(buildDemoDataset(today)),
    userId: demoUserId,
    workspaceId: demoWorkspaceId,
    workspaceName: demoProfile.workspaceName,
    workspaceTimezone: demoProfile.timezone,
  };
}
