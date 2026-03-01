import type { OxlintDiagnostic } from './parseOxlintOutput.js';

export function getDiagnosticMessage(diagnostic: OxlintDiagnostic) {
  const ruleInfo = diagnostic.code
    ? diagnostic.url
      ? `[${diagnostic.code}](${diagnostic.url})`
      : diagnostic.code
    : '';
  return ruleInfo ? `${diagnostic.message}: ${ruleInfo}` : diagnostic.message;
}
