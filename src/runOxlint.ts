import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { cwd } from 'node:process';

import { getExecOutput } from '@actions/exec';
import { globSync } from 'glob';

export async function runOxlint({
  oxlintBinPath,
  directory,
  targets,
}: {
  oxlintBinPath: string;
  directory: string;
  targets: string;
}): Promise<string> {
  const resolvedOxlintBinPath = resolve(cwd(), oxlintBinPath);
  if (!existsSync(resolvedOxlintBinPath)) {
    throw new Error(
      `Oxlint binary cannot be found at ${resolvedOxlintBinPath}`,
    );
  }

  const oxlintOutput = await getExecOutput(
    resolvedOxlintBinPath,
    [...globSync(join(directory, targets)), '--format=json'],
    {
      ignoreReturnCode: true,
      silent: true,
    },
  );

  return oxlintOutput.stdout;
}
