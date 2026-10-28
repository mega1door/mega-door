import ts from "typescript";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

/** Runs the real module with explicitly supplied imports. No production client/network. */
export async function isolatedModule(file, imports, globals = {}) {
  const source = await readFile(file, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  new vm.Script(code, { filename: file }).runInNewContext({
    module, exports: module.exports, console,
    require(name) { if (!(name in imports)) throw Error(`Unexpected import: ${name}`); return imports[name]; },
    ...globals,
  });
  return module.exports;
}
