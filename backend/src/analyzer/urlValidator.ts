import { RepositoryInfo } from '../types/index.js';

export interface ValidatedUrl {
  isValid: boolean;
  normalizedUrl: string;
  owner: string;
  repoName: string;
  error?: string;
}

export function validateGitHubUrl(rawUrl: string): ValidatedUrl {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, normalizedUrl: '', owner: '', repoName: '', error: 'URL must be a non-empty string' };
  }

  const trimmed = rawUrl.trim();

  // Pattern matching GitHub HTTPS repository URLs
  // Examples:
  // https://github.com/facebook/react
  // https://github.com/facebook/react.git
  // http://github.com/facebook/react
  const githubHttpsRegex = /^https?:\/\/(www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(\.git)?\/?$/;

  const match = trimmed.match(githubHttpsRegex);

  if (!match) {
    return {
      isValid: false,
      normalizedUrl: '',
      owner: '',
      repoName: '',
      error: 'Invalid GitHub repository URL. Format must be https://github.com/owner/repository'
    };
  }

  const owner = match[2];
  const repoName = match[3];
  const normalizedUrl = `https://github.com/${owner}/${repoName}.git`;

  return {
    isValid: true,
    normalizedUrl,
    owner,
    repoName
  };
}
