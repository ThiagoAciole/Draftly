import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const bumpType = process.argv[2] ?? "patch";
const allowedBumps = new Set(["patch", "minor", "major"]);
const versionFiles = [
  "package.json",
  "package-lock.json",
  "src-tauri/tauri.conf.json",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
];

process.chdir(root);

function executable(command) {
  return process.platform === "win32" && command === "npm" ? "npm.cmd" : command;
}

function run(command, args, options = {}) {
  const result = spawnSync(executable(command), args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    const detail = options.capture ? `\n${result.stderr || result.stdout}` : "";
    throw new Error(`${command} ${args.join(" ")} falhou.${detail}`);
  }

  return result;
}

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function write(path, content) {
  writeFileSync(join(root, path), content, "utf8");
}

function writeJson(path, value) {
  write(path, `${JSON.stringify(value, null, 2)}\n`);
}

function nextVersion(current, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) throw new Error(`Versão atual inválida: ${current}`);

  let [, major, minor, patch] = match.map(Number);
  if (type === "major") [major, minor, patch] = [major + 1, 0, 0];
  if (type === "minor") [minor, patch] = [minor + 1, 0];
  if (type === "patch") patch += 1;
  return `${major}.${minor}.${patch}`;
}

function replaceCargoPackageVersion(content, version) {
  const next = content.replace(
    /(\[package\][\s\S]*?\nversion = ")[^"]+("\r?\n)/,
    (_, prefix, suffix) => `${prefix}${version}${suffix}`,
  );
  if (next === content) throw new Error("Não foi possível atualizar src-tauri/Cargo.toml.");
  return next;
}

function replaceCargoLockVersion(content, version) {
  const next = content.replace(
    /(\[\[package\]\]\r?\nname = "draftly"\r?\nversion = ")[^"]+("\r?\n)/,
    (_, prefix, suffix) => `${prefix}${version}${suffix}`,
  );
  if (next === content) throw new Error("Não foi possível atualizar src-tauri/Cargo.lock.");
  return next;
}

if (!allowedBumps.has(bumpType)) {
  console.error("Use patch, minor ou major. Exemplo: npm run release:patch");
  process.exit(1);
}

const status = run("git", ["status", "--porcelain"], { capture: true }).stdout.trim();
if (status) {
  console.error("A release exige o Git limpo. Faça commit das alterações antes de continuar.");
  process.exit(1);
}

const original = Object.fromEntries(versionFiles.map((path) => [path, read(path)]));
const packageJson = JSON.parse(original["package.json"]);
const version = nextVersion(packageJson.version, bumpType);
const tag = `v${version}`;

const existingTag = run("git", ["rev-parse", "--verify", `refs/tags/${tag}`], {
  capture: true,
  allowFailure: true,
});
if (existingTag.status === 0) {
  console.error(`A tag ${tag} já existe.`);
  process.exit(1);
}

try {
  packageJson.version = version;
  writeJson("package.json", packageJson);

  const packageLock = JSON.parse(original["package-lock.json"]);
  packageLock.version = version;
  packageLock.packages[""].version = version;
  writeJson("package-lock.json", packageLock);

  const tauriConfig = JSON.parse(original["src-tauri/tauri.conf.json"]);
  tauriConfig.version = version;
  writeJson("src-tauri/tauri.conf.json", tauriConfig);

  write("src-tauri/Cargo.toml", replaceCargoPackageVersion(original["src-tauri/Cargo.toml"], version));
  write("src-tauri/Cargo.lock", replaceCargoLockVersion(original["src-tauri/Cargo.lock"], version));

  console.log(`\nPreparando Draftly ${tag}...\n`);
  run("npm", ["test"]);
  run("npm", ["run", "build"]);
  run("cargo", ["check", "--manifest-path", "src-tauri/Cargo.toml"]);
} catch (error) {
  for (const [path, content] of Object.entries(original)) write(path, content);
  console.error(`\nRelease cancelada e versões restauradas: ${error.message}`);
  process.exit(1);
}

run("git", ["add", ...versionFiles]);
run("git", ["commit", "-m", `chore(release): ${tag}`]);
run("git", ["tag", "-a", tag, "-m", `Draftly ${tag}`]);

try {
  run("git", ["push", "origin", "HEAD"]);
  run("git", ["push", "origin", tag]);
} catch (error) {
  console.error(`\nA versão e a tag foram criadas localmente, mas o envio falhou: ${error.message}`);
  console.error(`Tente novamente com: git push origin HEAD && git push origin ${tag}`);
  process.exit(1);
}

console.log(`\n${tag} enviada. O GitHub Actions iniciou a geração dos instaladores.`);
