const { cosmiconfig } = require('cosmiconfig');

const DEFAULTS = {
  env: [
    "PWD",
    "PATH",
    "HOME",
    "TMPDIR",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "TERM",
  ],
  network: true,
};

const explorerSync = cosmiconfigSync('goodpkg');

/**
 * Make a tmp directory for our profile and write the profile to it,
 * returning the path to the profile.
 */
module.exports = function getConfig() {
  const searchedFor = explorerSync.search();
  const loaded = explorerSync.load(pathToConfig);

  return {
    ...DEFAULTS,
    ...loaded
  };
};
