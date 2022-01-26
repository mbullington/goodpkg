#!/usr/bin/env node

const fs = require("fs");

const runCommand = require("./lib/run_command");

const getConfig = require("./lib/get_config");
const getSandboxFilePath = require("./lib/get_sandbox_file_path");
const getSandboxFileContents = require("./lib/get_sandbox_file_contents");

const argv = process.argv.slice(2);

// Grepped from 'v1.22.17', hopefully this is exaustive.
const RESTRICTED_YARN_COMMANDS = new Set([
  "add",
  "install",
  "remove",
  "link",
  "upgrade",
  "upgrade-interactive",
  "create",
  "generate-lock-entry",
  "global",
  "import",
  "publish",
  "cache",
]);

// Grepped from '6.14.17', hopefully this is exaustive.
const RESTRICTED_NPM_COMMANDS = new Set([
  "cache",
  "ci",
  "doctor",
  "install",
  "install-ci-test",
  "install-test",
  "link",
  "prune",
  "remove",
  "rebuild",
  "uninstall",
  "update",
]);

/**
 * This is basically the same as lodash/pick I just
 * let GitHub Copilot write it.
 */
function pick(obj, keys) {
  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}

const config = getConfig();
const isYarn = argv[0] === "yarn";
const isNPM = argv[0] === "npm";

if (!isYarn && !isNPM) {
  throw new Error("Non-yarn/npm commands not currently supported!");
  return;
}

// Make sure the command should be restricted.

const command = argv[1];
if (
  (isYarn &&
    command &&
    !command.startsWith("-") &&
    !RESTRICTED_YARN_COMMANDS.has(command)) ||
  (isNPM && command && !RESTRICTED_NPM_COMMANDS.has(command)) ||
  command.indexOf("-g") > -1 ||
  command.indexOf("--global") > -1
) {
  // Just run the command.
  runCommand(argv.join(" "), process.env);
  return;
}

console.log("⚠️ ⚠️ ⚠️  It's very important you see this!");
console.log("⚠️ ⚠️ ⚠️  Otherwise you're not using goodpkg");

setTimeout(() => {
  const sandboxFilePath = getSandboxFilePath();
  const sandboxFile = getSandboxFileContents(config);

  fs.writeFileSync(sandboxFilePath, sandboxFile);

  runCommand(
    `sandbox-exec -f ${sandboxFilePath} ${argv.join(" ")}`,
    pick(process.env, config.allowEnv)
  );
}, 2500);
