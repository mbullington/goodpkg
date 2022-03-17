const fs = require("fs");

const runCommand = require("../lib/run_command");
const getSandboxFilePath = require("../lib/get_sandbox_file_path");
const getSandboxFileContents = require("../lib/get_sandbox_file_contents");

const sandboxFilePath = getSandboxFilePath();
const sandboxFile = getSandboxFileContents({}, process.cwd(), true);

fs.writeFileSync(sandboxFilePath, sandboxFile);

runCommand(
  `sandbox-exec -f ${sandboxFilePath} ./node_modules/.bin/jest`,
  process.env
);
