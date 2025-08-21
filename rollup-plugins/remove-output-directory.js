import { execSync } from "child_process";

export default function removeOutputDirectory() {
  execSync("rm -rf output", { stdio: "inherit" });
}
