const globals = require("globals");
const pluginN = require("eslint-plugin-n");

module.exports = [
  {
    ignores: ["dist/", "node_modules/", ".cache/"],
  },
  {
    files: ["**/*.js"],
    plugins: {
      n: pluginN,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...pluginN.configs.recommended.rules,
      "n/no-unpublished-require": [
        "error",
        {
          "allowModules": ["electron", "globals", "eslint-plugin-n"]
        }
      ]
    },
  },
];
