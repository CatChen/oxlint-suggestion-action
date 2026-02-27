export declare function oxlintSuggestion({ directory, targets, oxlintBinPath, }: {
    requestChanges: boolean;
    failCheck: boolean;
    githubToken: string;
    directory: string;
    targets: string;
    oxlintBinPath: string;
    configPath: string;
}): Promise<void>;
