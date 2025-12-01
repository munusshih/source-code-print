// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import mermaid from "astro-mermaid";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "static",
  adapter: vercel({
    webAnalytics: { enabled: true },
  }),
  integrations: [
    mermaid({
      theme: "default",
      autoTheme: false,
      mermaidConfig: {
        primaryColor: "#ffffff",
        primaryBorderColor: "#000000",
        primaryTextColor: "#000000",
        secondaryColor: "#ffc0cb",
        secondaryBorderColor: "#000000",
        secondaryTextColor: "#000000",
        tertiaryColor: "#fffacd",
        tertiaryBorderColor: "#000000",
        tertiaryTextColor: "#000000",
        fontFamily: "Inter, sans-serif",
        fontSize: 16,
        curve: "linear",
        themeVariables: {
          primaryColor: "#ffffff",
          primaryTextColor: "#000000",
          primaryBorderColor: "#000000",
          secondaryColor: "#ffc0cb",
          secondaryTextColor: "#000000",
          secondaryBorderColor: "#000000",
          tertiaryColor: "#ffffff",
          tertiaryTextColor: "#000000",
          tertiaryBorderColor: "#000000",
          fontFamily: "Inter, sans-serif",
          fontSize: "16px",
          lineColor: "#000000",
          textColor: "#000000",
          background: "#ffffff",
          mainBkg: "#ffffff",
          secondBkg: "#ffc0cb",
          tertiaryBkg: "#ffffff",
          nodeBkg: "#ffffff",
          nodeBorder: "#000000",
          noteBkgColor: "#ffffff",
          noteBorderColor: "#000000",
          noteTextColor: "#000000",
          cScale0: "#ffffff",
          cScale1: "#ffffff",
          cScale2: "#ffffff",
          cScale3: "#ffffff",
        },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
  },
});
