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
export declare function parseOxlintOutput(output: string): OxlintOutput;
export {};
