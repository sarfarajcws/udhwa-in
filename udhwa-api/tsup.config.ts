import { defineConfig } from "tsup";

// Bundles src/ (including the generated Prisma client) into dist/index.js.
// npm dependencies stay external and are installed on the server.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
});
