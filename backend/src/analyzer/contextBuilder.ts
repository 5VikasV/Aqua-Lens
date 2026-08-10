import {
  CodeSearchResult,
  ContextBuilderOptions,
  RetrievedContext,
  SearchResultSnippet
} from '../types/index.js';

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_LINES = 200;
const DEFAULT_MAX_CHARACTERS = 8000;

export function buildRetrievalContext(
  searchResults: CodeSearchResult[],
  options: ContextBuilderOptions = {}
): RetrievedContext {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxLines = options.maxLines ?? DEFAULT_MAX_LINES;
  const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;

  if (!searchResults || searchResults.length === 0) {
    return {
      files: [],
      totalFiles: 0,
      totalLines: 0,
      totalCharacters: 0,
      formattedContext: 'No relevant code context found for query.'
    };
  }

  const selectedFiles: CodeSearchResult[] = [];
  const formattedSections: string[] = [];

  let accumFiles = 0;
  let accumLines = 0;
  let accumCharacters = 0;

  for (const res of searchResults) {
    if (res.score <= 0 || !res.snippets || res.snippets.length === 0) {
      continue;
    }

    if (accumFiles >= maxFiles) {
      break;
    }

    const includedSnippets: SearchResultSnippet[] = [];
    const snippetSectionLines: string[] = [];

    let fileLineCount = 0;
    let fileCharCount = 0;

    for (const snippet of res.snippets) {
      const snippetLines = snippet.content.split('\n');
      const fitsLines = accumLines + snippetLines.length <= maxLines;
      const snippetLength = snippet.content.length;
      const fitsChars = accumCharacters + snippetLength <= maxCharacters;

      if (fitsLines && fitsChars) {
        includedSnippets.push(snippet);
        snippetSectionLines.push(
          `// Lines ${snippet.startLine}-${snippet.endLine}\n${snippet.content}`
        );
        accumLines += snippetLines.length;
        accumCharacters += snippetLength;
        fileLineCount += snippetLines.length;
        fileCharCount += snippetLength;
      } else {
        // Partial line inclusion if budget permits
        const remainingLinesBudget = Math.max(0, maxLines - accumLines);
        const remainingCharsBudget = Math.max(0, maxCharacters - accumCharacters);

        if (remainingLinesBudget > 0 && remainingCharsBudget > 0) {
          const truncLines: string[] = [];
          let currentTruncCharCount = 0;

          for (let i = 0; i < Math.min(snippetLines.length, remainingLinesBudget); i++) {
            const line = snippetLines[i];
            if (currentTruncCharCount + line.length + 1 <= remainingCharsBudget) {
              truncLines.push(line);
              currentTruncCharCount += line.length + 1;
            } else {
              break;
            }
          }

          if (truncLines.length > 0) {
            const endLineTrunc = snippet.startLine + truncLines.length - 1;
            const truncContent = truncLines.join('\n');
            includedSnippets.push({
              startLine: snippet.startLine,
              endLine: endLineTrunc,
              content: truncContent
            });
            snippetSectionLines.push(
              `// Lines ${snippet.startLine}-${endLineTrunc} (Truncated)\n${truncContent}`
            );
            accumLines += truncLines.length;
            accumCharacters += currentTruncCharCount;
            fileLineCount += truncLines.length;
            fileCharCount += currentTruncCharCount;
          }
        }
        break; // Reached limit for snippets in this file or context
      }
    }

    if (includedSnippets.length > 0) {
      accumFiles++;
      const fileHeader = `### File: ${res.filePath} (${res.language}) | Score: ${res.score} | Matched: [${res.matchedTerms.join(', ')}]`;
      const codeBlockLanguage = getMarkdownLang(res.language);
      const fileContentFormatted = `${fileHeader}\n\`\`\`${codeBlockLanguage}\n${snippetSectionLines.join('\n\n')}\n\`\`\``;

      formattedSections.push(fileContentFormatted);

      selectedFiles.push({
        ...res,
        lineRanges: includedSnippets.map(s => ({ start: s.startLine, end: s.endLine })),
        snippets: includedSnippets
      });
    }

    if (accumLines >= maxLines || accumCharacters >= maxCharacters) {
      break;
    }
  }

  if (selectedFiles.length === 0) {
    return {
      files: [],
      totalFiles: 0,
      totalLines: 0,
      totalCharacters: 0,
      formattedContext: 'No relevant code context found for query.'
    };
  }

  const formattedContext = [
    `## Code Retrieval Context`,
    `Total Files: ${accumFiles} | Total Lines: ${accumLines} | Total Characters: ${accumCharacters}`,
    `---`,
    formattedSections.join('\n\n')
  ].join('\n\n');

  return {
    files: selectedFiles,
    totalFiles: accumFiles,
    totalLines: accumLines,
    totalCharacters: accumCharacters,
    formattedContext
  };
}

function getMarkdownLang(language: string): string {
  const langLower = language.toLowerCase();
  if (langLower.includes('typescript')) return 'typescript';
  if (langLower.includes('javascript')) return 'javascript';
  if (langLower.includes('python')) return 'python';
  if (langLower.includes('go')) return 'go';
  if (langLower.includes('java')) return 'java';
  if (langLower.includes('html')) return 'html';
  if (langLower.includes('css')) return 'css';
  if (langLower.includes('json')) return 'json';
  if (langLower.includes('markdown')) return 'markdown';
  return '';
}
