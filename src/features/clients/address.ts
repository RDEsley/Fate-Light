import type { Json } from "@/types/database.generated";

export type ClientAddress = {
  city?: string;
  country_code?: string;
  district?: string;
  line1?: string;
  line2?: string;
  postal_code?: string;
  region?: string;
};

const addressKeys = new Set<keyof ClientAddress>([
  "city",
  "country_code",
  "district",
  "line1",
  "line2",
  "postal_code",
  "region",
]);

export function parseClientAddress(value: Json | null): ClientAddress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [keyof ClientAddress, string] =>
        addressKeys.has(entry[0] as keyof ClientAddress) && typeof entry[1] === "string",
    ),
  );
}

export function formatClientAddress(address: ClientAddress) {
  return [
    [address.line1, address.line2].filter(Boolean).join(", "),
    [address.district, address.city, address.region].filter(Boolean).join(" · "),
    [address.postal_code, address.country_code].filter(Boolean).join(" · "),
  ].filter(Boolean);
}
