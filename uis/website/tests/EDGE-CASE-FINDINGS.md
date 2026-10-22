# Validation edge-case findings

> **Last updated**: 2026-10-22

`validation-edge-cases.test.js` throws real-world and adversarial input at every rule in `../js/validation.js`: names, phone numbers, emails and URLs from many countries, whitespace and invisible characters, emoji, very long values and edited form values. Each case's expected result comes from the brief's intent (`docs/milestones/milestone-1/trackflow-BRIEFING.en.md`), not from what the code does.

First run, 2026-10-22: 307 cases, 259 pass, 48 fail. mae then approved a set of tighter rules and clean-ups (the "Form validation rules" entry in `docs/decisions.md`). Every finding below is now fixed or settled, and all cases are binding. "Settled" names the change: P1 to P12 are the proposal numbers in that decision.

## Bugs (the rule accepted input the brief would reject)

| Id | Field | Cases | What broke | Severity | Settled |
|---|---|---|---|---|---|
| F3 | Email | 6 | Pasted debris passes: `ana@acme.com,`, `ana@acme.com;`, `ana@acme.com>`, `<ana@acme.com>`, `mailto:ana@acme.com`, `ana@acme.com/`. The sales team would get an address they can't send to. | Medium | P1 (plus the email clean-up, which strips this debris on blur) |
| F4 | Email | 8 | Malformed but plausible: leading, trailing or doubled dots in the local part; domain labels starting or ending with `-`; `_` in the domain; a digit in the TLD; brackets in the local part. | Low | P1 |
| F5 | Email | 3 | No length limits: local part over 64, domain label over 63, address over 254 characters. | Low | P2 |
| F1 | Company | 2 | Length counts UTF-16 code units, so one emoji (`🚚`) or one accented letter typed as `e` + combining accent counts as 2 characters. | Low | P8 |
| F2 | Company | 1 | Zero-width spaces aren't trimmed, so two invisible characters pass. | Low | P8 |
| F6 | Phone | 1 | `+0 …` passes; no country code starts with 0. | Low | P3 |
| F7 | Phone | 3 | Separators aren't checked: `((213))`, `-- ..` runs and an unclosed bracket pass. | Low | P3 |
| F8 | Website | 1 | `https:///acme.com` (three slashes) passes because the URL parser repairs it. | Low | P6 |
| F9 | Website | 4 | Host names DNS can't have pass: one-letter TLD (`acme.c`, which the email rule rejects), leading `-`, `_`, and two URLs joined by a comma. | Low | P6 |

## Ambiguities (the brief doesn't settle it; mae's call)

| Id | Field | Question | Input before | Input now (mae's ruling) |
|---|---|---|---|---|
| A5 | Phone | Accept extensions (`+1 213 555 0147 ext. 204`, `x204`, `;ext=204`)? Common for B2B switchboards. PR #11's test that `ext 2` is invalid now expects valid. | Rejected | Accepted (P3) |
| A6 | Phone | Accept other real ways of writing a number: space after `+`, `+(34)`, German `30/1234567`, full-width digits from CJK keyboards? Could be normalised before checking. | Rejected | Accepted (P3) |
| A4 | Phone | Accept 7-digit international numbers (Niue `+683 4002`)? The rule needs 8+ digits. | Rejected | Accepted (P3) |
| A2 | Contact | Accept Chinese or Japanese full names written without spaces (`李小龙`, `山田太郎`)? The rule needs two words. | Rejected | Accepted (P10) |
| A3 | Contact | Reject two single letters (`A B`)? `Ana L` (name and initial) should stay valid. | Accepted | Rejected (P10) |
| A1 | Company | Require at least one letter or digit, so `--` or `..` fail? | Accepted | Rejected (P9) |
| A10 | Comments | Count characters as people see them? 500 emoji or 300 accented letters typed with combining marks were over the limit because the count is UTF-16 units. | Rejected | Accepted (P11) |
| A7 | Website | Accept a trailing dot (`https://acme.com.`), which browsers open? | Rejected | Accepted (P6) |
| A8 | Website | Reject IP addresses (`https://192.168.1.10`) as a company website? | Accepted | Rejected (P6) |
| A9 | Services | Reject an edited form value next to a real one (`warehousing` + `teleportation`)? Only reachable by tampering with the page. | Accepted | Rejected (P12) |

Two more questions had no failing case. Free providers (Gmail, Outlook) still count as a corporate email. A website typed without a scheme (`acme.com`) now gets `https://` added when the field loses focus (P7). The same clean-up adds the phone's `+` where the country field makes the code certain (P5), and the suite has cases for both.

## What held up from the start

Accents, hyphens, apostrophes and non-Latin scripts in names; 23 email providers from around the world, plus addressing, IDN and punycode domains and long TLDs; phone numbers from 26 countries and territories in E.164, spaced, dashed, dotted and bracketed forms, with `(0)` trunk prefixes and non-breaking spaces; URLs with ports, queries, fragments, unicode paths and IDN hosts; whitespace-only answers; tampered select, radio and checkbox values; the 499/500/501 comment boundary; and the low-volume dialog, which opens only for exactly `0-100` (not `101-500`, `not-sure`, an en dash or `100`) with a product chosen.

The volume field is a select, so there is no typed number to test at 0 or 100; the threshold tests are the bands either side of it.
