import type { OxlintDiagnostic } from './parseOxlintOutput.js';
import type { Octokit } from '@octokit/core';
import type { components } from '@octokit/openapi-types/types.js';
import type { PaginateInterface } from '@octokit/plugin-paginate-rest';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';

import { endGroup, error, info, notice, startGroup } from '@actions/core';

import { getIndexedModifiedLines } from './getIndexedModifiedLines.js';

type ReviewComment = {
  path: string;
  side: 'RIGHT';
  line: number;
  body: string;
};

const REVIEW_BODY = "Oxlint doesn't pass. Please fix all Oxlint issues.";
const GITHUB_ACTIONS_BOT_ID = 41898282;

async function getPullRequestFiles(
  octokit: Octokit &
    Api & {
      paginate: PaginateInterface;
    },
  owner: string,
  repo: string,
  pullRequestNumber: number,
) {
  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pullRequestNumber,
    per_page: 100,
  });
  info(`Files: (${files.length})`);
  return files;
}

async function getReviewComments(
  octokit: Octokit &
    Api & {
      paginate: PaginateInterface;
    },
  owner: string,
  repo: string,
  pullRequestNumber: number,
) {
  const reviews = await octokit.paginate(octokit.rest.pulls.listReviews, {
    owner,
    repo,
    pull_number: pullRequestNumber,
    per_page: 100,
  });
  const reviewComments = await octokit.paginate(
    octokit.rest.pulls.listReviewComments,
    {
      owner,
      repo,
      pull_number: pullRequestNumber,
      per_page: 100,
    },
  );
  const relevantReviews = reviews.filter(
    (review) =>
      review.user?.id === GITHUB_ACTIONS_BOT_ID && review.body === REVIEW_BODY,
  );
  const relevantReviewIds = relevantReviews.map((review) => review.id);
  const relevantReviewComments = reviewComments.filter(
    (reviewComment) =>
      reviewComment.user.id === GITHUB_ACTIONS_BOT_ID &&
      reviewComment.pull_request_review_id !== null &&
      relevantReviewIds.includes(reviewComment.pull_request_review_id),
  );
  info(`Existing review comments: (${relevantReviewComments.length})`);
  return relevantReviewComments;
}

function getDiagnosticLines(diagnostic: OxlintDiagnostic) {
  const lines = diagnostic.labels.map((label) => label.span.line);
  return [...new Set(lines)];
}

function getReviewCommentFromDiagnostic(
  diagnostic: OxlintDiagnostic,
  line: number,
  path: string,
): ReviewComment {
  const ruleInfo = diagnostic.code
    ? diagnostic.url
      ? `[\`${diagnostic.code}\`](${diagnostic.url})`
      : `\`${diagnostic.code}\``
    : '';
  const trailingRuleInfo = ruleInfo ? ` ${ruleInfo}` : '';
  return {
    body: `**${diagnostic.message}**${trailingRuleInfo}`,
    path,
    side: 'RIGHT',
    line,
  };
}

function matchReviewComments(
  reviewComments: Pick<
    components['schemas']['review-comment'],
    'path' | 'line' | 'side' | 'body' | 'node_id'
  >[],
  reviewComment: ReviewComment,
) {
  const matchedNodeIds: string[] = [];
  for (const existingReviewComment of reviewComments) {
    if (
      existingReviewComment.path === reviewComment.path &&
      existingReviewComment.line === reviewComment.line &&
      existingReviewComment.side === reviewComment.side &&
      existingReviewComment.body === reviewComment.body
    ) {
      matchedNodeIds.push(existingReviewComment.node_id);
    }
  }
  return matchedNodeIds;
}

export async function handlePullRequest(
  octokit: Octokit &
    Api & {
      paginate: PaginateInterface;
    },
  diagnostics: OxlintDiagnostic[],
  owner: string,
  repo: string,
  pullRequestNumber: number,
  headSha: string,
  failCheck: boolean,
  requestChanges: boolean,
) {
  startGroup('GitHub Pull Request');

  const files = await getPullRequestFiles(
    octokit,
    owner,
    repo,
    pullRequestNumber,
  );
  const existingReviewComments = await getReviewComments(
    octokit,
    owner,
    repo,
    pullRequestNumber,
  );

  const indexedDiagnostics: Record<string, OxlintDiagnostic[]> = {};
  for (const diagnostic of diagnostics) {
    indexedDiagnostics[diagnostic.filename] ??= [];
    indexedDiagnostics[diagnostic.filename]?.push(diagnostic);
  }

  let commentsCounter = 0;
  let outOfScopeResultsCounter = 0;
  const reviewComments: ReviewComment[] = [];
  for (const file of files) {
    info(`  File name: ${file.filename}`);
    info(`  File status: ${file.status}`);
    if (file.status === 'removed') {
      continue;
    }

    const indexedModifiedLines = getIndexedModifiedLines(file);
    const fileDiagnostics = indexedDiagnostics[file.filename] ?? [];
    for (const diagnostic of fileDiagnostics) {
      const lines = getDiagnosticLines(diagnostic);
      for (const line of lines) {
        if (indexedModifiedLines[line]) {
          info(`  Matched line: ${line}`);
          const reviewComment = getReviewCommentFromDiagnostic(
            diagnostic,
            line,
            file.filename,
          );
          const matchedComments = matchReviewComments(
            existingReviewComments,
            reviewComment,
          );
          commentsCounter++;
          if (matchedComments.length === 0) {
            reviewComments.push(reviewComment);
            info(`    Comment queued`);
          } else {
            info(`    Comment skipped`);
          }
        } else {
          outOfScopeResultsCounter++;
          info(`  Out of scope line: ${line}`);
        }
      }
    }
  }

  if (outOfScopeResultsCounter > 0) {
    info(`Out of scope results: ${outOfScopeResultsCounter}`);
  }
  endGroup();

  startGroup('Feedback');
  if (commentsCounter > 0) {
    try {
      await octokit.rest.pulls.createReview({
        owner,
        repo,
        body: REVIEW_BODY,
        pull_number: pullRequestNumber,
        commit_id: headSha,
        event: requestChanges ? 'REQUEST_CHANGES' : 'COMMENT',
        comments: reviewComments,
      });
    } catch {
      throw new Error(
        `Failed to create review with ${reviewComments.length} comment(s).`,
      );
    }
    if (commentsCounter - reviewComments.length > 0) {
      info(
        `Review comments existed and skipped: ${
          commentsCounter - reviewComments.length
        }`,
      );
    }
    info(`Review comments submitted: ${reviewComments.length}`);
    if (failCheck) {
      throw new Error('Oxlint fails. Please review comments.');
    } else {
      error('Oxlint fails');
    }
  } else {
    notice('Oxlint passes');
  }
  endGroup();
}
