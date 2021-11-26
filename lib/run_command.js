const child_process = require("child_process");

/**
 * Just run the command and pipe everything, ala
 * a shell script.
 */
module.exports = function runCommand(command, env) {
  const child = child_process.spawn(command, {
    cwd: process.cwd(),
    shell: true,
    env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    process.exit(code);
  });
};
