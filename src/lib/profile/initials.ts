export function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "FE";
  }

  const selected = parts.length === 1 ? [parts[0]] : [parts[0], parts.at(-1)];
  return selected
    .map((part) => part?.charAt(0).toLocaleUpperCase("pt-BR"))
    .join("")
    .slice(0, 2);
}
