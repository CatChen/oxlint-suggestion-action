import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

import { getExecOutput } from '@actions/exec';

export async function runOxlint({
  oxlintBinPath,
  targets,
}: {
  oxlintBinPath: string;
  targets: string;
}): Promise<string> {
  const args = [
    ...targets
      .split(/\s+/)
      .map((target) => target.trim())
      .filter((target) => target.length > 0),
    '--format=json',
  ];
  const resolvedOxlintBinPath = resolve(cwd(), oxlintBinPath);
  if (!existsSync(resolvedOxlintBinPath)) {
    throw new Error(
      `Oxlint binary cannot be found at ${resolvedOxlintBinPath}`,
    );
  }

  const oxlintOutput = await getExecOutput(resolvedOxlintBinPath, args, {
    ignoreReturnCode: true,
    silent: true,
  });

  return oxlintOutput.stdout;
}
