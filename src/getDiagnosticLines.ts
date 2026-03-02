import type { OxlintDiagnostic } from './parseOxlintOutput.js';

export function getDiagnosticLines(diagnostic: OxlintDiagnostic) {
  const lines = diagnostic.labels.map((label) => label.span.line);
  return [...new Set(lines)];
}
