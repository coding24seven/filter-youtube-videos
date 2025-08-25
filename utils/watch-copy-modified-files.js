import fs from "fs";
import path from "path";

watchCopyModifiedFiles();

function watchCopyModifiedFiles() {
  const fileTypes = /.*(?<!\.ts|~)$/; // match file names that do not end with `.ts`, `~` (temporary files created by IDE editor)
  const outputDir = "output";
  const debounceMap = new Map(); // Store timeouts for debouncing
  const DEBOUNCE_MS = 100; // Wait 100ms to group events

  fs.mkdirSync(outputDir, { recursive: true });

  fs.watch("src", { recursive: true }, (eventType, filePath) => {
    if (!filePath?.match(fileTypes)) {
      console.log(
        `watch-copy-modified-files: ignored: ${filePath || "unknown file"})`,
      );

      return;
    }

    // Debounce logic
    if (debounceMap.has(filePath)) {
      clearTimeout(debounceMap.get(filePath));
    }

    debounceMap.set(
      filePath,
      setTimeout(() => {
        console.log(`Event: ${eventType}, File: ${filePath || "unknown"}`);

        const srcPath = path.join("src", filePath);
        const destPath = path.join(outputDir, filePath);

        try {
          // Verify source file exists
          if (fs.existsSync(srcPath)) {
            // Ensure destination directory structure exists
            const destDir = path.dirname(destPath);
            fs.mkdirSync(destDir, { recursive: true });

            console.log(`Copying ${srcPath} to ${destPath}`);
            fs.copyFileSync(srcPath, destPath);
            console.log(`Copied ${filePath}`);
          } else {
            console.warn(`Source file ${srcPath} does not exist`);
          }
        } catch (err) {
          console.error(`Error copying ${filePath}: ${err.message}`);
        }
        debounceMap.delete(filePath); // Clean up
      }, DEBOUNCE_MS),
    );
  });

  console.log(
    "watch-copy-modified-files: Watching for non-TypeScript changes in src directory...",
  );
}
