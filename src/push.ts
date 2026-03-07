import type { OxlintDiagnostic } from './parseOxlintOutput.js';

import {
  endGroup,
  error,
  info,
  notice,
  startGroup,
  warning,
} from '@actions/core';

import { getDiagnosticLines } from './getDiagnosticLines.js';
import { getDiagnosticMessage } from './getDiagnosticMessage.js';
import { getIndexedModifiedLines } from './getIndexedModifiedLines.js';
import { getPushFiles } from './getPushFiles.js';

const ZERO_SHA = '0000000000000000000000000000000000000000';

export async function handlePush(
  diagnostics: OxlintDiagnostic[],
  beforeSha: string,
  afterSha: string,
  created: boolean,
  deleted: boolean,
  failCheck: boolean,
) {
  startGroup('GitHub Push');
  if (created || deleted || beforeSha === ZERO_SHA || afterSha === ZERO_SHA) {
    info(`Skipped comparing files in the push`);
    info(`  Created: ${created}`);
    info(`  Deleted: ${deleted}`);
    info(`  Before SHA: ${beforeSha}`);
    info(`  After SHA: ${afterSha}`);
    endGroup();
    return;
  }

  const files = await getPushFiles(beforeSha, afterSha);

  if (files.length === 0) {
    info(`Push contains no files`);
    endGroup();
    return;
  }

  const indexedDiagnostics: Record<string, OxlintDiagnostic[]> = {};
  for (const diagnostic of diagnostics) {
    indexedDiagnostics[diagnostic.filename] ??= [];
    indexedDiagnostics[diagnostic.filename]?.push(diagnostic);
  }

  let warningCounter = 0;
  let errorCounter = 0;
  for (const file of files) {
    info(`  File name: ${file.filename}`);
    info(`  File status: ${file.status}`);
    if (file.status === 'removed') {
      continue;
    }

    const indexedModifiedLines = getIndexedModifiedLines(file.patch);
    const fileDiagnostics = indexedDiagnostics[file.filename];
    if (fileDiagnostics) {
      for (const diagnostic of fileDiagnostics) {
        const lines = getDiagnosticLines(diagnostic);
        for (const line of lines) {
          if (indexedModifiedLines[line]) {
            info(`  Matched line: ${line}`);
            switch (diagnostic.severity) {
              case 'warning':
                warning(getDiagnosticMessage(diagnostic), {
                  file: file.filename,
                  startLine: line,
                });
                warningCounter++;
                break;
              case 'error':
                error(getDiagnosticMessage(diagnostic), {
                  file: file.filename,
                  startLine: line,
                });
                errorCounter++;
                break;
            }
          }
        }
      }
    }
  }
  endGroup();

  startGroup('Feedback');
  if (warningCounter > 0 || errorCounter > 0) {
    if (failCheck) {
      throw new Error('Oxlint fails. Please review comments.');
    } else {
      error('Oxlint fails');
    }
  } else {
    notice('Oxlint passes');
  }
  endGroup();
}
