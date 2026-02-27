import type { ResultOf } from '@graphql-typed-document-node/core';
import {
  error,
  getInput,
  getState,
  notice,
  saveState,
  setFailed,
} from '@actions/core';
import { graphql } from './__graphql__/gql.js';
import { getOctokit } from './getOctokit.js';

const queryViewerLogin = graphql(`
  query ViewerLogin {
    viewer {
      id
      login
    }
  }
`);

export async function getLogin(githubToken: string): Promise<string> {
  const octokit = getOctokit(githubToken);
  const {
    viewer: { login },
  } = await octokit.graphql<ResultOf<typeof queryViewerLogin>>(
    queryViewerLogin.toString(),
    {},
  );
  return login;
}

async function run(): Promise<void> {
  const githubToken = getInput('github-token');
  const login = await getLogin(githubToken);
  saveState('login', login);

  notice(`Hello, ${login}!`);
  error('Please implement this Action.');
}

function cleanup(): void {
  const login = getState('login');

  notice(`Goodbye, ${login}!`);
  error('Please implement or remove Action cleanup.');
}

if (!getState('isPost')) {
  saveState('isPost', 'true');
  run().catch((error: Error) => setFailed(error));
} else {
  cleanup();
}
