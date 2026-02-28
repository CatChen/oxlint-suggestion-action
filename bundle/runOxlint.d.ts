export declare function runOxlint({ oxlintBinPath, directory, targets, configPath, }: {
    oxlintBinPath: string;
    directory: string;
    targets: string;
    configPath: string;
}): Promise<string>;
