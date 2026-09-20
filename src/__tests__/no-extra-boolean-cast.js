var foo = !!!bar;
var foo = Boolean(!!bar);

if (!!foo) {
}
if (Boolean(foo)) {
}

// with "enforceForInnerExpressions" option enabled
if (!!foo || bar) {
}
