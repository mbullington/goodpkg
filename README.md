# goodpkg

> `goodpkg` is **alpha** quality and should be treated as such! There's currently no unit tests to ensure sandbox functionality.
>
> Although it's probably still better than nothing.

## What is this

`goodpkg` is a proof-of-concept to run NPM/Yarn in a sandboxed environment on macOS.

A modern JavaScript codebase can have hundreds of packages beyond those directly referenced by the developer, and each of those have their own dependencies, their own, etc... Since NPM packages can specify arbitrary install scripts, this opens a huge attack vector to either steal personal information or attempt privilege escalation. 

**Reading on NPM vectors:**
- https://portswigger.net/daily-swig/vulnerabilities-in-npm-allowed-threat-actors-to-publish-new-version-of-any-package
- https://blog.alexwendland.com/2018-11-20-npm-install-scripts-intro/

A little known feature of macOS I just learned about the other day is the Sandbox environment used by the Mac App Store is also available through the command-line via `sandbox-exec`! This allows us to restrict what a command can read, write, access through the network, and more.

`sandbox-exec` is technically deprecated but used throughout the macOS system, even on M1, so it's unlikely to be removed soon.

The mechanism is also not super well documented outside of Apple internally, so my understanding of it relies heavily on the profiles in `/System/Libraries/Sandbox/Profiles`, third-party guides, and the implementation of `DarwinSandboxedSpawnRunner` in Bazel.

**Reading on Apple Sandboxing:**
 * https://reverse.put.as/wp-content/uploads/2011/09/Apple-Sandbox-Guide-v1.0.pdf
 * https://github.com/bazelbuild/bazel/blob/b5bbe28ce207375009babc142fd3e8ce915d3dc9/src/main/java/com/google/devtools/build/lib/sandbox/DarwinSandboxedSpawnRunner.java#L328
 * https://jmmv.dev/2019/11/macos-sandbox-exec.html

## How can I use it?

> Once it's beyond alpha quality it would be great to publish this directly on NPM.

`goodpkg` requires Node.js v4.0.0 or up to be available in your `PATH`.

Make sure to add `goodpkg` somewhere in your `PATH` and make it executable `chmod +x`.

Then just do `goodpkg yarn`, `goodpkg npm ci`, etc...!

## License

`goodpkg` is under the MIT License.
