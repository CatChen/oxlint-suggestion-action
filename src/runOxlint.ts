import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

import { notice } from '@actions/core';
import { getExecOutput } from '@actions/exec';
import { globSync } from 'glob';

export async function runOxlint({
  oxlintBinPath,
  directory,
  targets,
  configPath,
}: {
  oxlintBinPath: string;
  directory: string;
  targets: string;
  configPath: string;
}): Promise<string> {
  const absoluteOxlintBinPath = resolve(cwd(), oxlintBinPath);
  if (!existsSync(absoluteOxlintBinPath)) {
    throw new Error(
      `Oxlint binary cannot be found at ${absoluteOxlintBinPath}`,
    );
  }
  notice(`Using Oxlint from: ${absoluteOxlintBinPath}`);

  const args = [...globSync(join(directory, targets)), '--format=json'];

  const absoluteConfigPath = configPath ? resolve(cwd(), configPath) : null;
  if (absoluteConfigPath) {
    if (!existsSync(absoluteConfigPath)) {
      throw new Error(`Oxlint config cannot be found at ${absoluteConfigPath}`);
    }
    notice(`Using Oxlint config from: ${absoluteConfigPath}`);
    args.push(`--config=${absoluteConfigPath}`);
  }

  const oxlintOutput = await getExecOutput(absoluteOxlintBinPath, args, {
    ignoreReturnCode: true,
    silent: true,
  });

  return oxlintOutput.stdout;
}
