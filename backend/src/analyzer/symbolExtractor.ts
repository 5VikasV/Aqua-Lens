import ts from 'typescript';
import { ExtractedSymbol, SymbolKind } from '../types/index.js';

const JS_TS_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

export function extractSymbols(content: string, filePath: string): ExtractedSymbol[] {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const ext = getExtension(filePath);
  if (!JS_TS_EXTENSIONS.has(ext)) {
    return extractGenericSymbols(content);
  }

  try {
    const scriptTarget = ts.ScriptTarget.Latest;
    const scriptKind = filePath.endsWith('.tsx')
      ? ts.ScriptKind.TSX
      : filePath.endsWith('.jsx')
      ? ts.ScriptKind.JSX
      : filePath.endsWith('.ts')
      ? ts.ScriptKind.TS
      : ts.ScriptKind.JS;

    const sourceFile = ts.createSourceFile(filePath, content, scriptTarget, true, scriptKind);
    const symbols: ExtractedSymbol[] = [];

    function addSymbol(name: string, kind: SymbolKind, node: ts.Node, isExported: boolean) {
      if (!name || name.trim() === '') return;

      const start = node.getStart(sourceFile);
      const end = node.getEnd();
      const lineStart = sourceFile.getLineAndCharacterOfPosition(start).line + 1;
      const lineEnd = sourceFile.getLineAndCharacterOfPosition(end).line + 1;

      symbols.push({
        name,
        kind,
        lineStart,
        lineEnd,
        isExported
      });
    }

    function checkExport(node: ts.Node): boolean {
      if (ts.canHaveModifiers(node)) {
        const modifiers = ts.getModifiers(node);
        if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          return true;
        }
      }
      if (node.parent && ts.isVariableDeclarationList(node.parent) && node.parent.parent) {
        return checkExport(node.parent.parent);
      }
      return false;
    }

    function visit(node: ts.Node) {
      const isExported = checkExport(node);

      // 1. Function Declaration
      if (ts.isFunctionDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'function', node, isExported);
      }
      // 2. Class Declaration
      else if (ts.isClassDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'class', node, isExported);
      }
      // 3. Interface Declaration
      else if (ts.isInterfaceDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'interface', node, isExported);
      }
      // 4. Type Alias Declaration
      else if (ts.isTypeAliasDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'type', node, isExported);
      }
      // 5. Enum Declaration
      else if (ts.isEnumDeclaration(node) && node.name) {
        addSymbol(node.name.text, 'enum', node, isExported);
      }
      // 6. Method Declaration (inside class/object)
      else if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
        addSymbol(node.name.text, 'method', node, isExported);
      }
      // 7. Variable Declaration (const/let/var)
      else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        let kind: SymbolKind = 'variable';
        if (node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
          kind = 'function';
        }
        addSymbol(node.name.text, kind, node, isExported);
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return symbols;
  } catch (err) {
    // If AST parsing fails, fallback safely to generic extractor
    return extractGenericSymbols(content);
  }
}

function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.substring(lastDot).toLowerCase();
}

/**
 * Safe regex fallback for non-JS/TS files (Python, Go, Java, etc.) or syntax error recovery.
 */
function extractGenericSymbols(content: string): ExtractedSymbol[] {
  const symbols: ExtractedSymbol[] = [];
  const lines = content.split('\n');

  // Generic patterns for function/class defs across multiple languages
  const patterns: { regex: RegExp; kind: SymbolKind }[] = [
    { regex: /^\s*(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/, kind: 'function' },
    { regex: /^\s*(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/, kind: 'class' },
    { regex: /^\s*(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/, kind: 'interface' },
    { regex: /^\s*(?:export\s+)?type\s+([a-zA-Z0-9_$]+)/, kind: 'type' },
    { regex: /^\s*def\s+([a-zA-Z0-9_$]+)\s*\(/, kind: 'function' }, // Python function
    { regex: /^\s*func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_$]+)\s*\(/, kind: 'function' } // Go function
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { regex, kind } of patterns) {
      const match = line.match(regex);
      if (match && match[1]) {
        symbols.push({
          name: match[1],
          kind,
          lineStart: i + 1,
          lineEnd: i + 1,
          isExported: line.includes('export') || line.includes('pub ') || line.includes('def ')
        });
        break;
      }
    }
  }

  return symbols;
}
