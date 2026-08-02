import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Nota sobre el parser: antes se cargaba @babel/eslint-parser. CRA no deja un
// babel.config.js en el repo (su configuración vive dentro de react-scripts),
// así que el parser abortaba con "No Babel config file detected" en CADA
// fichero: el proyecto llevaba lintando 0 de 283. Se usa el parser propio de
// ESLint (espree), que entiende JSX con `ecmaFeatures.jsx` y sintaxis moderna
// con `ecmaVersion`. Sin Babel no hay que exportar NODE_ENV para poder lintar
// ni depende de una config que vive dentro de node_modules.
export default [
  {
    ignores: ["build/**", "node_modules/**", "plugins/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // CRA sustituye process.env.* en tiempo de compilación.
        process: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // jsx-uses-vars es imprescindible: sin él, no-unused-vars marca como
      // muerto CADA componente importado que solo se usa dentro de JSX.
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // El runtime JSX de React 17+ no necesita React en el scope.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Un catch vacío es una decisión legítima aquí (degradación suave),
      // pero debe llevar comentario para no confundirse con un olvido.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Aviso, no error, a propósito: al arreglar el linter afloraron 111
      // símbolos muertos heredados. Son deuda de limpieza real, pero NINGUNO
      // rompe nada en ejecución, así que no deben bloquear un PR ajeno. Lo que
      // sí bloquea (no-undef, rules-of-hooks) es lo que revienta en el
      // navegador. Cuando el contador llegue a 0, súbelo a "error".
      "no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
  {
    // Los scripts de build/SEO corren en Node, no en el navegador.
    files: ["scripts/**/*.js", "craco.config.js", "postcss.config.js", "tailwind.config.js"],
    languageOptions: {
      globals: { ...globals.node },
      sourceType: "commonjs",
    },
  },
  {
    // El service worker tiene su propio conjunto de globals.
    files: ["public/sw.js"],
    languageOptions: {
      globals: { ...globals.serviceworker },
    },
  },
];
