import { ExtractedImport, LanguageParser, ParseFileResult } from './types.js';

const PYTHON_STDLIB = new Set([
  'abc', 'argparse', 'array', 'ast', 'asyncio', 'atexit', 'base64', 'bdb',
  'binascii', 'bisect', 'builtins', 'bz2', 'calendar', 'cgi', 'cgitb', 'chunk',
  'cmath', 'cmd', 'code', 'codecs', 'codeop', 'collections', 'colorsys', 'compileall',
  'concurrent', 'configparser', 'contextlib', 'contextvars', 'copy', 'copyreg',
  'crypt', 'csv', 'ctypes', 'curses', 'dataclasses', 'datetime', 'dbm', 'decimal',
  'difflib', 'dis', 'distutils', 'doctest', 'email', 'enum', 'errno', 'faulthandler',
  'fcntl', 'filecmp', 'fileinput', 'fnmatch', 'fractions', 'ftplib', 'functools',
  'gc', 'getopt', 'getpass', 'gettext', 'glob', 'graphlib', 'grp', 'gzip', 'hashlib',
  'heapq', 'hmac', 'html', 'http', 'imaplib', 'imghdr', 'imp', 'importlib', 'inspect',
  'io', 'ipaddress', 'itertools', 'json', 'keyword', 'lib2to3', 'linecache', 'locale',
  'logging', 'lzma', 'mailbox', 'mailcap', 'marshal', 'math', 'mimetypes', 'mmap',
  'modulefinder', 'msvcrt', 'multiprocessing', 'netrc', 'nntplib', 'numbers',
  'operator', 'optparse', 'os', 'pathlib', 'pdb', 'pickle', 'pickletools', 'pkgutil',
  'platform', 'plistlib', 'poplib', 'posix', 'pprint', 'profile', 'pstats', 'pty',
  'pwd', 'py_compile', 'pyclbr', 'pydoc', 'queue', 'quopri', 'random', 're',
  'readline', 'reprlib', 'resource', 'rlcompleter', 'runpy', 'sched', 'secrets',
  'select', 'selectors', 'shelve', 'shutil', 'signal', 'site', 'smtpd', 'smtplib',
  'sndhdr', 'socket', 'socketserver', 'sqlite3', 'ssl', 'stat', 'statistics',
  'string', 'stringprep', 'struct', 'subprocess', 'sunau', 'symbol', 'symtable',
  'sys', 'sysconfig', 'syslog', 'tabnanny', 'tarfile', 'telnetlib', 'tempfile',
  'termios', 'test', 'textwrap', 'threading', 'time', 'timeit', 'tkinter', 'token',
  'tokenize', 'tomllib', 'trace', 'traceback', 'tracemalloc', 'tty', 'turtle',
  'turtledemo', 'types', 'typing', 'unicodedata', 'unittest', 'urllib', 'uu',
  'uuid', 'venv', 'warnings', 'wave', 'weakref', 'webbrowser', 'winsound', 'wsgiref',
  'xdrlib', 'xml', 'xmlrpc', 'zipapp', 'zipfile', 'zipimport', 'zlib', 'zoneinfo'
]);

export const pythonParser: LanguageParser = {
  name: 'Python Structured Parser',
  parserType: 'lexical',
  supportedExtensions: ['.py'],

  parse(content: string, filePath: string): ParseFileResult {
    const imports: ExtractedImport[] = [];
    const importSet = new Set<string>();
    let exportsCount = 0;
    let hasParseError = false;

    try {
      // Remove docstrings and multiline comments ("""...""" and '''...''')
      const sanitized = content
        .replace(/"""[\s\S]*?"""/g, '')
        .replace(/'''[\s\S]*?'''/g, '');

      const lines = sanitized.split('\n');

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        let line = lines[lineNum].trim();

        // Strip single-line comments
        const commentIdx = line.indexOf('#');
        if (commentIdx !== -1) {
          line = line.substring(0, commentIdx).trim();
        }

        if (!line) continue;

        // Count top-level functions/classes as exports
        if (/^(def|class)\s+[a-zA-Z0-9_]+/.test(line)) {
          exportsCount++;
        }

        // Pattern 1: from .relative import symbol OR from module import symbol
        const fromMatch = /^from\s+([.\w]+)\s+import\s+(.+)$/.exec(line);
        if (fromMatch) {
          const modSpecifier = fromMatch[1];
          const isRelative = modSpecifier.startsWith('.');
          addImport(modSpecifier, isRelative, lineNum + 1);
          continue;
        }

        // Pattern 2: import module, module2
        const importMatch = /^import\s+(.+)$/.exec(line);
        if (importMatch) {
          const modulesStr = importMatch[1];
          const modules = modulesStr.split(',');
          for (const m of modules) {
            const cleanMod = m.trim().split(/\s+as\s+/)[0].trim();
            if (cleanMod) {
              const isRelative = cleanMod.startsWith('.');
              addImport(cleanMod, isRelative, lineNum + 1);
            }
          }
        }
      }

      function addImport(specifier: string, isRelative: boolean, line: number) {
        if (!specifier) return;
        
        // Check if stdlib (e.g., 'os', 'sys', 'os.path')
        const rootPkg = specifier.replace(/^\.+/, '').split('.')[0];
        if (PYTHON_STDLIB.has(rootPkg) && !isRelative) {
          // Standard library package - skipped from external third-party dependencies
          return;
        }

        if (!importSet.has(specifier)) {
          importSet.add(specifier);
          imports.push({
            specifier,
            isRelative,
            isDynamic: false,
            line
          });
        }
      }

    } catch (err: any) {
      hasParseError = true;
    }

    return {
      parserType: 'lexical',
      imports,
      exportsCount,
      hasParseError
    };
  }
};
