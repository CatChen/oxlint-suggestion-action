import type { OxlintDiagnostic } from './parseOxlintOutput.js';
export declare function handlePush(diagnostics: OxlintDiagnostic[], beforeSha: string, afterSha: string, created: boolean, deleted: boolean, failCheck: boolean): Promise<void>;
