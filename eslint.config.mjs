import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // L'interface est en français : les apostrophes y sont partout et
      // s'affichent correctement dans du JSX. Les échapper une à une
      // (« l&apos;élève ») rendrait le texte illisible pour rien.
      "react/no-unescaped-entities": "off",
    },
  },
  { ignores: [".next/**", "node_modules/**"] },
];

export default config;
