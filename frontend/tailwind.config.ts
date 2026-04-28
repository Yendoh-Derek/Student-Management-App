import type { Config } from "tailwindcss";

/**
 * Required for Tailwind v3 JIT: without `content`, utility classes used in JSX
 * are never generated (page looks like unstyled HTML).
 */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {}
  },
  plugins: []
} satisfies Config;
