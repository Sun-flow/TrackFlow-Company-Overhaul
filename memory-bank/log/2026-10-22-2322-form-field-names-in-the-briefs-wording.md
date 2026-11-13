# Form field names in the brief's wording

2026-10-22, Claude Code in the cloud. Pull request #16. Part of the session entry "Form checklist
fixes" in the old single-file log.

- A9: after weighing the codes' benefits (stable through rewording and translation, tidy ids), mae
  approved renaming field names and option values to the brief's wording (`companyName`,
  `mainOperatingCountry` = `United States`, ...); form contract in the plan and `docs/decisions.md`
  updated, tests moved to the new values plus cases rejecting the old codes (481 pass). Checkbox and
  radio ids keep short slugs.
