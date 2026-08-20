import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const ALLOWED_COMMENT =
  /^(TODO|eslint-|@ts-|@vitest-environment|prettier-ignore|\/ <reference)/;

const noComments = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow comments in source files; code must be self-explanatory.",
    },
    schema: [],
    messages: {
      unexpected:
        "Comments are not allowed. Make the code self-explanatory, or use TODO after agreeing it with the team.",
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const text = comment.value.replace(/^[\s*]+/, "");
          if (ALLOWED_COMMENT.test(text)) continue;
          context.report({ node: comment, messageId: "unexpected" });
        }
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: { local: { rules: { "no-comments": noComments } } },
    rules: {
      "local/no-comments": "error",
    },
  },
  prettier,
]);

export default eslintConfig;
