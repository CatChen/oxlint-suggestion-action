/* for-direction: "error" */

for (var i = 0; i < 10; i--) {}

for (var i = 10; i >= 0; i++) {}

for (var i = 0; i > 10; i++) {}

for (var i = 0; 10 > i; i--) {}

const n = -2;
for (let i = 0; i < 10; i += n) {}
