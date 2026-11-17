# Evaluation Checklist

## Technical correctness

- [ ] TypeScript interfaces correctly model the entities specified in BRIEFING.md with all their fields and types
- [ ] Filtering functions correctly return elements that meet the specified criteria
- [ ] Sorting works correctly in ascending and descending order
- [ ] Linear search finds elements in unsorted arrays without errors
- [ ] Binary search works correctly on sorted arrays and returns the correct index or -1 if not found
- [ ] Aggregations correctly calculate totals, averages, counts, and extreme values
- [ ] Validations reject data that does not comply with the business rules in BRIEFING.md
- [ ] There are no TypeScript compilation errors in any file
- [ ] There is a documented command to run TypeScript validation or execution locally (`npx tsc --noEmit`, `npm run typecheck`, etc.)

## Structure and organization

- [ ] Code is organized in separate files by responsibility (types, utils, validations)
- [ ] Each function has a single clearly identifiable responsibility
- [ ] Variable, function, and interface names are descriptive and follow TypeScript conventions

## Context adaptation

- [ ] All entity names, fields, and types match exactly those specified in BRIEFING.md
- [ ] Implemented validations correspond to the business rules defined in BRIEFING.md
- [ ] Generated reports respond to the specific needs described in BRIEFING.md

## Code quality

- [ ] Functions are pure: they don't depend on external variables or modify global state
- [ ] Edge cases are handled correctly: empty arrays, elements not found, null values
- [ ] Code follows TypeScript best practices: explicit types, appropriate use of const/let, avoids any
