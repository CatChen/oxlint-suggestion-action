import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

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
  const resolvedOxlintBinPath = resolve(cwd(), oxlintBinPath);
  if (!existsSync(resolvedOxlintBinPath)) {
    throw new Error(
      `Oxlint binary cannot be found at ${resolvedOxlintBinPath}`,
    );
  }

  const resolvedConfigPath = configPath ? resolve(cwd(), configPath) : null;
  if (resolvedConfigPath && !existsSync(resolvedConfigPath)) {
    throw new Error(`Oxlint config cannot be found at ${resolvedConfigPath}`);
  }

  const args = [...globSync(join(directory, targets)), '--format=json'];
  if (resolvedConfigPath) {
    args.push(`--config=${resolvedConfigPath}`);
  }

  const oxlintOutput = await getExecOutput(resolvedOxlintBinPath, args, {
    ignoreReturnCode: true,
    silent: true,
  });

  return oxlintOutput.stdout;
}
