import type { Route } from "next";
import { z } from "zod";

const clientQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  q: z.string().trim().max(80).catch(""),
  state: z
    .enum(["all", "budget", "pending", "active", "inactive", "blacklist", "archived"])
    .catch("all"),
  /** `entities` recorta a lista nos clientes que já têm empresa/marca cadastrada. */
  view: z.enum(["all", "entities"]).catch("all"),
});

export function parseClientQuery(parameters: Record<string, string | undefined>) {
  return clientQuerySchema.parse(parameters);
}

export function clientListHref(query: ReturnType<typeof parseClientQuery>, page: number) {
  const parameters = new URLSearchParams();
  if (query.q) parameters.set("q", query.q);
  if (query.state !== "all") parameters.set("state", query.state);
  if (query.view !== "all") parameters.set("view", query.view);
  if (page > 1) parameters.set("page", String(page));
  const suffix = parameters.toString();
  return (suffix ? `/clientes?${suffix}` : "/clientes") as Route;
}
