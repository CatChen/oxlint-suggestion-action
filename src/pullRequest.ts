import type { OxlintDiagnostic } from './parseOxlintOutput.js';
import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';
import type { Octokit } from '@octokit/core';
import type { components } from '@octokit/openapi-types/types.js';
import type { PaginateInterface } from '@octokit/plugin-paginate-rest';
import type { Api } from '@octokit/plugin-rest-endpoint-methods';

import { endGroup, error, info, notice, startGroup } from '@actions/core';

import { graphql } from './__graphql__/gql.js';
import { getDiagnosticLines } from './getDiagnosticLines.js';
import { getIndexedModifiedLines } from './getIndexedModifiedLines.js';

type ReviewComment = {
  path: string;
  side: 'RIGHT';
  line: number;
  body: string;
};

const REVIEW_BODY = "Oxlint doesn't pass. Please fix all Oxlint issues.";
const GITHUB_ACTIONS_BOT_ID = 41898282;

const getReviewThreadsQuery = graphql(`
  query ReviewThreads(
    $owner: String!
    $repo: String!
    $pullRequestNumber: Int!
  ) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pullRequestNumber) {
        reviewThreads(last: 100) {
          totalCount
          nodes {
            id
            isResolved
            comments(last: 100) {
              totalCount
              nodes {
                id
              }
            }
          }
        }
      }
    }
  }
`);

const resolveReviewThreadMutation = graphql(`
  mutation ResolveReviewThread($nodeId: ID!) {
    resolveReviewThread(input: { threadId: $nodeId }) {
      thread {
        id
      }
    }
  }
`);

const unresolveReviewThreadMutation = graphql(`
  mutation UnresolveReviewThread($nodeId: ID!) {
    unresolveReviewThread(input: { threadId: $nodeId }) {
      thread {
        id
      }
    }
  }
`);

type GetReviewThreadsQueryResult = ResultOf<typeof getReviewThreadsQuery>;
type PullRequestReviewThread = Exclude<
  NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<GetReviewThreadsQueryResult['repository']>['pullRequest']
      >['reviewThreads']
    >['nodes']
  >[number],
  null
>;

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

async function getReviewThreads(
  octokit: Octokit &
    Api & {
      paginate: PaginateInterface;
    },
  owner: string,
  repo: string,
  pullRequestNumber: number,
) {
  const commentNodeIdToReviewThreadMapping: {
    [id: string]: PullRequestReviewThread;
  } = {};
  const queryData = await octokit.graphql<
    ResultOf<typeof getReviewThreadsQuery>
  >(getReviewThreadsQuery.toString(), {
    owner,
    repo,
    pullRequestNumber,
  } satisfies VariablesOf<typeof getReviewThreadsQuery>);

  const reviewThreadTotalCount =
    queryData?.repository?.pullRequest?.reviewThreads?.totalCount;
  if (reviewThreadTotalCount !== undefined && reviewThreadTotalCount > 100) {
    error(`There are more than 100 review threads: ${reviewThreadTotalCount}`);
  }

  const reviewThreads =
    queryData?.repository?.pullRequest?.reviewThreads?.nodes;
  if (reviewThreads !== undefined && reviewThreads !== null) {
    for (const reviewThread of reviewThreads) {
      if (reviewThread === null) {
        continue;
      }
      const commentTotalCount = reviewThread?.comments?.totalCount;
      if (commentTotalCount !== undefined && commentTotalCount > 100) {
        error(
          `There are more than 100 review comments in review thread ${reviewThread?.id}: ${commentTotalCount}`,
        );
      }

      const comments = reviewThread?.comments?.nodes;
      if (comments !== undefined && comments !== null) {
        for (const comment of comments) {
          const commentId = comment?.id;
          if (commentId === undefined || commentId === null) {
            continue;
          }
          commentNodeIdToReviewThreadMapping[commentId] = reviewThread;
        }
      }
    }
  }
  return commentNodeIdToReviewThreadMapping;
}

async function resolveReviewThread(
  octokit: Octokit &
    Api & {
      paginate: PaginateInterface;
    },
  nodeId: string,
) {
  await octokit.graphql(resolveReviewThreadMutation.toString(), {
    nodeId,
  } satisfies VariablesOf<typeof resolveReviewThreadMutation>);
}

async function unresolveReviewThread(
  octokit: Octokit &
    Api & {
      paginate: PaginateInterface;
    },
  nodeId: string,
) {
  await octokit.graphql(unresolveReviewThreadMutation.toString(), {
    nodeId,
  } satisfies VariablesOf<typeof unresolveReviewThreadMutation>);
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
  const commentNodeIdToReviewThreadMapping = await getReviewThreads(
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
  const matchedReviewCommentNodeIds: { [nodeId: string]: boolean } = {};
  for (const file of files) {
    info(`  File name: ${file.filename}`);
    info(`  File status: ${file.status}`);
    if (file.status === 'removed') {
      continue;
    }

    const indexedModifiedLines = getIndexedModifiedLines(
      file.filename,
      file.patch,
    );
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
            for (const nodeId of matchedComments) {
              matchedReviewCommentNodeIds[nodeId] = true;
            }
            info(`    Comment skipped`);
          }
        } else {
          outOfScopeResultsCounter++;
          info(`  Out of scope line: ${line}`);
        }
      }
    }
  }
  endGroup();

  startGroup('Feedback');
  for (const reviewComment of existingReviewComments) {
    const reviewThread =
      commentNodeIdToReviewThreadMapping[reviewComment.node_id];
    if (reviewThread !== undefined) {
      if (
        matchedReviewCommentNodeIds[reviewComment.node_id] &&
        reviewThread.isResolved
      ) {
        await unresolveReviewThread(octokit, reviewThread.id);
        info(`Review comment unresolved: ${reviewComment.url}`);
      } else if (
        !matchedReviewCommentNodeIds[reviewComment.node_id] &&
        !reviewThread.isResolved
      ) {
        await resolveReviewThread(octokit, reviewThread.id);
        info(`Review comment resolved: ${reviewComment.url}`);
      } else {
        info(
          `Review comment remains ${
            reviewThread.isResolved ? 'resolved' : 'unresolved'
          }: ${reviewComment.url}`,
        );
      }
    } else {
      error(
        `Review comment has no associated review thread: ${reviewComment.url}`,
      );
    }
  }
  if (outOfScopeResultsCounter > 0) {
    info(`Out of scope results: ${outOfScopeResultsCounter}`);
  }
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
