import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Next resolves "@/…" through tsconfig paths; vitest doesn't read those, so a
  // module importing "@/lib/…" fails to load under test unless it's mapped here
  // too. Without this, testing such a module means rewriting its imports.
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
