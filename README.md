# goodpkg

## **IMPORTANT**

While `goodpkg` is still better than nothing, there are still attack vectors that prevent `goodpkg` from being a comprehensive sandboxing solution.

See [Risks](#risks) before blindly trusting `goodpkg`.

## Description

> `goodpkg` is **alpha** quality and should be treated as such!
>
> There's currently some unit tests to ensure sandbox functionality, and
> I've tried it on complex projects with ESBuild and node-gyp. It still may
> not work on all projects (yet).
>
> If `goodpkg` doesn't work for you, please open an issue on [GitHub](https://github.com/mbullington/goodpkg/issues) or directly contribute!

`goodpkg` is a **highly experimental, proof-of-concept** CLI to run NPM/Yarn in a macOS sandbox environment, a similar mechanism to the Mac App Store.

## How can I use it?

> Once it's beyond alpha quality it would be great to publish this directly on NPM.

`yarn global add https://github.com/mbullington/goodpkg.git`

```sh
# Un-sandboxed and open to attack.
yarn
npm install

# Sandboxed and... less open to attack.
goodpkg yarn
goodpkg npm install
```

It's recommended to alias these as `npm="goodpkg npm"` and `yarn="goodpkg yarn"`. `goodpkg` will then be used by default and knows when a command
needs to be sandboxed.

When sandboxed, you'll see a message like the following:

```sh
⚠️ ⚠️ ⚠️  It's very important you see this!
⚠️ ⚠️ ⚠️  Otherwise you're not using goodpkg
```

## What is this

A modern JavaScript codebase can have hundreds of packages beyond those directly referenced by the developer, and each of these packages can specify arbitrary install scripts.

This opens a _huge_ attack vector to either steal personal information or attempt privilege escalation.

**Examples of NPM attacks:**

- https://portswigger.net/daily-swig/vulnerabilities-in-npm-allowed-threat-actors-to-publish-new-version-of-any-package
- https://blog.alexwendland.com/2018-11-20-npm-install-scripts-intro/
- https://blog.expo.dev/ua-parser-js-and-malicious-npm-packages-8c13ee4141a
- https://snyk.io/blog/peacenotwar-malicious-npm-node-ipc-package-vulnerability/

---

A little known feature of macOS is `sandboxd` (related to [App Sandbox](https://developer.apple.com/documentation/security/app_sandbox)), which is available through the command-line via `sandbox-exec`. This allows us to restrict what a command can read, write, access through the network, and more.

`sandbox-exec` is _technically_ deprecated (via `man sandbox-exec`) but used throughout the macOS system, even on Apple Silicon, so it's unlikely to be removed soon.

The mechanism is also not super well documented outside of Apple internally, so my understanding of it relies heavily on the profiles in `/System/Libraries/Sandbox/Profiles`, third-party guides from Mozilla and Chromium, and the implementation of `DarwinSandboxedSpawnRunner` in Bazel.

**Reading on Apple Sandboxing:**

- https://chromium.googlesource.com/chromium/src/+/master/sandbox/mac/seatbelt_sandbox_design.md
- https://reverse.put.as/wp-content/uploads/2011/09/Apple-Sandbox-Guide-v1.0.pdf
- https://github.com/bazelbuild/bazel/blob/b5bbe28ce207375009babc142fd3e8ce915d3dc9/src/main/java/com/google/devtools/build/lib/sandbox/DarwinSandboxedSpawnRunner.java#L328
- https://jmmv.dev/2019/11/macos-sandbox-exec.html
- https://iphonedev.wiki/index.php/Seatbelt

It's also useful to debug blocked resources through searching "sandbox" in `Console.app`.

## What can goodpkg restrict?

You can create a project-specific file at `goodpkg.config.js`. Right now, the only editable fields are `env` and `network`.

```typescript
// Edit this to change how goodpkg runs.
module.exports = {
  // Environment variables to pass to the sandboxed process.
  env: [
    "PWD",
    "PATH",
    "HOME",
    "TMPDIR",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "TERM",
  ],
  // Network is enabled by default, and will always be enabled for
  // "installer" commands.
  network: false,
};
```

By default, `goodpkg` restricts:

- Disable extraneous system interfaces.
- Restrict file reads to:
  - Home directory besides `~/Documents`, `~/Downloads`, etc. unless the Node project is in any of those directories.
  - `/usr/local` and subdirectories.
  - XCode Command Line Tools.
  - Various one-offs found by trial-and-error (ex: for `node-gyp`).
- Restrict file writes to:
  - Working directory and subdirectories.
  - `/dev/null`, `/dev/urandom`
  - Temporary files.

If `network: true` is enabled (the default), network will be enabled with the following restrictions:

- Limited to ports `:22`, `:80`, and `:443`

If you're inside an install command (such as `yarn add <package>`), **network is always on**. In addition, these directories become writable:

- `.npmrc`, `.yarnrc`
- NPM/Yarn caches.
- NPM/Yarn config directories.

## Risks

**READ THIS**

While `goodpkg` is still better than nothing, there are still attack vectors that prevent `goodpkg` from being a comprehensive sandboxing solution.

Ways malicious packages can currently break out of `goodpkg` (non-exaustive):
- [NPM scripts](https://docs.npmjs.com/cli/v8/using-npm/scripts) can modify the NPM cache, config files, perhaps the Node binary itself.
  * NPM/Yarn have no knowledge of `goodpkg`, so directories that need write access for installation can't be deescalated for install scripts.
- Commands have access to `.git`, so currently commit hooks are not sandboxed.
  * `goodpkg` or package managers would most likely have to absorb features from [husky](https://github.com/typicode/husky) to prevent code injection.
- Commands in `node_modules/.bin`—not accessed through the `goodpkg` tool—are not sandboxed.
- Editors such as VSCode load ESLint, Prettier, etc directly and as such, are also not sandboxed.

A long-term goal of `goodpkg` would be for the `goodpkg` tool itself to go away, and create a comprehensive sandboxing solution that:

1. Has a standardized JSON schema.
2. Has first-class support in NPM, Yarn, and PNPM.
3. Has first-class support in major VSCode plugins and VSCode itself.

## License

`goodpkg` is under the MIT License.
