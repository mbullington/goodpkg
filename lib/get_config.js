const fs = require("fs");
const path = require("path");

const DEFAULTS = {
  allowEnv: [
    "PWD",
    "PATH",
    "HOME",
    "TMPDIR",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "TERM",
  ],
  writeYarnrc: false,
};

const CONFIG_DIR = path.join(
  process.env.XDG_CONFIG_HOME || path.join(HOME, ".config"),
  "goodpkg"
);
const CONFIG_JS_PATH = path.join(CONFIG_DIR, "config.js");

/**
 * Make a tmp directory for our profile and write the profile to it,
 * returning the path to the profile.
 */
module.exports = function getConfig() {
  if (fs.existsSync(CONFIG_DIR) && fs.existsSync(CONFIG_JS_PATH)) {
    return {
      ...DEFAULTS,
      ...require(CONFIG_JS_PATH),
    };
  } else {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR);
    }

    fs.writeFileSync(
      CONFIG_JS_PATH,
      `
// Edit this to change how goodpkg runs.
module.exports = {
    // Environment variables to pass to the sandboxed process.
    allowEnv: ${JSON.stringify(DEFAULTS.allowEnv, null, 2)
      .split("\n")
      .join("\n    ")},
    // This is disabled by default to prevent malicious behavior.
    writeYarnrc: ${DEFAULTS.writeYarnrc}
}
`
    );

    return DEFAULTS;
  }
};
