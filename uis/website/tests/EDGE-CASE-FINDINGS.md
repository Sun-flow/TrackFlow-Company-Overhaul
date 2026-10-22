# Validation edge-case findings

> **Last updated**: 2026-10-22

`validation-edge-cases.test.js` throws real-world and adversarial input at every rule in `../js/validation.js`: names, phone numbers, emails and URLs from many countries, whitespace and invisible characters, emoji, very long values and edited form values. Each case's expected result comes from the brief's intent (`docs/milestones/milestone-1/trackflow-BRIEFING.en.md`), not from what the code does.

First run, 2026-10-22: 307 cases, 259 pass, 48 fail. The failing cases run as `todo` tests tagged with the ids below, so `pnpm test` stays green while they are reported. Once a finding is fixed or decided, remove its id from the test rows (or flip the expectation) so the cases become binding.

## Bugs (the rule accepts input the brief would reject)

| Id | Field | Cases | What breaks | Severity |
|---|---|---|---|---|
| F3 | Email | 6 | Pasted debris passes: `ana@acme.com,`, `ana@acme.com;`, `ana@acme.com>`, `<ana@acme.com>`, `mailto:ana@acme.com`, `ana@acme.com/`. The sales team would get an address they can't send to. | Medium |
| F4 | Email | 8 | Malformed but plausible: leading, trailing or doubled dots in the local part; domain labels starting or ending with `-`; `_` in the domain; a digit in the TLD; brackets in the local part. | Low |
| F5 | Email | 3 | No length limits: local part over 64, domain label over 63, address over 254 characters. | Low |
| F1 | Company | 2 | Length counts UTF-16 code units, so one emoji (`🚚`) or one accented letter typed as `e` + combining accent counts as 2 characters. | Low |
| F2 | Company | 1 | Zero-width spaces aren't trimmed, so two invisible characters pass. | Low |
| F6 | Phone | 1 | `+0 …` passes; no country code starts with 0. | Low |
| F7 | Phone | 3 | Separators aren't checked: `((213))`, `-- ..` runs and an unclosed bracket pass. | Low |
| F8 | Website | 1 | `https:///acme.com` (three slashes) passes because the URL parser repairs it. | Low |
| F9 | Website | 4 | Host names DNS can't have pass: one-letter TLD (`acme.c`, which the email rule rejects), leading `-`, `_`, and two URLs joined by a comma. | Low |

## Ambiguities (the brief doesn't settle it; mae's call)

| Id | Field | Question | Today |
|---|---|---|---|
| A5 | Phone | Accept extensions (`+1 213 555 0147 ext. 204`, `x204`, `;ext=204`)? Common for B2B switchboards. The WP4 tests currently assert `ext 2` is invalid. | Rejected |
| A6 | Phone | Accept other real ways of writing a number: space after `+`, `+(34)`, German `30/1234567`, full-width digits from CJK keyboards? Could be normalised before checking. | Rejected |
| A4 | Phone | Accept 7-digit international numbers (Niue `+683 4002`)? The rule needs 8+ digits. | Rejected |
| A2 | Contact | Accept Chinese or Japanese full names written without spaces (`李小龙`, `山田太郎`)? The rule needs two words. | Rejected |
| A3 | Contact | Reject two single letters (`A B`)? `Ana L` (name and initial) should stay valid. | Accepted |
| A1 | Company | Require at least one letter or digit, so `--` or `..` fail? | Accepted |
| A10 | Comments | Count characters as people see them? 500 emoji or 300 accented letters typed with combining marks are over the limit today because the count is UTF-16 units. | Rejected |
| A7 | Website | Accept a trailing dot (`https://acme.com.`), which browsers open? | Rejected |
| A8 | Website | Reject IP addresses (`https://192.168.1.10`) as a company website? | Accepted |
| A9 | Services | Reject an edited form value next to a real one (`warehousing` + `teleportation`)? Only reachable by tampering with the page. | Accepted |

Two more questions with no failing case, because the tests follow the brief: should free providers (Gmail, Outlook) count as a "corporate email" (all pass today), and should a website typed without a scheme (`acme.com`) get `https://` added instead of an error (rejected today, as the brief says)?

## What holds up

Accents, hyphens, apostrophes and non-Latin scripts in names; 23 email providers from around the world, plus addressing, IDN and punycode domains and long TLDs; phone numbers from 26 countries and territories in E.164, spaced, dashed, dotted and bracketed forms, with `(0)` trunk prefixes and non-breaking spaces; URLs with ports, queries, fragments, unicode paths and IDN hosts; whitespace-only answers; tampered select, radio and checkbox values; the 499/500/501 comment boundary; and the low-volume dialog, which opens only for exactly `0-100` (not `101-500`, `not-sure`, an en dash or `100`) with a product chosen.

The volume field is a select, so there is no typed number to test at 0 or 100; the threshold tests are the bands either side of it.
