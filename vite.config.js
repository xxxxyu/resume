import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.RESUME_BASE_PATH || "/"
});
