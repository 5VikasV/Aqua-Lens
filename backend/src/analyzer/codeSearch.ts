import * as path from 'path';
import {
  AnalysisWorkspace,
  CodeSearchOptions,
  CodeSearchResult,
  ExtractedSymbol,
  FileMetric,
  SearchResultSnippet
} from '../types/index.js';
import { extractSymbols } from './symbolExtractor.js';

export type SearchableWorkspace =
  | AnalysisWorkspace
  | {
      files: FileMetric[];
      fileContents: Map<string, string>;
      symbolsByFile?: Map<string, ExtractedSymbol[]>;
    };

export const DEFAULT_STOPWORDS = new Set([
  'how', 'does', 'do', 'did', 'is', 'are', 'was', 'were', 'the', 'a', 'an',
  'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'from', 'where', 'what',
  'which', 'who', 'why', 'when', 'this', 'that', 'these', 'those', 'it', 'its',
  'by', 'as', 'at', 'be', 'been', 'being', 'have', 'has', 'had', 'can', 'could',
  'should', 'would', 'i', 'you', 'he', 'she', 'they', 'we', 'my', 'your', 'their'
]);

export const DEFAULT_SOURCE_DIRS = new Set([
  'lib', 'src', 'app', 'server', 'core', 'services', 'controllers', 'routes', 'utils', 'handlers', 'api', 'modules'
]);

export const DEFAULT_SOURCE_EXTENSIONS = new Set([
  '.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.java', '.rs', '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.swift', '.kt'
]);

export const SCORE_CONFIG = {
  EXACT_FILENAME_MATCH: 150,
  PARTIAL_FILENAME_MATCH: 50,
  PATH_TERM_MATCH: 20,

  EXACT_SYMBOL_MATCH: 120,
  PARTIAL_SYMBOL_MATCH: 40,
  EXPORTED_SYMBOL_BONUS: 30,

  PHRASE_CONTENT_MATCH: 10,
  CONTENT_TERM_MAX_SCORE: 50,

  SOURCE_DIR_MULTIPLIER: 1.4,
  SOURCE_FILE_MULTIPLIER: 1.3,
  IMPLEMENTATION_INTENT_MULTIPLIER: 1.3,

  CHANGELOG_FILE_PENALTY: 0.1,
  TEST_DIR_PENALTY: 0.4,
  TEST_DIR_IMPLEMENTATION_PENALTY: 0.3,
  DOCS_DIR_PENALTY: 0.4,
  GENERAL_MARKDOWN_PENALTY: 0.5
};

export function stemWord(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith('ing') && w.length > 4) return w.slice(0, -3);
  if (w.endsWith('ed') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('es') && w.length > 3) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 3) return w.slice(0, -1);
  if (w.endsWith('er') && w.length > 3) return w.slice(0, -2);
  return w;
}

export function tokenizeQuery(query: string, stopwords: Set<string> = DEFAULT_STOPWORDS) {
  if (!query || typeof query !== 'string') {
    return { rawQuery: '', rawQueryLower: '', filteredTerms: [], originalTerms: [], stems: [] };
  }

  const rawQuery = query.trim();
  const rawQueryLower = rawQuery.toLowerCase();
  const originalTerms = Array.from(
    new Set(rawQueryLower.split(/[^a-zA-Z0-9_$]+/).filter(t => t.length > 0))
  );

  const filteredTerms = originalTerms.filter(t => !stopwords.has(t));
  const activeTerms = filteredTerms.length > 0 ? filteredTerms : originalTerms;
  const stems = Array.from(new Set(activeTerms.map(stemWord).filter(s => s.length >= 3)));

  return {
    rawQuery,
    rawQueryLower,
    filteredTerms: activeTerms,
    originalTerms,
    stems
  };
}

export function detectIntent(rawQuery: string) {
  const lower = rawQuery.toLowerCase();
  return {
    isImplementation: /\b(where|how|create|handle|implement|implemented|work|works|process|code)\b/i.test(lower),
    isDefinition: /\b(where|defined|declaration|struct|interface|class|function)\b/i.test(lower),
    isUsage: /\b(what|who)\s+(uses|imports|calls|depends)\b/i.test(lower)
  };
}

