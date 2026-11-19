// The package README's API reference lists every export (plan WP6, extra X1). Later milestones import
// this package from the README, so an export missing from it is an export they can't find. This test
// reads the source files as text, because types leave nothing at run time, and fails on each export
// the README doesn't name in code, such as `filterBy` or `sumBy<Entry>(...)`.
//
// It covers what other code imports: src/types/, src/utils/ and src/data/. The test page's own
// modules (src/page/) and the demo are not part of the package's API.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packageRoot = join(import.meta.dirname, "..");
const apiFolders = ["src/types", "src/utils", "src/data"];
const exportPattern = /^export\s+(?:function|const|let|type|interface|class)\s+([A-Za-z_$][\w$]*)/gm;

function exportedNames(relativeFile: string): string[] {
  const source = readFileSync(join(packageRoot, relativeFile), "utf8");
  return [...new Set([...source.matchAll(exportPattern)].map((match) => match[1] as string))];
}

const apiFiles = apiFolders.flatMap((folder) =>
  readdirSync(join(packageRoot, folder))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => `${folder}/${file}`),
);
const readme = readFileSync(join(packageRoot, "README.md"), "utf8");

/** True when the README names the export in code: `name`, `name(...)` or `name<...>`. */
function readmeNames(name: string): boolean {
  return new RegExp("`" + name.replace(/\$/g, "\\$") + "[`(<]").test(readme);
}

describe("the README's API reference", () => {
  test("the source files are found, so the checks below run on something", () => {
    assert.ok(apiFiles.includes("src/utils/collections.ts"));
    assert.ok(apiFiles.includes("src/types/models.ts"));
    assert.ok(exportedNames("src/utils/search.ts").includes("findProductBySKU"));
  });

  for (const file of apiFiles) {
    test(`names every export of ${file}`, () => {
      const missing = exportedNames(file).filter((name) => !readmeNames(name));
      assert.deepEqual(missing, [], `README.md does not name: ${missing.join(", ")}`);
    });
  }
});
