12;
() => {};

// non-Promise values
await Math.random;
await { then() {} };

// this is not a Promise - it's a function that returns a Promise
declare const getPromise: () => Promise<string>;
await getPromise;
