function foo(): void {
  return;
}

void foo(); // meaningless, foo() already returns void

void undefined; // meaningless, undefined is already undefined

async function bar() {
  void (await somePromise); // meaningless if somePromise resolves to void
}
