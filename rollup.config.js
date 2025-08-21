import typescript from "rollup-plugin-typescript2";
import copy from "rollup-plugin-copy";
import copyModifiedFiles from "./rollup-plugins/copy-modified-files.js";
import removeOutputDirectory from "./rollup-plugins/remove-output-directory.js";

const isDevelopment = process.env.NODE_ENV === "development";

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
      /* copies all files to output, but only once on `npm run watch` */
      copy({
        targets: [{ src: ["src/**/*", "!**/*/code"], dest: "output" }],
        flatten: false,
      }),
      ...(isDevelopment
        ? [
            /* copies all non .ts files from `src` to `output` in real time when modified */
            {
              name: "copy-modified-files",
              buildStart() {
                copyModifiedFiles();
              },
            },
          ]
        : []),
    ],
  },
  {
    input: "src/code/popup/index.ts",
    output: {
      dir: "output",
      format: "cjs",
      entryFileNames: "code/popup/[name].js",
    },
    plugins: [typescript()],
  },
  {
    input: "src/code/background/index.ts",
    output: {
      dir: "output",
      format: "cjs",
      entryFileNames: "code/background/[name].js",
    },
    plugins: [typescript()],
  },
];
