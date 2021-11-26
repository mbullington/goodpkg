const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * Make a tmp directory for our profile and write the profile to it,
 * returning the path to the profile.
 */
module.exports = function getSandboxFilePath() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "goodpkg-"));
  return path.join(tmpDir, "sandbox.sb");
};
