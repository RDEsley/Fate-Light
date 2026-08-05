import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

process.env.NEXT_PUBLIC_APP_URL ??= "https://example.invalid";
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "sb_publishable_test_placeholder";

// jsdom não implementa rolagem; os componentes que a usam só precisam não quebrar.
Element.prototype.scrollIntoView ??= () => {};

afterEach(() => {
  cleanup();
});
