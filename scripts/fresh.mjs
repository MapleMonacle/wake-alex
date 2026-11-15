// On hackathon day: `npm run fresh -- <project-name>`
// Copies this kit to ../<project-name>, renames it, git-inits with one clearly-labelled
// "starter kit" commit (so judges can see exactly what was pre-made), and installs deps.
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(dirname(fileURLToPath(import.meta.url)));
const name = (process.argv[2] ?? "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
if (!name) {
  console.error("usage: npm run fresh -- <project-name>");
  process.exit(1);
}
const dest = resolve(here, "..", name);
if (existsSync(dest)) {
  console.error(`${dest} already exists`);
  process.exit(1);
}

const SKIP = new Set(["node_modules", "dist", ".wrangler", ".git", "PREP.md", "IDEAS.md", "PLAN.md"]);
cpSync(here, dest, { recursive: true, filter: (src) => !SKIP.has(basename(src)) });

const edit = (file, fn) => writeFileSync(join(dest, file), fn(readFileSync(join(dest, file), "utf8")));
edit("package.json", (s) => s.replace(/"name": "[^"]+"/, `"name": "${name}"`));
edit("wrangler.jsonc", (s) => s.replace(/"name": "[^"]+"/, `"name": "${name}"`));
edit("README.md", (s) => s.replace("# PROJECT NAME", `# ${name}`));

const run = (cmd) => execSync(cmd, { cwd: dest, stdio: "inherit" });
run("git init -b main");
run("git add -A");
run('git commit -q -m "Starter kit (prepared before the event): tooling only, no project code"');
run("npm install --silent");

console.log(`
Ready: ${dest}

  cd ../${name}
  npm run dev                                   # http://localhost:5173  (toolbox at /kit)
  gh repo create ${name} --public --source . --push
  npm run deploy                                # public URL for the demo QR
`);
