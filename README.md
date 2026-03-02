# oxlint-suggestion-action

[![Build](https://github.com/CatChen/oxlint-suggestion-action/actions/workflows/build.yml/badge.svg?branch=main&event=push)](https://github.com/CatChen/oxlint-suggestion-action/actions/workflows/build.yml)
[![Test](https://github.com/CatChen/oxlint-suggestion-action/actions/workflows/test.yml/badge.svg?branch=main&event=push)](https://github.com/CatChen/oxlint-suggestion-action/actions/workflows/test.yml)
[![Oxlint](https://github.com/CatChen/oxlint-suggestion-action/actions/workflows/oxlint.yml/badge.svg?branch=main&event=push)](https://github.com/CatChen/oxlint-suggestion-action/actions/workflows/oxlint.yml)
[![CodeQL](https://github.com/CatChen/oxlint-suggestion-action/actions/workflows/codeql.yml/badge.svg?branch=main&event=schedule)](https://github.com/CatChen/oxlint-suggestion-action/actions/workflows/codeql.yml)

This GitHub Action runs Oxlint and provides inline feedback on the changes in a pull request. Features:

1. It posts review comments for Oxlint diagnostics on modified lines.
2. It only provides feedback for lines changed in the pull request, so pre-existing issues outside the diff do not add noise.

## Examples

When there is any Oxlint warning or error, this action will leave a comment:

![example-screenshot](https://github.com/user-attachments/assets/e1f9dd35-1768-477f-b769-a936e7066940)

## Usage

Set up a GitHub Action like this:

```yaml
name: Oxlint

on:
  push:
    branches: [main] # or [master] if that's the name of the main branch
  pull_request:
    branches: [main] # or [master] if that's the name of the main branch

jobs:
  oxlint:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          check-latest: true

      - name: Install dependencies
        run: yarn install # or npm ci if you use npm and have package-lock.json

      - uses: CatChen/oxlint-suggestion-action@v1
        with:
          request-changes: true # optional
          fail-check: false # optional
          github-token: ${{ secrets.GITHUB_TOKEN }} # optional
          directory: './' # optional
          targets: '.' # optional
          oxlint-bin-path: './node_modules/.bin/oxlint' # optional
          config-path: '' # optional
```

Save the file to `.github/workflows/oxlint.yml`. It will start working on new pull requests.

## Options

### `request-changes`

This option determines whether this GitHub Action should request changes if Oxlint does not pass. This option has no effect when the workflow is not triggered by a `pull_request` event. The default value is `true`.

### `fail-check`

This option determines whether the GitHub workflow should fail if Oxlint does not pass. The default value is `false`.

### `github-token`

The default value is `${{ github.token }}`, which is the GitHub token generated for this workflow. You can [create a different token with a different set of permissions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and use it here as well.

### `directory`

The default value is `'./'`. This action runs Oxlint from this directory.

### `targets`

The default value is `'.'`. For example, it could be `'src'` or `'src/**/*.ts'` for a typical TypeScript project. You can use glob patterns to match multiple directories, for example `'{src,lib}'`.

### `oxlint-bin-path`

The default value is `'./node_modules/.bin/oxlint'`. This action uses the Oxlint binary from this path.

### `config-path`

The default value is an empty string. Oxlint's default config discovery is used when this value is empty. If your config file is in a non-default location, set this option.

## FAQ

### Can I have GitHub suggestions outside of the scope?

No, mostly not. GitHub only allows review comments inside diff hunks (changed lines and a small surrounding context). For consistency, this action only comments on changed lines in the pull request.

### How can I avoid having annotations in generated code inside a project?

Follow [GitHub's documentation](https://github.com/github/linguist/blob/master/docs/overrides.md#generated-code) and use `.gitattributes` to mark generated files and directories correctly. GitHub will hide those files in pull requests.
