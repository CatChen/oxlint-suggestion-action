# Typescript GitHub Action Template

A template to create custom GitHub Action with TypeScript/JavaScript.

## Secrets

The following secrets need to be set up before you can use workflows already defined in this template:

- **`CHECK_GIT_STATUS_BOT_APP_ID`** and **`CHECK_GIT_STATUS_BOT_APP_PRIVATE_KEY`**: Used by the [`Build` workflow](https://github.com/CatChen/typescript-github-action-template/blob/main/.github/workflows/build.yml). If you don't want to set up a bot you can remove the `actions/create-github-app-token` step and remove all references to `steps.get-github-app-token.outputs.token`.
- **`ACCEPT_TO_SHIP_BOT_APP_ID`** and **`ACCEPT_TO_SHIP_BOT_APP_PRIVATE_KEY`**: Used by the [`Ship` workflow](https://github.com/CatChen/typescript-github-action-template/blob/main/.github/workflows/ship.yml). If you don't want to set up a bot you can remove the two `actions/create-github-app-token` steps and remove all references to `steps.get-github-app-token.outputs.token`.
- **`NPM_TOKEN`**: Used by the [`Release` workflow](https://github.com/CatChen/typescript-github-action-template/blob/main/.github/workflows/release.yml). This is necessary for publishing the NPM package to NPM. If you don't want to publish to NPM you can remove the `publish` job.
