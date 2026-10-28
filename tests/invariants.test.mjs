import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const baseline = file => execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
test("AC-07 admin/bulk forms, styles, home, carousel and existing automation remain unchanged", async () => {
  for (const file of ["src/components/admin/BulkModelForm.tsx", "src/components/admin/ModelForm.tsx", "src/pages/AdminPage.tsx", "src/lib/specTemplatesStore.ts", "src/pages/HomePage.tsx", ".github/workflows/deploy-pages.yml"]) {
    assert.equal((await readFile(file, "utf8")).replace(/\r\n/g, "\n"), baseline(file), file);
  }
  const changed = execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" }).split(/\r?\n/);
  assert.ok(!changed.some(file => /\.(css|scss)$|DragScroller|gallery\.ts|SwipeCarousel|SwipeBackGesture/.test(file)));
});

test("AC-07 modified model views preserve every layout/class/style/image-source attribute", async () => {
  function attributes(source) {
    source = source.replace(/\r\n/g, "\n");
    const file = ts.createSourceFile("view.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const values = [];
    function visit(node) {
      if (ts.isJsxAttribute(node) && ["className", "style", "src", "width", "height"].includes(node.name.getText(file))) values.push(node.getText(file));
      ts.forEachChild(node, visit);
    }
    visit(file); return values;
  }
  for (const file of ["src/components/ProductCard.tsx", "src/pages/ModelDetailPage.tsx"]) {
    assert.deepEqual(attributes(await readFile(file, "utf8")), attributes(baseline(file)), file);
  }
});
