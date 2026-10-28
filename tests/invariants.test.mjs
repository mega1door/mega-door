import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const baseline = file => execFileSync("git", ["show", `HEAD:${file}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
test("AC-07 palette, mobile home, drag behavior and existing automation remain unchanged", async () => {
  for (const file of ["src/lib/specTemplatesStore.ts", "src/index.css", "src/styles/brand-colors.css", ".github/workflows/deploy-pages.yml"]) {
    assert.equal((await readFile(file, "utf8")).replace(/\r\n/g, "\n"), baseline(file), file);
  }
  const changed = execFileSync("git", ["diff", "--name-only"], { encoding: "utf8" }).split(/\r?\n/);
  assert.ok(!changed.some(file => /DragScroller|gallery\.ts|SwipeBackGesture/.test(file)));
  // The approved desktop component replaces only the desktop branch. Mobile and hero logic stay exact.
  const home = (await readFile("src/pages/HomePage.tsx", "utf8")).replace(/\r\n/g, "\n")
    .replace('import DesktopCatalog from "../components/DesktopCatalog";', 'import MobileCategoryShowcase from "../components/MobileCategoryShowcase";')
    .replace('<DesktopCatalog />', '<MobileCategoryShowcase />');
  assert.equal(home, baseline("src/pages/HomePage.tsx"));
});

function attributes(source, names = ["className", "style", "src", "width", "height"]) {
    source = source.replace(/\r\n/g, "\n");
    const file = ts.createSourceFile("view.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const values = [];
    function visit(node) {
      if (ts.isJsxAttribute(node) && names.includes(node.name.getText(file))) values.push(node.getText(file));
      ts.forEachChild(node, visit);
    }
    visit(file); return values;
}

test("AC-07 model views and header preserve every layout/class/style/image-source attribute", async () => {
  for (const file of ["src/components/ProductCard.tsx", "src/pages/ModelDetailPage.tsx", "src/components/Header.tsx"]) {
    // Only lg overrides were removed from the shared card; its mobile attributes remain exact.
    const expected = file.endsWith("ProductCard.tsx") ? baseline(file).replace(/\blg:[^\s"'`]+/g, "") : baseline(file);
    assert.deepEqual(attributes(await readFile(file, "utf8")), attributes(expected), file);
  }
});

test("AC6 requested form fields and preview reorder retain existing styling; carousel retains its layout", async () => {
  for (const file of ["src/components/admin/ModelForm.tsx", "src/components/admin/BulkModelForm.tsx", "src/pages/AdminPage.tsx"]) {
    const current = attributes(await readFile(file, "utf8"));
    const remaining = [...current];
    for (const attribute of attributes(baseline(file))) {
      const index = remaining.indexOf(attribute);
      assert.ok(index >= 0, `${file}: original attribute removed: ${attribute}`);
      remaining.splice(index, 1);
    }
  }
  const file = "src/components/SwipeCarousel.tsx";
  const layout = ["className", "style", "width", "height"];
  assert.deepEqual(attributes(await readFile(file, "utf8"), layout), attributes(baseline(file), layout));
});
