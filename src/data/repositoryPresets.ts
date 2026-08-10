import { RepositoryInfo } from '../types';

export const sampleRepositories: Record<string, RepositoryInfo> = {
  'expressjs/express': {
    url: 'https://github.com/expressjs/express',
    owner: 'expressjs',
    name: 'express',
    description: 'Fast, unopinionated, minimalist web framework for node.',
    isPublic: true,
    stars: '65k',
    forks: '16k',
    lastCommit: 'Active',
    language: 'JavaScript',
    updatedAgo: 'Active'
  },
  'facebook/react': {
    url: 'https://github.com/facebook/react',
    owner: 'facebook',
    name: 'react',
    description: 'A declarative, efficient, and flexible JavaScript library for building user interfaces.',
    isPublic: true,
    stars: '218k',
    forks: '44.5k',
    lastCommit: 'Active',
    language: 'JavaScript',
    updatedAgo: 'Active'
  },
  'vercel/next.js': {
    url: 'https://github.com/vercel/next.js',
    owner: 'vercel',
    name: 'next.js',
    description: 'The React Framework for the Web. Used by top teams to build full-stack web applications.',
    isPublic: true,
    stars: '124k',
    forks: '26.1k',
    lastCommit: 'Active',
    language: 'TypeScript',
    updatedAgo: 'Active'
  },
  'tailwindlabs/tailwindcss': {
    url: 'https://github.com/tailwindlabs/tailwindcss',
    owner: 'tailwindlabs',
    name: 'tailwindcss',
    description: 'A utility-first CSS framework for rapid UI development.',
    isPublic: true,
    stars: '82.4k',
    forks: '4.2k',
    lastCommit: 'Active',
    language: 'JavaScript',
    updatedAgo: 'Active'
  }
};
