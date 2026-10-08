"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { guestCookieMaxAge, guestCookieName, guestCookieValue } from "@/lib/demo/guest";

/**
 * Liga o modo visitante. O cookie não autentica ninguém: sem sessão do Supabase, as telas
 * passam a ler os dados fictícios em memória e toda ação é recusada.
 */
export async function enterGuestMode() {
  const cookieStore = await cookies();
  cookieStore.set(guestCookieName, guestCookieValue, {
    httpOnly: true,
    maxAge: guestCookieMaxAge,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/dashboard");
}

export async function leaveGuestMode() {
  const cookieStore = await cookies();
  cookieStore.delete(guestCookieName);
  redirect("/login");
}
