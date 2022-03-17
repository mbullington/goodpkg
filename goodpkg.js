#!/usr/bin/env node

const fs = require("fs");
const { default: findWorkspaceRoot } = require("find-workspace-root");

const runCommand = require("./lib/run_command");

const getConfig = require("./lib/get_config");
const getSandboxFilePath = require("./lib/get_sandbox_file_path");
const getSandboxFileContents = require("./lib/get_sandbox_file_contents");

const argv = process.argv.slice(2);

// Grepped from 'v1.22.17', hopefully this is exaustive.
const INSTALLER_YARN_COMMANDS = new Set([
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
const INSTALLER_NPM_COMMANDS = new Set([
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

console.log("⚠️ ⚠️ ⚠️  It's very important you see this!");
console.log("⚠️ ⚠️ ⚠️  Otherwise you're not using goodpkg");

setTimeout(async () => {
  const sandboxFilePath = getSandboxFilePath();

  const cwd = process.cwd();
  const workingDir = (await findWorkspaceRoot(cwd)) || cwd;
  const isInstaller = (isYarn && INSTALLER_YARN_COMMANDS.has(argv[0])) || (isNPM && INSTALLER_NPM_COMMANDS.has(argv[0]));

  const sandboxFile = getSandboxFileContents(config, workingDir, isInstaller);

  fs.writeFileSync(sandboxFilePath, sandboxFile);

  runCommand(
    `sandbox-exec -f ${sandboxFilePath} ${argv.join(" ")}`,
    {
      ...pick(process.env, config.env),
      GOODPKG: "true",
    }
  );
}, 250);
