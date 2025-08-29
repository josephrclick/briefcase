# Javascript Style Guide

## Code Formatting

- **Indentation**: Use 2 spaces for indentation.
- **Semicolons**: Do not use semicolons at the end of statements.
- **Line Length**: Keep lines of code under 120 characters.
- **Trailing Commas**: Use trailing commas in multi-line objects and arrays.

```javascript
const myObject = {
  one: 1,
  two: 2,
  three: 3, // This trailing comma is good
};
```

## Naming Conventions

- **Variables and Functions**: Use `camelCase`.
  - `const myVariable = 'hello';`
  - `function myFunction() { ... }`
- **Classes and Components**: Use `PascalCase`.
  - `class MyClass { ... }`
  - `function MyComponent() { ... } // React component`
- **Constants**: Use `UPPER_SNAKE_CASE` for top-level or exported constants.
  - `const API_KEY = '...';`

## Variables

- **Declaration**: Use `const` by default. Use `let` only when a variable must be reassigned. Avoid `var`.
- **Grouping**: Declare one variable per line.

```javascript
// Good
const name = 'Joe';
let age = 30;

// Bad
const name = 'Joe', age = 30;
```

## Functions

- **Arrow Functions**: Prefer arrow functions over function expressions, especially for anonymous functions and callbacks.
- **Named Functions**: Use named function declarations for top-level functions to improve stack traces.

```javascript
// Good for callbacks
[1, 2, 3].map(num => num * 2);

// Good for top-level functions
function MyComponent() {
  // ...
}
```

## Comments

- **JSDoc**: Use JSDoc for functions to describe parameters and return values.
- **Clarity**: Write comments to explain the *why*, not the *what*.

```javascript
/**
 * @param {string} userId The ID of the user to fetch.
 * @returns {Promise<User>} The user object.
 */
async function fetchUser(userId) {
  // We need to invalidate the cache first to ensure fresh data.
  await cache.invalidate(userId);
  return db.users.find(userId);
}
```

## Best Practices

- **Strict Equality**: Always use `===` and `!==` instead of `==` and `!=`.
- **Modules**: Use ES6 modules (`import`/`export`) for all new code.
- **Destructuring**: Use object and array destructuring to improve readability.

```javascript
// Good
const { name, age } = user;
const [first, second] = myArray;

// Bad
const name = user.name;
const age = user.age;
```
