const path = require("path");
const child_process = require("child_process");

const { sync: commandExistsSync } = require("command-exists");

const CWD = process.cwd();
const HOME = process.env.HOME;
const PATH = process.env.PATH;

const CONFIG_DIR = process.env.XDG_CONFIG_HOME || path.join(HOME, ".config");
const CACHE_DIR = process.env.XDG_CACHE_HOME || path.join(HOME, ".cache");

function toLisp(paths) {
  return paths.map((p) => `(subpath "${p}")`).join("\n");
}

function execResultSync(command) {
  return child_process.execSync(command).toString().trim();
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
module.exports = function getSandboxFileContents() {
  const yarnGlobalDir = path.join(HOME, ".yarn");
  const yarnCacheDir = path.join(CACHE_DIR, "yarn");

  const npmGlobalDir = path.join(HOME, ".npm");
  const npmRootGlobal = execResultSync("npm root -g");

  // Take a guess at the Homebrew path if brew itself doesn't exist.
  const homebrewPath = commandExistsSync("brew")
    ? execResultSync("brew --prefix")
    : "/usr/local";
  const nodeGypPath = path.join(HOME, "Library/Caches/node-gyp");

  // Paths to restrict read access to.
  // Because the last matching rule wins, these go first.
  const inaccessiblePaths = [
    ".Trash",
    "Documents",
    "Downloads",
    "Movies",
    "Music",
    "Pictures",
    "Library",
  ]
    .map((dirname) => {
      const dir = path.join(HOME, dirname);
      const isIn = CWD.startsWith(dir);

      if (isIn) return;
      return dir;
    })
    .filter(Boolean);

  // Paths inside the inaccessible paths we'd then... want to access.
  const accessiblePaths = ["Library/Preferences", "Library/Developer"].map(
    (dirname) => path.join(HOME, dirname)
  );

  return `
  (version 1)
  
  (deny default)
  
  (import "/System/Library/Sandbox/Profiles/bsd.sb")
  
  (allow process-fork)
  (allow process-exec)
  (allow lsopen)
  
  (deny file-read*)
  (deny file-read* (subpath "/"))
  (allow file-read*
      ${toLisp(PATH.split(":"))}
  
      ;; Allow reading home directory.
      (subpath "${HOME}")
  
      ;; Homebrew is just too difficult to track and is owned by the user.
      (subpath "${homebrewPath}")
      ;; Same deal with MacPorts, although I've never used it.
      (subpath "/opt/local")
  
      ;; XCode paths for node-gyp and node-pre-gyp
      (subpath "/System/Libraries")
      (subpath "/Applications/Xcode.app")
      (subpath "/Library")

      ;; FIX: ESBuild uses this?
      (literal "/")
      (literal "/Users")
  )

  (deny file-read*
      (subpath "/Library/Caches")
      (subpath "/Library/Keychains")
      ${toLisp(inaccessiblePaths)}    
  )

  (allow file-read*
    (subpath "/Library/Caches")
    (subpath "/Library/Keychains")
    ${toLisp(accessiblePaths)}    
  )
  
  (deny file-write*)
  (allow file-read* file-write*
      ;; Working directory.
      (subpath "${CWD}")
  
      ;; Default yarn places.
      (subpath "${yarnGlobalDir}")
      (subpath "${CONFIG_DIR}")
      (subpath "${yarnCacheDir}")
  
      ;; Default NPM places.
      (subpath "${npmGlobalDir}")
      (subpath "${npmRootGlobal}")
      
      ;; Temp files.
      (subpath "/private/var/folders/")

      ;; node-gyp
      (subpath "${nodeGypPath}")
  
      ;; Various stuff needed through trial-and-error.
      (literal "/dev/null")
  )
  
  ;; We can only really filter by port here.
  (deny network*)
  (allow network* (remote ip \"*:22\"))
  (allow network* (remote ip \"*:80\"))
  (allow network* (remote ip \"*:443\"))
  (allow network* (remote unix-socket))
      `;
};
