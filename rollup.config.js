import typescript from "rollup-plugin-typescript2";
import copy from "rollup-plugin-copy";
import removeOutputDirectory from "./rollup-plugins/remove-output-directory.js";
import getTerser from "./rollup-plugins/terser.js";

const isProduction = process.env.NODE_ENV === "production";

const terser = getTerser();

export default [
  {
    input: "src/code/content/index.ts",
    output: {
      dir: "output",
      format: "cjs",
      entryFileNames: "code/content/[name].js",
    },
    plugins: [
      /* removes `output` directory */
      {
        name: "remove-output-directory",
        buildStart() {
          removeOutputDirectory();
        },
      },
      typescript(),
      isProduction && terser,
      /* copies all files to output, but only once on `npm run watch` */
      copy({
        targets: [{ src: ["src/**/*", "!**/*/code"], dest: "output" }],
        flatten: false,
      }),
    ],
  },
  {
    input: "src/code/popup/index.ts",
    output: {
      dir: "output",
      format: "cjs",
      entryFileNames: "code/popup/[name].js",
    },
    plugins: [typescript(), isProduction && terser],
  },
  {
    input: "src/code/background/index.ts",
    output: {
      dir: "output",
      format: "cjs",
      entryFileNames: "code/background/[name].js",
    },
    plugins: [typescript(), isProduction && terser],
  },
];
