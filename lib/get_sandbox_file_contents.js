const { sync: commandExistsSync } = require("command-exists");

const path = require("path");
const child_process = require("child_process");
const fs = require("fs");

require("./polyfills");

const BASE_SB = fs
  .readFileSync(path.join(__dirname, "macos", "base.sb"))
  .toString();

const INSTALLER_SB = fs
  .readFileSync(path.join(__dirname, "macos", "installer.sb"))
  .toString();

const NETWORK_SB = fs
  .readFileSync(path.join(__dirname, "macos", "network.sb"))
  .toString();

const HOME = process.env.HOME;
const PATH = process.env.PATH;

const XDG_CONFIG_HOME =
  process.env.XDG_CONFIG_HOME || path.join(HOME, ".config");
const XDG_CACHE_HOME = process.env.XDG_CACHE_HOME || path.join(HOME, ".cache");

function execResultSync(command) {
  return child_process.execSync(command).toString().trim();
}

function toScheme(paths) {
  return paths.map((p) => `(subpath "${p}")`).join("\n");
}

/**
 * `sandbox-exec` is a command in macOS that runs a program in `sandboxd`, roughly
 * the same mechanism as the Mac App Store.
 *
 * `sandbox-exec` is technically deprecated but used throughout the macOS system,
 * even on M1, so it's unlikely to be removed soon.
 *
 * The mechanism is also not super well documented outside of Apple internally,
 * so my understanding of it relies heavily on the profiles in /System/Libraries/Sandbox/Profiles,
 * third-party guides, and the implementation of `DarwinSandboxedSpawnRunner` in Bazel.
 *
 * NOTE: In Apple's sandbox configuration language, the *last* matching rule wins.
 */
module.exports = function getSandboxFileContents(config, workingDir, isInstaller) {
  config = config || {};

  // Take a guess at the Homebrew path if brew itself doesn't exist.
  const homebrewPath = commandExistsSync("brew")
    ? execResultSync("brew --prefix")
    : "/usr/local";

  let sandbox = BASE_SB.replaceAll("WORKING_DIR", workingDir)
    .replaceAll("HOMEBREW_DIR", homebrewPath)
    .replaceAll("NPM_GLOBAL_DIR", execResultSync("npm root -g"))
    .replaceAll("XDG_CONFIG_HOME", XDG_CONFIG_HOME)
    .replaceAll("XDG_CACHE_HOME", XDG_CACHE_HOME)
    .replaceAll("PATH", toScheme(PATH.split(":")))
    .replaceAll("HOME", HOME);

  if (isInstaller) {
    sandbox += "\n" + INSTALLER_SB;
  }

  if (config.network || isInstaller) {
    sandbox += "\n" + NETWORK_SB;
  }

  return sandbox;
};
