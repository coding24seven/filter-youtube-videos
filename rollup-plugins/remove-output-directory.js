import { execSync } from "child_process";

export default {
  name: "remove-output-directory",
  buildStart() {
    removeOutputDirectory();
  },
};

function removeOutputDirectory() {
  execSync("rm -rf output", { stdio: "inherit" });
}
