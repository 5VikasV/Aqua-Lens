import * as fs from 'fs/promises';
import * as path from 'path';
import { FileMetric, LanguageMetric, PackageDependencies } from '../types/index.js';

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'vendor',
  'out',
  'target',
  '.cache',
  '.idea',
  '.vscode',
  'tmp',
  'temp',
  'public/build',
  '__pycache__',
  '.venv',
  'venv'
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tiff',
  '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar', '.exe', '.dll', '.so', '.dylib',
  '.bin', '.iso', '.mp3', '.mp4', '.avi', '.mov', '.woff', '.woff2', '.ttf', '.eot',
  '.pyc', '.pyo', '.class', '.o', '.a', '.obj', '.db', '.sqlite'
]);

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.java': 'Java',
  '.rs': 'Rust',
  '.c': 'C',
  '.cpp': 'C++',
  '.h': 'C/C++',
  '.hpp': 'C++',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.sh': 'Shell',
  '.bash': 'Shell',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'Sass',
  '.sass': 'Sass',
  '.less': 'Less',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.md': 'Markdown',
  '.markdown': 'Markdown',
  '.sql': 'SQL',
  '.graphql': 'GraphQL',
  '.proto': 'Protocol Buffers',
  '.dockerfile': 'Docker',
  'dockerfile': 'Docker'
};

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '1048576', 10); // 1 MB
const MAX_TOTAL_FILES = parseInt(process.env.MAX_TOTAL_FILES || '5000', 10);

export interface ScanResult {
  files: FileMetric[];
  languages: LanguageMetric[];
  packageDependencies: PackageDependencies;
  fileContents: Map<string, string>; // Relative path -> text content
  totalScanned: number;
  totalIgnored: number;
  totalLines: number;
  totalBytes: number;
}

export function detectLanguage(filePath: string): string {
  const baseName = path.basename(filePath).toLowerCase();
  if (baseName === 'dockerfile') return 'Docker';
  if (baseName === 'package.json') return 'JSON';

  const ext = path.extname(filePath).toLowerCase();
  return LANGUAGE_MAP[ext] || 'Other';
}

export async function scanRepositoryFiles(repoPath: string): Promise<ScanResult> {
  const files: FileMetric[] = [];
  const fileContents = new Map<string, string>();
  const languageCounts = new Map<string, { files: number; lines: number }>();

  let totalScanned = 0;
  let totalIgnored = 0;
  let totalLines = 0;
  let totalBytes = 0;

  let packageDependencies: PackageDependencies = {
    dependencies: {},
    devDependencies: {}
  };

  async function walkDirectory(currentDir: string) {
    if (files.length >= MAX_TOTAL_FILES) return;

    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= MAX_TOTAL_FILES) break;

      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(repoPath, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name.toLowerCase())) {
          totalIgnored++;
          continue;
        }
        await walkDirectory(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        if (BINARY_EXTENSIONS.has(ext)) {
          totalIgnored++;
          continue;
        }

        try {
          const stats = await fs.stat(fullPath);

          if (stats.size > MAX_FILE_SIZE) {
            totalIgnored++;
            continue;
          }

          // Read content as UTF-8 string
          const content = await fs.readFile(fullPath, 'utf-8');

          // Check if package.json to extract npm dependencies
          if (relativePath === 'package.json' || entry.name === 'package.json') {
            try {
              const parsedPkg = JSON.parse(content);
              packageDependencies = {
                dependencies: parsedPkg.dependencies || {},
                devDependencies: parsedPkg.devDependencies || {},
                peerDependencies: parsedPkg.peerDependencies || {}
              };
            } catch (e) {
              // Non-fatal if package.json fails to parse
            }
          }

          const lines = content.split('\n').length;
          const language = detectLanguage(entry.name);

          totalScanned++;
          totalLines += lines;
          totalBytes += stats.size;

          // Track language metrics
          const currentLang = languageCounts.get(language) || { files: 0, lines: 0 };
          languageCounts.set(language, {
            files: currentLang.files + 1,
            lines: currentLang.lines + lines
          });

          files.push({
            path: relativePath,
            extension: ext || path.basename(entry.name),
            language,
            sizeBytes: stats.size,
            lineCount: lines,
            importsCount: 0,
            exportsCount: 0
          });

          fileContents.set(relativePath, content);

        } catch (fileErr) {
          // Ignore unreadable binary/corrupted text files
          totalIgnored++;
        }
      }
    }
  }

  await walkDirectory(repoPath);

  // Compute language metrics & percentages
  const languages: LanguageMetric[] = Array.from(languageCounts.entries()).map(([lang, counts]) => ({
    language: lang,
    fileCount: counts.files,
    lineCount: counts.lines,
    percentage: totalLines > 0 ? parseFloat(((counts.lines / totalLines) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.lineCount - a.lineCount);

  return {
    files,
    languages,
    packageDependencies,
    fileContents,
    totalScanned,
    totalIgnored,
    totalLines,
    totalBytes
  };
}
