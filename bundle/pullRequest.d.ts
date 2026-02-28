import type { OxlintDiagnostic } from './parseOxlintOutput.js';
import type { Octokit } from '@octokit/core';
import type { PaginateInterface } from '@octokit/plugin-paginate-rest';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
export declare function handlePullRequest(octokit: Octokit & Api & {
    paginate: PaginateInterface;
}, diagnostics: OxlintDiagnostic[], owner: string, repo: string, pullRequestNumber: number, headSha: string, failCheck: boolean, requestChanges: boolean): Promise<void>;
