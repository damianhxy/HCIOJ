"use strict";

const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "database/**",
      "landing_page/**",
      "public/pace/**",
      "public/js/ace/**",
      "public/js/*.min.js",
      "public/js/npm.js",
      "public/js/prism.js",
      "public/js/detect-mobile.js",
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
      "no-console": "off",
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-throw-literal": "error",
    },
  },
  {
    files: ["public/js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        io: "readonly",
        $: "readonly",
        moment: "readonly",
        languages: "readonly",
        username: "readonly",
        thisusername: "readonly",
        subid: "readonly",
        ace: "readonly",
      },
    },
  },
];
