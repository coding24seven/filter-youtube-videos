import terser from "@rollup/plugin-terser";

export default function getTerser() {
  return terser({
    compress: {
      defaults: false, // Disable all default compressions
      drop_console: true, // Remove console.* statements
    },
    mangle: false,
    format: {
      comments: false, // Remove all comments
      beautify: true, // Preserve readable formatting
      indent_level: 2, // Set indentation level
      keep_quoted_props: true, // Preserve property names
      keep_numbers: true, // Prevent number transformations
    },
  });
}