export function searchCode(
  workspace: SearchableWorkspace,
  query: string,
  options: CodeSearchOptions = {}
): CodeSearchResult[] {
  const { rawQuery, rawQueryLower, filteredTerms, stems } = tokenizeQuery(query);
  if (!rawQuery || filteredTerms.length === 0) {
    return [];
  }

  const intent = detectIntent(rawQuery);
  const results: CodeSearchResult[] = [];

  const files = workspace.files || [];
  const fileContents = workspace.fileContents || new Map<string, string>();
  const symbolsByFile = workspace.symbolsByFile || new Map<string, ExtractedSymbol[]>();

  for (const file of files) {
    const filePath = file.path;
    const content = fileContents.get(filePath);
    if (content === undefined) continue;

    let rawScore = 0;
    const matchedTermsSet = new Set<string>();
    const matchedLinesSet = new Set<number>();
    const symbolMatchesSet = new Set<number>();

    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    const basename = path.basename(filePath).toLowerCase();
    const ext = file.extension.toLowerCase();
    const basenameNoExt = basename.endsWith(ext)
      ? basename.substring(0, basename.length - ext.length)
      : basename;

    // 1. Filename & Path Matching against Filtered Terms and Stems
    if (basename === rawQueryLower || basenameNoExt === rawQueryLower) {
      rawScore += SCORE_CONFIG.EXACT_FILENAME_MATCH;
      matchedTermsSet.add(rawQuery);
    } else if (basename.includes(rawQueryLower)) {
      rawScore += SCORE_CONFIG.PARTIAL_FILENAME_MATCH;
      matchedTermsSet.add(rawQuery);
    }

    for (const term of filteredTerms) {
      if (basename.includes(term)) {
        rawScore += SCORE_CONFIG.PARTIAL_FILENAME_MATCH;
        matchedTermsSet.add(term);
      } else if (normalizedPath.includes(term)) {
        rawScore += SCORE_CONFIG.PATH_TERM_MATCH;
        matchedTermsSet.add(term);
      }
    }

    for (const stem of stems) {
      if (!Array.from(matchedTermsSet).some(t => t.toLowerCase().includes(stem))) {
        if (basename.includes(stem)) {
          rawScore += SCORE_CONFIG.PARTIAL_FILENAME_MATCH;
          matchedTermsSet.add(stem);
        } else if (normalizedPath.includes(stem)) {
          rawScore += SCORE_CONFIG.PATH_TERM_MATCH;
          matchedTermsSet.add(stem);
        }
      }
    }

    // 2. AST Symbol Matching
    let symbols = symbolsByFile.get(filePath);
    if (!symbols) {
      symbols = extractSymbols(content, filePath);
      if (workspace.symbolsByFile) {
        workspace.symbolsByFile.set(filePath, symbols);
      }
    }

    for (const sym of symbols) {
      const symNameLower = sym.name.toLowerCase();
      const symSubwords = splitSubwords(sym.name);
      const symStems = symSubwords.map(stemWord);

      let isSymbolMatch = false;

      if (symNameLower === rawQueryLower) {
        rawScore += SCORE_CONFIG.EXACT_SYMBOL_MATCH;
        matchedTermsSet.add(sym.name);
        isSymbolMatch = true;
      } else if (symNameLower.includes(rawQueryLower)) {
        rawScore += SCORE_CONFIG.PARTIAL_SYMBOL_MATCH;
        matchedTermsSet.add(sym.name);
        isSymbolMatch = true;
      } else {
        for (const term of filteredTerms) {
          if (symNameLower === term || symNameLower.includes(term) || symSubwords.includes(term)) {
            rawScore += SCORE_CONFIG.PARTIAL_SYMBOL_MATCH;
            matchedTermsSet.add(term);
            isSymbolMatch = true;
          }
        }
        if (!isSymbolMatch) {
          for (const stem of stems) {
            if (symNameLower.includes(stem) || symStems.includes(stem)) {
              rawScore += SCORE_CONFIG.PARTIAL_SYMBOL_MATCH;
              matchedTermsSet.add(stem);
              isSymbolMatch = true;
            }
          }
        }
      }

      if (isSymbolMatch) {
        const isTestFile =
          normalizedPath.includes('/test/') ||
          normalizedPath.includes('/tests/') ||
          normalizedPath.includes('/__tests__/') ||
          normalizedPath.startsWith('test/');

        if (sym.isExported && !isTestFile) {
          rawScore += SCORE_CONFIG.EXPORTED_SYMBOL_BONUS;
        }
        addRangeToSet(matchedLinesSet, sym.lineStart, sym.lineEnd);
        addRangeToSet(symbolMatchesSet, sym.lineStart, sym.lineEnd);
      }
    }

    // 3. Keyword Content Line Matching with Capped Logarithmic Score
    const lines = content.split('\n');
    const totalLines = lines.length;
    let rawContentScore = 0;
    let lineMatchCount = 0;

    for (let i = 0; i < totalLines; i++) {
      const lineText = lines[i];
      const lineLower = lineText.toLowerCase();
      const lineNumber = i + 1;

      if (lineLower.includes(rawQueryLower)) {
        rawContentScore += SCORE_CONFIG.PHRASE_CONTENT_MATCH;
        matchedTermsSet.add(rawQuery);
        matchedLinesSet.add(lineNumber);
        lineMatchCount++;
      } else {
        let termInLine = false;
        for (const term of filteredTerms) {
          if (lineLower.includes(term)) {
            termInLine = true;
            matchedTermsSet.add(term);
          }
        }
        if (!termInLine) {
          for (const stem of stems) {
            if (lineLower.includes(stem)) {
              termInLine = true;
              matchedTermsSet.add(stem);
            }
          }
        }
        if (termInLine) {
          lineMatchCount++;
          matchedLinesSet.add(lineNumber);
        }
      }
    }

    // Strictly cap maximum content match score per file to CONTENT_TERM_MAX_SCORE (50)
    const cappedContentScore = Math.min(
      SCORE_CONFIG.CONTENT_TERM_MAX_SCORE,
      rawContentScore + Math.round(5 * Math.log2(lineMatchCount + 1))
    );
    rawScore += cappedContentScore;

    // 4. Exclude Zero-Match Files
    if (rawScore <= 0 || matchedTermsSet.size === 0) {
      continue;
    }

    // 5. Category & Path Multipliers
    let multiplier = 1.0;
    const explanationParts: string[] = [];

    // Changelog / Release History Penalty
    if (
      basename === 'history.md' ||
      basename === 'changelog.md' ||
      normalizedPath.includes('/changelog') ||
      normalizedPath.includes('/release')
    ) {
      multiplier *= SCORE_CONFIG.CHANGELOG_FILE_PENALTY;
      explanationParts.push(`Changelog penalty (${SCORE_CONFIG.CHANGELOG_FILE_PENALTY}x)`);
    }
    // Test directory penalty
    else if (
      normalizedPath.includes('/test/') ||
      normalizedPath.includes('/tests/') ||
      normalizedPath.includes('/__tests__/') ||
      normalizedPath.startsWith('test/')
    ) {
      const testPenalty = intent.isImplementation
        ? SCORE_CONFIG.TEST_DIR_IMPLEMENTATION_PENALTY
        : SCORE_CONFIG.TEST_DIR_PENALTY;
      multiplier *= testPenalty;
      explanationParts.push(`Test penalty (${testPenalty}x)`);
    }
    // Documentation directory penalty
    else if (
      normalizedPath.includes('/docs/') ||
      normalizedPath.includes('/doc/') ||
      normalizedPath.startsWith('docs/')
    ) {
      multiplier *= SCORE_CONFIG.DOCS_DIR_PENALTY;
      explanationParts.push(`Docs penalty (${SCORE_CONFIG.DOCS_DIR_PENALTY}x)`);
    }
    // General Markdown penalty
    else if (ext === '.md' || ext === '.markdown') {
      multiplier *= SCORE_CONFIG.GENERAL_MARKDOWN_PENALTY;
      explanationParts.push(`Markdown penalty (${SCORE_CONFIG.GENERAL_MARKDOWN_PENALTY}x)`);
    }

    // Implementation Directory Boost
    const pathParts = normalizedPath.split('/');
    if (pathParts.some(part => DEFAULT_SOURCE_DIRS.has(part))) {
      multiplier *= SCORE_CONFIG.SOURCE_DIR_MULTIPLIER;
      explanationParts.push(`Source directory boost (${SCORE_CONFIG.SOURCE_DIR_MULTIPLIER}x)`);
    }

    // Source Code File Extension Boost
    if (DEFAULT_SOURCE_EXTENSIONS.has(ext)) {
      multiplier *= SCORE_CONFIG.SOURCE_FILE_MULTIPLIER;
      explanationParts.push(`Source file boost (${SCORE_CONFIG.SOURCE_FILE_MULTIPLIER}x)`);
    }

    // Implementation Query Intent Boost
    if (intent.isImplementation && DEFAULT_SOURCE_EXTENSIONS.has(ext)) {
      multiplier *= SCORE_CONFIG.IMPLEMENTATION_INTENT_MULTIPLIER;
      explanationParts.push(`Implementation intent boost (${SCORE_CONFIG.IMPLEMENTATION_INTENT_MULTIPLIER}x)`);
    }

    const finalScore = Math.max(1, Math.round(rawScore * multiplier));
    const rankingExplanation = explanationParts.length > 0
      ? `Raw: ${rawScore}, ${explanationParts.join(', ')} -> Final: ${finalScore}`
      : `Raw: ${rawScore} -> Final: ${finalScore}`;

    // 6. Snippet Quality Selection
    const lineRanges = computeBestSnippets(
      Array.from(matchedLinesSet).sort((a, b) => a - b),
      Array.from(symbolMatchesSet),
      totalLines,
      3 // Max contiguous snippets per file
    );

    const snippets: SearchResultSnippet[] = lineRanges.map(range => {
      const snippetLines = lines.slice(range.start - 1, range.end);
      return {
        startLine: range.start,
        endLine: range.end,
        content: snippetLines.join('\n')
      };
    });

    results.push({
      filePath,
      language: file.language,
      score: finalScore,
      matchedTerms: Array.from(matchedTermsSet),
      lineRanges,
      snippets,
      symbols,
      rankingExplanation
    });
  }

  // 7. Deterministic Ranking: Score Descending -> FilePath Ascending
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.filePath.localeCompare(b.filePath);
  });

  if (options.maxResults && options.maxResults > 0) {
    return results.slice(0, options.maxResults);
  }

  return results;
}

