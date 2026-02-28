import { info } from '@actions/core';

export type OxlintSeverity = 'warning' | 'error';

type OxlintSpan = {
  offset: number;
  length: number;
  line: number;
  column: number;
};

type OxlintLabel = {
  label?: string;
  span: OxlintSpan;
};

export type OxlintDiagnostic = {
  message: string;
  code?: string;
  severity: OxlintSeverity;
  url?: string;
  help?: string;
  filename: string;
  labels: OxlintLabel[];
};

export type OxlintOutput = {
  diagnostics: OxlintDiagnostic[];
  number_of_files: number;
  number_of_rules: number;
  threads_count: number;
  start_time: number;
};

export function parseOxlintOutput(output: string): OxlintOutput {
  const parsed = JSON.parse(output) as OxlintOutput;

  const indexedDiagnostics: Record<string, OxlintDiagnostic[]> = {};
  for (const diagnostic of parsed.diagnostics) {
    indexedDiagnostics[diagnostic.filename] ??= [];
    indexedDiagnostics[diagnostic.filename]?.push(diagnostic);
  }

  for (const [file, diagnostics] of Object.entries(indexedDiagnostics)) {
    info(`File name: ${file}`);
    for (const diagnostic of diagnostics) {
      const line = diagnostic.labels[0]?.span.line ?? 1;
      info(`  (${diagnostic.severity}) ${diagnostic.message} @ ${line}`);
    }
  }

  return parsed;
}
