export declare function oxlintSuggestion(_inputs: {
    requestChanges: boolean;
    failCheck: boolean;
    githubToken: string;
    directory: string;
    targets: string;
    oxlintBinPath: string;
    configPath: string;
}): Promise<void>;
