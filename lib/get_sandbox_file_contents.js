const path = require("path");
const child_process = require("child_process");

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
  const cwd = process.cwd();
  const home = process.env.HOME;

  const configDir = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  const cacheDir = process.env.XDG_CACHE_HOME || path.join(home, ".cache");

  const yarnGlobalDir = path.join(home, ".yarn");
  const yarnCacheDir = path.join(cacheDir, "yarn");

  const npmGlobalDir = path.join(home, ".npm");
  const npmRootGlobal = child_process.execSync("npm root -g").toString().trim();

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
      const dir = path.join(home, dirname);
      const isIn = cwd.startsWith(dir);

      if (isIn) return;
      return dir;
    })
    .filter(Boolean);

  const libraryPreferencesPath = path.join(home, "Library/Preferences");
  const libraryDeveloperPath = path.join(home, "Library/Developer");
  const nodeGypPath = path.join(home, "Library/Caches/node-gyp");

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
      (subpath "/Library")
      (subpath "${libraryPreferencesPath}")
      (subpath "${libraryDeveloperPath}")

      ;; FIX: ESBuild uses this?
      (literal "/")
      (literal "/Users")
  )

  (deny file-read*
      (subpath "/Library/Caches")
      (subpath "/Library/Keychains")
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
