const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export function sanitizeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    return fallback;
  }

  return value;
}

export function appendNextPath(pathname: string, nextPath: string) {
  const parameters = new URLSearchParams({ next: sanitizeNextPath(nextPath) });
  return `${pathname}?${parameters.toString()}`;
}
