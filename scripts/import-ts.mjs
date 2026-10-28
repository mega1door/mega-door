import ts from "typescript";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Bundle pure TypeScript helpers for Node scripts/tests without emitting files.
export async function importTS(entry) {
  async function moduleUrl(file) {
    let source = ts.transpileModule(await readFile(file, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } }).outputText;
    for (const match of [...source.matchAll(/from ["'](\.[^"']+)["']/g)]) {
      const dependency = await moduleUrl(path.resolve(path.dirname(file), match[1] + ".ts"));
      source = source.replace(match[0], `from "${dependency}"`);
    }
    return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  }
  return import(await moduleUrl(path.resolve(entry)));
}
