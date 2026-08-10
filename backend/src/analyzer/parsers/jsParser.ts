import ts from 'typescript';
import { ExtractedImport, LanguageParser, ParseFileResult } from './types.js';

export const jsParser: LanguageParser = {
  name: 'TypeScript/JavaScript AST Parser',
  parserType: 'ast',
  supportedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],

  parse(content: string, filePath: string): ParseFileResult {
    const imports: ExtractedImport[] = [];
    const importSet = new Set<string>();
    let exportsCount = 0;
    let hasParseError = false;
    let errorMessage: string | undefined = undefined;

    try {
      const scriptTarget = ts.ScriptTarget.Latest;
      const scriptKind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX :
        filePath.endsWith('.jsx') ? ts.ScriptKind.JSX :
        filePath.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;

      const sourceFile = ts.createSourceFile(filePath, content, scriptTarget, true, scriptKind);

      const diagnostics = (sourceFile as unknown as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics;
      if (diagnostics && diagnostics.length > 0) {
        hasParseError = true;
        errorMessage = diagnostics[0].messageText.toString();
      }

      function visit(node: ts.Node) {
        // 1. ESM Import Declaration (import x from 'specifier')
        if (ts.isImportDeclaration(node)) {
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            addImport(specifier, false, node);
          }
        }

        // 2. ESM Re-export Declaration (export { x } from 'specifier' or export * from 'specifier')
        else if (ts.isExportDeclaration(node)) {
          exportsCount++;
          if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const specifier = node.moduleSpecifier.text;
            addImport(specifier, false, node);
          }
        }

        // 3. Export Assignment (export default x)
        else if (ts.isExportAssignment(node)) {
          exportsCount++;
        }

        // 4. CommonJS require('specifier') or ESM dynamic import('specifier')
        else if (ts.isCallExpression(node)) {
          // CommonJS require
          if (ts.isIdentifier(node.expression) && node.expression.text === 'require') {
            if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
              const specifier = node.arguments[0].text;
              addImport(specifier, false, node);
            }
          }
          // Dynamic import('specifier')
          else if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
              const specifier = node.arguments[0].text;
              addImport(specifier, true, node);
            }
          }
        }

        // 5. TypeScript import x = require('specifier')
        else if (ts.isImportEqualsDeclaration(node)) {
          if (ts.isExternalModuleReference(node.moduleReference)) {
            const expression = node.moduleReference.expression;
            if (expression && ts.isStringLiteral(expression)) {
              addImport(expression.text, false, node);
            }
          }
        }

        // Count modifiers with export keyword
        else if (ts.canHaveModifiers(node) && ts.getModifiers(node)) {
          const modifiers = ts.getModifiers(node);
          if (modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
            exportsCount++;
          }
        }

        ts.forEachChild(node, visit);
      }

      function addImport(specifier: string, isDynamic: boolean, node: ts.Node) {
        if (!specifier || typeof specifier !== 'string') return;
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
        imports.push({
          specifier,
          isRelative: specifier.startsWith('.'),
          isDynamic,
          line
        });
      }

      visit(sourceFile);

    } catch (err: any) {
      hasParseError = true;
      errorMessage = err.message || 'AST parsing failed';
    }

    return {
      parserType: 'ast',
      imports,
      exportsCount,
      hasParseError,
      errorMessage
    };
  }
};
