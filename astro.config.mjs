import { defineConfig } from "astro/config";

import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  output: "hybrid",
  image: {
    domains: ["https://firebasestorage.googleapis.com/"],
  },
  adapter: vercel(),
});
