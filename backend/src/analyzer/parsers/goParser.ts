import { ExtractedImport, LanguageParser, ParseFileResult } from './types.js';

const GO_STDLIB = new Set([
  'archive/tar', 'archive/zip', 'bufio', 'bytes', 'compress/bzip2', 'compress/flate',
  'compress/gzip', 'compress/lzw', 'compress/zlib', 'container/heap', 'container/list',
  'container/ring', 'context', 'crypto', 'crypto/aes', 'crypto/cipher', 'crypto/des',
  'crypto/dsa', 'crypto/ecdh', 'crypto/ecdsa', 'crypto/ed25519', 'crypto/elliptic',
  'crypto/hmac', 'crypto/md5', 'crypto/rand', 'crypto/rsa', 'crypto/sha1', 'crypto/sha256',
  'crypto/sha512', 'crypto/subtle', 'crypto/tls', 'crypto/x509', 'database/sql',
  'database/sql/driver', 'debug/dwarf', 'debug/elf', 'debug/macho', 'debug/pe',
  'debug/plan9obj', 'embed', 'encoding', 'encoding/ascii85', 'encoding/asn1',
  'encoding/base32', 'encoding/base64', 'encoding/binary', 'encoding/csv',
  'encoding/gob', 'encoding/hex', 'encoding/json', 'encoding/pem', 'encoding/xml',
  'errors', 'expvar', 'flag', 'fmt', 'go/ast', 'go/build', 'go/constant', 'go/doc',
  'go/format', 'go/parser', 'go/printer', 'go/scanner', 'go/token', 'go/types',
  'hash', 'hash/adler32', 'hash/crc32', 'hash/crc64', 'hash/fnv', 'hash/maphash',
  'html', 'html/template', 'image', 'image/color', 'image/draw', 'image/gif',
  'image/jpeg', 'image/png', 'index/suffixarray', 'io', 'io/fs', 'io/ioutil',
  'log', 'log/syslog', 'math', 'math/big', 'math/cmplx', 'math/rand', 'mime',
  'mime/multipart', 'mime/quotedprintable', 'net', 'net/http', 'net/http/cgi',
  'net/http/cookiejar', 'net/http/fcgi', 'net/http/httptest', 'net/http/httputil',
  'net/http/pprof', 'net/mail', 'net/netip', 'net/rpc', 'net/rpc/jsonrpc',
  'net/smtp', 'net/textproto', 'net/url', 'os', 'os/exec', 'os/signal', 'os/user',
  'path', 'path/filepath', 'plugin', 'reflect', 'regexp', 'regexp/syntax', 'runtime',
  'runtime/cgo', 'runtime/debug', 'runtime/metrics', 'runtime/pprof', 'runtime/race',
  'runtime/trace', 'sort', 'strconv', 'strings', 'sync', 'sync/atomic', 'syscall',
  'testing', 'testing/fstest', 'testing/quick', 'text/scanner', 'text/tabwriter',
  'text/template', 'time', 'unicode', 'utf8', 'utf16', 'unsafe'
]);

export const goParser: LanguageParser = {
  name: 'Go Structured Parser',
  parserType: 'lexical',
  supportedExtensions: ['.go'],

  parse(content: string, filePath: string): ParseFileResult {
    const imports: ExtractedImport[] = [];
    const importSet = new Set<string>();
    let exportsCount = 0;
    let hasParseError = false;

    try {
      // Remove multiline comments /* ... */
      const sanitized = content.replace(/\/\*[\s\S]*?\*\//g, '');
      const lines = sanitized.split('\n');

      let inImportBlock = false;

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        let line = lines[lineNum].trim();

        // Remove single-line comments //
        const commentIdx = line.indexOf('//');
        if (commentIdx !== -1) {
          line = line.substring(0, commentIdx).trim();
        }

        if (!line) continue;

        // Count exported Go functions/types (starts with capital letter)
        if (/^func\s+[A-Z]/.test(line) || /^type\s+[A-Z]/.test(line)) {
          exportsCount++;
        }

        // Import block start: import (
        if (line === 'import (') {
          inImportBlock = true;
          continue;
        }

        if (inImportBlock) {
          if (line === ')') {
            inImportBlock = false;
            continue;
          }
          const match = /["']([^"']+)["']/.exec(line);
          if (match) {
            addImport(match[1], lineNum + 1);
          }
          continue;
        }

        // Single line import: import "fmt"
        const singleMatch = /^import\s+["']([^"']+)["']/.exec(line);
        if (singleMatch) {
          addImport(singleMatch[1], lineNum + 1);
        }
      }

      function addImport(specifier: string, line: number) {
        if (!specifier) return;

        // Skip Go Standard Library packages
        if (GO_STDLIB.has(specifier)) {
          return;
        }

        const isRelative = specifier.startsWith('.') || specifier.startsWith('/');

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
