import {
  endGroup,
  getBooleanInput,
  getInput,
  info,
  setFailed,
  startGroup,
} from '@actions/core';
import { context } from '@actions/github';

import { changeDirectory } from './changeDirectory.js';
import { getOctokit } from './getOctokit.js';
import { getPullRequestMetadata } from './getPullRequestMetadata.js';
import { parseOxlintOutput } from './parseOxlintOutput.js';
import { handlePullRequest } from './pullRequest.js';
import { runOxlint } from './runOxlint.js';

export async function oxlintSuggestion({
  requestChanges,
  failCheck,
  githubToken,
  directory,
  targets,
  oxlintBinPath,
  configPath,
}: {
  requestChanges: boolean;
  failCheck: boolean;
  githubToken: string;
  directory: string;
  targets: string;
  oxlintBinPath: string;
  configPath: string;
}): Promise<void> {
  startGroup('Oxlint');
  changeDirectory(directory);
  const output = await runOxlint({
    oxlintBinPath,
    targets,
    configPath,
  });
  const parsedOutput = parseOxlintOutput(output);
  endGroup();

  info(`Event name: ${context.eventName}`);
  switch (context.eventName) {
    case 'pull_request':
    case 'pull_request_target':
      await (async () => {
        const octokit = getOctokit(githubToken);
        const { owner, repo, pullRequestNumber, headSha } =
          getPullRequestMetadata();
        await handlePullRequest(
          octokit,
          parsedOutput.diagnostics,
          owner,
          repo,
          pullRequestNumber,
          headSha,
          failCheck,
          requestChanges,
        );
      })();
      break;
    default:
      break;
  }
}

async function run(): Promise<void> {
  await oxlintSuggestion({
    requestChanges: getBooleanInput('request-changes'),
    failCheck: getBooleanInput('fail-check'),
    githubToken: getInput('github-token'),
    directory: getInput('directory'),
    targets: getInput('targets'),
    oxlintBinPath: getInput('oxlint-bin-path'),
    configPath: getInput('config-path'),
  });
}

run().catch((error: Error) => setFailed(error));
