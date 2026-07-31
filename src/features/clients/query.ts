import { z } from "zod";
import type { Route } from "next";

const clientQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  q: z.string().trim().max(80).catch(""),
  status: z.enum(["all", "lead", "active", "paused", "inactive"]).catch("all"),
  view: z.enum(["active", "archived"]).catch("active"),
});

export function parseClientQuery(parameters: Record<string, string | undefined>) {
  return clientQuerySchema.parse(parameters);
}

export function clientListHref(query: ReturnType<typeof parseClientQuery>, page: number) {
  const parameters = new URLSearchParams();
  if (query.q) parameters.set("q", query.q);
  if (query.status !== "all") parameters.set("status", query.status);
  if (query.view !== "active") parameters.set("view", query.view);
  if (page > 1) parameters.set("page", String(page));
  const suffix = parameters.toString();
  return (suffix ? `/clientes?${suffix}` : "/clientes") as Route;
}
