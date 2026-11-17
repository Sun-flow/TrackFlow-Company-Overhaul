will be expanded as we go, but to start, here are a few guidelines:

* project is about building functions for database management
   * typescript only for function implementation
      * reusable
      * able to run in the browser and in dev environments
      * emphasis on mastering structured data manipulation (collections, objects, searches, sorting, and transformations)
   * not a complete interface
   * foundational functions on business information
      * manage
      * filter
      * sort
      * transform
* this is the logic layer that other systems will use down the line (not agent system, but hard-coded script systems)
* start with building ERD documents that we can agree upon for data management and consistency
* research search methods before implementing -- don't assume a search is optimal unless you've researched and tested it
* project must include a clear command to validate or execute the TypeScript code during development, such as:
   * npx tsc --noEmit
   * npm run typecheck
   * npx tsx src/demo.ts
* each function has a single responsibility
* any repeated task should have a function associated with it

## Code quality

* Use **descriptive names** for variables, functions, and interfaces (camelCase for variables and functions, PascalCase for interfaces)
* Each function must be **pure**: works only with what it receives as parameters, without modifying global variables
* Write **comments** only when necessary to explain complex logic, not to describe obvious code
* Handle **empty cases** correctly: empty arrays, elements not found, null values
* Use **const** by default and **let** only when the value will change
* Maintain consistent **indentation** and formatting throughout the code
