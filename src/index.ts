import { getBooleanInput, getInput, setFailed } from '@actions/core';

import { changeDirectory } from './changeDirectory.js';
import { parseOxlintOutput } from './parseOxlintOutput.js';
import { runOxlint } from './runOxlint.js';

export async function oxlintSuggestion({
  directory,
  targets,
  oxlintBinPath,
}: {
  requestChanges: boolean;
  failCheck: boolean;
  githubToken: string;
  directory: string;
  targets: string;
  oxlintBinPath: string;
  configPath: string;
}): Promise<void> {
  changeDirectory(directory);
  const output = await runOxlint({ oxlintBinPath, targets });
  parseOxlintOutput(output);
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
