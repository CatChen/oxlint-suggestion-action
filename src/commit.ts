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

export function handleCommit(
  eventName: string,
  diagnostics: OxlintDiagnostic[],
  failCheck: boolean,
) {
  startGroup(`GitHub ${eventName}`);
  let warningCounter = 0;
  let errorCounter = 0;

  for (const diagnostic of diagnostics) {
    const lines = getDiagnosticLines(diagnostic);
    for (const line of lines) {
      info(`  ${diagnostic.filename}:${line}`);
      switch (diagnostic.severity) {
        case 'warning':
          warning(getDiagnosticMessage(diagnostic), {
            file: diagnostic.filename,
            startLine: line,
          });
          warningCounter++;
          break;
        case 'error':
          error(getDiagnosticMessage(diagnostic), {
            file: diagnostic.filename,
            startLine: line,
          });
          errorCounter++;
          break;
      }
    }
  }
  endGroup();

  startGroup('Feedback');
  if (warningCounter > 0 || errorCounter > 0) {
    if (failCheck) {
      throw new Error('Oxlint fails.');
    } else {
      error('Oxlint fails');
    }
  } else {
    notice('Oxlint passes');
  }
  endGroup();
}
