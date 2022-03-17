const path = require("path");
const fs = require("fs");
const http = require("http");

describe("sandbox", () => {
  const CWD = process.cwd();
  const HOME = process.env.HOME;

  test("blocks readdir", () => {
    expect(() => {
      fs.readdirSync("/var/lib");
    }).toThrow();

    expect(() => {
      fs.readdirSync("/Users");
    }).not.toThrow();

    expect(() => {
      fs.readdirSync(HOME);
    }).not.toThrow();

    expect(() => {
      fs.readdirSync(CWD);
    }).not.toThrow();

    const inaccessiblePaths = [
      ".Trash",
      "Library",
      "Documents",
      "Downloads",
      "Movies",
      "Music",
      "Pictures",
    ];

    inaccessiblePaths.forEach((path) => {
      expect(() => {
        fs.readdirSync(path.join(HOME, path));
      }).toThrow();
    });
  });

  test("does not block stat", () => {
    expect(() => {
      fs.statSync("/");
    }).not.toThrow();

    expect(() => {
      fs.statSync("/usr/lib");
    }).not.toThrow();

    expect(() => {
      fs.statSync("/Users");
    }).not.toThrow();
  });

  test("blocks readFile", () => {
    expect(() => {
      fs.readFileSync(
        path.join(HOME, "Library/Caches/com.apple.accountsd/Cache.db")
      );
    }).toThrow();

    expect(() => {
      fs.readFileSync(path.join(HOME, ".ssh/id_ed25519"));
    }).toThrow();

    expect(() => {
      fs.readFileSync(path.join(CWD, "goodpkg.js"));
    }).not.toThrow();
  });

  test("blocks writeFile", () => {
    expect(() => {
      fs.writeFileSync(path.join(CWD, "safe"), "");
    }).not.toThrow();

    expect(() => {
      fs.writeFileSync(path.join(HOME, "unsafe"), "");
    }).toThrow();
  });

  test("blocks delete", () => {
    expect(() => {
      fs.rmSync(path.join(CWD, "safe"));
    }).not.toThrow();

    expect(() => {
      fs.rmSync(path.join(HOME, "Desktop"));
    }).toThrow();
  });

  test("blocks network to non-443 non-80 ports", async () => {
    const promise = new Promise((resolve, reject) => {
      const req = http.get("http://github.com:8080");
      req.on("error", (err) => {
        reject(err);
      });
    });

    try {
      await promise;
      expect(0).toBe(1);
    } catch (err) {
      expect(err).toBeTruthy();
      expect(err.message.indexOf("EPERM")).toBeGreaterThan(-1);
    }
  });

  test("allows network to 80 ports", async () => {
    const promise = new Promise((resolve, reject) => {
      const req = http.get("http://github.com:80");
      req.on("error", (err) => {
        reject(err);
      });
      req.on("response", (res) => {
        resolve(res);
      });
    });

    await promise;
  });
});
