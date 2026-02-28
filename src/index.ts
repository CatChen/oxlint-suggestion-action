import {
  endGroup,
  getBooleanInput,
  getInput,
  setFailed,
  startGroup,
} from '@actions/core';

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
  startGroup('Oxlint');
  changeDirectory(directory);
  const output = await runOxlint({ oxlintBinPath, directory, targets });
  parseOxlintOutput(output);
  endGroup();
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
