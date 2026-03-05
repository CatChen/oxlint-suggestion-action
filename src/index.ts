import type { WorkflowRunEvent } from '@octokit/webhooks-types/schema.d.ts';

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
import { handleCommit } from './commit.js';
import { getOctokit } from './getOctokit.js';
import {
  getPullRequestMetadata,
  getPullRequestMetadataByNumber,
} from './getPullRequestMetadata.js';
import { getPushMetadata } from './getPushMetadata.js';
import { parseOxlintOutput } from './parseOxlintOutput.js';
import { handlePullRequest } from './pullRequest.js';
import { handlePush } from './push.js';
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

  const octokit = getOctokit(githubToken);
  info(`Event name: ${context.eventName}`);
  switch (context.eventName) {
    case 'pull_request':
    case 'pull_request_target':
      await (async () => {
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
    case 'push':
      await (async () => {
        const { owner, repo, beforeSha, afterSha, created, deleted } =
          getPushMetadata();
        await handlePush(
          octokit,
          parsedOutput.diagnostics,
          owner,
          repo,
          beforeSha,
          afterSha,
          created,
          deleted,
          failCheck,
        );
      })();
      break;
    case 'workflow_run':
      await (async () => {
        const workflowRun = context.payload as WorkflowRunEvent;
        if (workflowRun.workflow_run.pull_requests.length > 0) {
          for (const pullRequest of workflowRun.workflow_run.pull_requests) {
            const { owner, repo, pullRequestNumber, headSha } =
              await getPullRequestMetadataByNumber(octokit, pullRequest.number);
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
          }
        } else {
          const workflowSourceEventName = workflowRun.workflow_run.event
            .split('_')
            .map((word) => word[0]?.toUpperCase() + word.substring(1))
            .join(' ');
          handleCommit(
            `Workflow (${workflowSourceEventName})`,
            parsedOutput.diagnostics,
            failCheck,
          );
        }
      })();
      break;
    default:
      handleCommit(
        context.eventName
          .split('_')
          .map((word) => word[0]?.toUpperCase() + word.substring(1))
          .join(' '),
        parsedOutput.diagnostics,
        failCheck,
      );
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
