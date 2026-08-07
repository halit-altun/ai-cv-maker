/**
 * Cross-platform production start.
 * Render sets PORT; locally defaults to 3010.
 */
const { spawn } = require("child_process");

const port = String(process.env.PORT || "3010");

const child = spawn("npx", ["next", "start", "-p", port], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
