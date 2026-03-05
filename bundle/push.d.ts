import type { OxlintDiagnostic } from './parseOxlintOutput.js';
import type { Octokit } from '@octokit/core';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';
export declare function handlePush(octokit: Octokit & Api, diagnostics: OxlintDiagnostic[], owner: string, repo: string, beforeSha: string, afterSha: string, created: boolean, deleted: boolean, failCheck: boolean): Promise<void>;
