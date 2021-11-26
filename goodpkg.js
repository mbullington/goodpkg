// Edit this part to change how goodpkg runs.
const OPTIONS = {
  network: true,
  allowEnv: [
    "PWD",
    "PATH",
    "HOME",
    "TMPDIR",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
  ],
};

const fs = require("fs");
const os = require("os");
const path = require("path");
const child_process = require("child_process");

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

/**
 * Just run the command and pipe everything, ala
 * a shell script.
 */
function runCommand(command, env) {
  process.stdin.setRawMode(true);

  const child = child_process.spawn(command, {
    cwd: process.cwd(),
    shell: true,
    env,
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    process.exit(code);
  });
}

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
  (isNPM && command && !RESTRICTED_NPM_COMMANDS.has(command))
) {
  // Just run the command.
  runCommand(argv.join(" "), process.env);
  return;
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
 * Recommended reading:
 * https://reverse.put.as/wp-content/uploads/2011/09/Apple-Sandbox-Guide-v1.0.pdf
 * https://github.com/bazelbuild/bazel/blob/b5bbe28ce207375009babc142fd3e8ce915d3dc9/src/main/java/com/google/devtools/build/lib/sandbox/DarwinSandboxedSpawnRunner.java#L328
 * https://jmmv.dev/2019/11/macos-sandbox-exec.html
 * https://wiki.mozilla.org/Sandbox/Mac/Debugging
 *
 * NOTE: In Apple's sandbox configuration language, the *last* matching rule wins.
 */
function getSandboxFileContents() {
  const cwd = process.cwd();
  const home = process.env.HOME;

  const configDir = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  const cacheDir = process.env.XDG_CACHE_HOME || path.join(home, ".cache");

  const yarnGlobalDir = path.join(home, ".yarn");
  const yarnCacheDir = path.join(cacheDir, "yarn");

  const npmGlobalDir = path.join(home, ".npm");
  const npmRootGlobal = child_process.execSync("npm root -g").toString().trim();

  const inaccessiblePaths = [
    "Documents",
    "Downloads",
    "Movies",
    "Music",
    "Pictures",
  ]
    .map((dirname) => {
      const dir = path.join(home, dirname);
      const isIn = cwd.startsWith(dir);

      if (isIn) return;
      return dir;
    })
    .filter(Boolean);

  return `
(version 1)

(deny default)

(import "/System/Library/Sandbox/Profiles/bsd.sb")

(allow process-fork)
(allow process-exec)
(allow lsopen)

(allow file-read*
    ${process.env.PATH.split(":")
      .map((p) => `(subpath "${p}")`)
      .join("\n")}

    ;; Allow reading home directory.
    (subpath "${process.env.HOME}")

    ;; Homebrew is just too difficult to track and is owned by the user.
    (subpath "/usr/local")

    ;; XCode paths for node-gyp and node-pre-gyp
    (subpath "/System/Libraries")
    (subpath "/Applications/Xcode.app")
    (subpath "/Library/Developer")

    ;; FIX: xcodebuild uses this. https://www.mulle-kybernetik.com/weblog/2015/xcodebuild_driving_me_nuts_ag.html
    (literal "/Library/Preferences/com.apple.dt.Xcode.plist")
    ;; FIX: ESBuild uses this?
    (literal "/Users")
)

(deny file-read*
    ${inaccessiblePaths.map((p) => `(subpath "${p}")`).join("\n")}    
)

(deny file-write*)
(allow file-read* file-write*
    ;; Working directory.
    (subpath "${cwd}")

    ;; Default yarn places.
    (subpath "${yarnGlobalDir}")
    (subpath "${configDir}")
    (subpath "${yarnCacheDir}")

    ;; Default NPM places.
    (subpath "${npmGlobalDir}")
    (subpath "${npmRootGlobal}")
    
    ;; Temp files.
    (subpath "/private/var/folders/")

    ;; Various stuff needed through trial-and-error.
    (literal "/dev/null")
)

;; We can only really filter by port here.
(deny network*)
${
  OPTIONS.network
    ? `
(allow network* (remote ip \"*:80\"))
(allow network* (remote ip \"*:443\"))
(allow network* (remote unix-socket))
`
    : ""
}
    `;
}

/**
 * Make a tmp directory for our profile and write the profile to it,
 * returning the path to the profile.
 */
function getSandboxFilePath() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodpkg-"));
  return path.join(tmpDir, "sandbox.sb");
}

console.log("⚠️ ⚠️ ⚠️  It's very important you see this!");
console.log("⚠️ ⚠️ ⚠️  Otherwise you're not using goodpkg");

setTimeout(() => {
  const sandboxFilePath = getSandboxFilePath();
  const sandboxFile = getSandboxFileContents();

  console.log(sandboxFilePath);

  fs.writeFileSync(sandboxFilePath, sandboxFile);

  runCommand(
    `sandbox-exec -f ${sandboxFilePath} ${argv.join(" ")}`,
    pick(process.env, OPTIONS.allowEnv)
  );
}, 2500);