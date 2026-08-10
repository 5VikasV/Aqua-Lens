export type ParserType = 'ast' | 'lexical';

export interface ExtractedImport {
  specifier: string;
  isRelative: boolean;
  isDynamic: boolean;
  line?: number;
}

export interface ParseFileResult {
  parserType: ParserType;
  imports: ExtractedImport[];
  exportsCount: number;
  hasParseError: boolean;
  errorMessage?: string;
}

export interface LanguageParser {
  name: string;
  parserType: ParserType;
  supportedExtensions: string[];
  parse(content: string, filePath: string): ParseFileResult;
}
