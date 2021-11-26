# goodpkg

> `goodpkg` is **alpha** quality and should be treated as such! There's currently no unit tests to ensure sandbox functionality.
>
> Although it's probably still better than nothing and I've tried manually testing each rule.

`goodpkg` is a proof-of-concept CLI to run NPM/Yarn in a macOS sandbox environment, a similar mechanism to the Mac App Store.

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

A little known feature of macOS is `sandboxd` (related to [App Sandbox](https://developer.apple.com/documentation/security/app_sandbox)), which is available through the command-line via `sandbox-exec`. This allows us to restrict what a command can read, write, access through the network, and more.

`sandbox-exec` is _technically_ deprecated (via `man sandbox-exec`) but used throughout the macOS system, even on Apple Silicon, so it's unlikely to be removed soon.

The mechanism is also not super well documented outside of Apple internally, so my understanding of it relies heavily on the profiles in `/System/Libraries/Sandbox/Profiles`, third-party guides, and the implementation of `DarwinSandboxedSpawnRunner` in Bazel.

**Reading on Apple Sandboxing:**

- https://reverse.put.as/wp-content/uploads/2011/09/Apple-Sandbox-Guide-v1.0.pdf
- https://github.com/bazelbuild/bazel/blob/b5bbe28ce207375009babc142fd3e8ce915d3dc9/src/main/java/com/google/devtools/build/lib/sandbox/DarwinSandboxedSpawnRunner.java#L328
- https://jmmv.dev/2019/11/macos-sandbox-exec.html
- Debugging resources: https://wiki.mozilla.org/Sandbox/Mac/Debugging

## What can goodpkg restrict?

- Disable extraneous system interfaces.
- Restrict file reads to:
  - Home directory (and subdirectories) besides `~/Documents`, `~/Downloads`, etc. unless the Node project is in any of those directories.
  - `/usr/local` and subdirectories.
  - XCode Command Line Tools.
  - Various one-offs found by trial-and-error.
- Restrict file writes to:
  - Working directory and subdirectories.
  - NPM/Yarn caches.
  - NPM/Yarn config directories.
  - Temporary files.
  - `/dev/null`
- Restrict network to ports `:80` and `:443`
- Restrict ENV variables to this list: https://github.com/mbullington/goodpkg/blob/main/goodpkg#L6

## License

`goodpkg` is under the MIT License.
