const fs = require("fs");

const runCommand = require("../lib/run_command");
const getSandboxFilePath = require("../lib/get_sandbox_file_path");
const getSandboxFileContents = require("../lib/get_sandbox_file_contents");

const sandboxFilePath = getSandboxFilePath();
const sandboxFile = getSandboxFileContents({}, process.cwd());

fs.writeFileSync(sandboxFilePath, `
${sandboxFile}

;; COMMAND LINE

(allow file*
    (literal "/dev/ttys000")
    (literal "/dev/ttys001")
    (literal "/dev/ttys002")
    (literal "/dev/ttys003")
    (literal "/dev/ttys004")
    (literal "/dev/ttys005")
    (literal "/dev/ttys006")
    (literal "/dev/ttys007")
    (literal "/dev/ttys008")
    (literal "/dev/ttys009")
)
`);

runCommand(
  `sandbox-exec -f ${sandboxFilePath} /usr/bin/env zsh`,
  process.env
);
