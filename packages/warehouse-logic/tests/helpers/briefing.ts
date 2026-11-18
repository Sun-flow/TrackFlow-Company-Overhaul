// Reads the sample data straight from the briefing, so the tests compare the code with the brief's own
// text and not with a second hand-typed copy of it.
import { readFileSync } from "node:fs";

const briefingUrl = new URL(
  "../../../../docs/milestones/milestone-2/trackflow-BRIEFING.en.md",
  import.meta.url,
);

/**
 * Returns the value the briefing assigns to `const <name>` in its "Sample Data" section.
 * The briefing writes each sample as a TypeScript literal, so the literal is evaluated as written.
 */
export function readBriefingSample(name: string): unknown {
  const briefing = readFileSync(briefingUrl, "utf8");
  const declaration = new RegExp(`const ${name}: [A-Za-z\\[\\]]+ = ([\\s\\S]*?);\\n\`\`\``);
  const match = declaration.exec(briefing);
  if (match === null || match[1] === undefined) {
    throw new Error(`The briefing has no sample named ${name}`);
  }
  return new Function(`return (${match[1]});`)();
}