function addRangeToSet(set: Set<number>, startLine: number, endLine: number) {
  for (let l = startLine; l <= endLine; l++) {
    set.add(l);
  }
}

function splitSubwords(symbolName: string): string[] {
  return symbolName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9_$]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(s => s.length > 0);
}

function computeBestSnippets(
  matchedLines: number[],
  symbolLines: number[],
  totalLines: number,
  maxSnippets: number
): { start: number; end: number }[] {
  if (matchedLines.length === 0) {
    return [];
  }

  const contextWindow = 3;
  const symbolSet = new Set(symbolLines);

  const candidateRanges: { start: number; end: number; score: number }[] = [];
  let currentStart = Math.max(1, matchedLines[0] - contextWindow);
  let currentEnd = Math.min(totalLines, matchedLines[0] + contextWindow);
  let currentScore = symbolSet.has(matchedLines[0]) ? 10 : 1;

  for (let i = 1; i < matchedLines.length; i++) {
    const line = matchedLines[i];
    const lineStart = Math.max(1, line - contextWindow);
    const lineEnd = Math.min(totalLines, line + contextWindow);

    if (lineStart <= currentEnd + 1) {
      currentEnd = Math.max(currentEnd, lineEnd);
      currentScore += symbolSet.has(line) ? 10 : 1;
    } else {
      candidateRanges.push({ start: currentStart, end: currentEnd, score: currentScore });
      currentStart = lineStart;
      currentEnd = lineEnd;
      currentScore = symbolSet.has(line) ? 10 : 1;
    }
  }
  candidateRanges.push({ start: currentStart, end: currentEnd, score: currentScore });

  candidateRanges.sort((a, b) => b.score - a.score);
  const selected = candidateRanges.slice(0, maxSnippets);
  selected.sort((a, b) => a.start - b.start);

  return selected.map(r => ({ start: r.start, end: r.end }));
}
