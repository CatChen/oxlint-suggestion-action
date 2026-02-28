export declare function oxlintSuggestion({ requestChanges, failCheck, githubToken, directory, targets, oxlintBinPath, configPath, }: {
    requestChanges: boolean;
    failCheck: boolean;
    githubToken: string;
    directory: string;
    targets: string;
    oxlintBinPath: string;
    configPath: string;
}): Promise<void>;
