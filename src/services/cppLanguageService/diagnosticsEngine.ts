import type { CppAnalysisResult, Diagnostic, Token } from './types';

const KNOWN_STD_SYMBOLS: Record<string, { header: string; cpp23?: boolean }> = {
  println: { header: '<print>', cpp23: true },
  print: { header: '<print>', cpp23: true },
  expected: { header: '<expected>', cpp23: true },
  unexpected: { header: '<expected>', cpp23: true },
  generator: { header: '<generator>', cpp23: true },
  mdspan: { header: '<mdspan>', cpp23: true },
  flat_map: { header: '<flat_map>', cpp23: true },
  flat_set: { header: '<flat_set>', cpp23: true },
  unreachable: { header: '<utility>', cpp23: true },
  byteswap: { header: '<bit>', cpp23: true },
  to_underlying: { header: '<utility>', cpp23: true },
  vector: { header: '<vector>' },
  string: { header: '<string>' },
  cout: { header: '<iostream>' },
  cin: { header: '<iostream>' },
  endl: { header: '<iostream>' },
  sort: { header: '<algorithm>' },
  find: { header: '<algorithm>' },
  map: { header: '<map>' },
  set: { header: '<set>' },
  unordered_map: { header: '<unordered_map>' },
  unordered_set: { header: '<unordered_set>' },
  queue: { header: '<queue>' },
  stack: { header: '<stack>' },
  optional: { header: '<optional>' },
  variant: { header: '<variant>' },
  tuple: { header: '<tuple>' },
  pair: { header: '<utility>' },
  unique_ptr: { header: '<memory>' },
  shared_ptr: { header: '<memory>' },
  make_unique: { header: '<memory>' },
  make_shared: { header: '<memory>' },
};

export class CppDiagnosticsEngine {
  private analysis: CppAnalysisResult;
  private source: string;
  private tokens: Token[];

  constructor(analysis: CppAnalysisResult, source: string) {
    this.analysis = analysis;
    this.source = source;
    this.tokens = analysis.tokens;
  }

  public runDiagnostics(): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // 1. Bracket / Parentheses / Brace Balance Analysis
    this.checkBracketBalancing(diagnostics);

    // 2. Missing Semicolon Check
    this.checkMissingSemicolons(diagnostics);

    // 3. Modern C++23 Header / Module Import Suggestion
    this.checkRequiredHeaders(diagnostics);

    // 4. Module Import Syntax Check
    this.checkModuleSyntax(diagnostics);

    return diagnostics;
  }

  private checkBracketBalancing(diagnostics: Diagnostic[]) {
    const stack: { char: string; token: Token }[] = [];
    const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
    const matching: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

    for (const token of this.tokens) {
      if (token.type === 'punctuation' || token.type === 'operator') {
        const val = token.value;
        if (pairs[val]) {
          stack.push({ char: val, token });
        } else if (matching[val]) {
          const expectedOpen = matching[val];
          if (stack.length === 0) {
            diagnostics.push({
              range: token.range,
              severity: 'error',
              message: `Unmatched closing bracket '${val}'`,
              source: 'cpp23-lsp',
              code: 'E001',
            });
          } else {
            const last = stack.pop()!;
            if (last.char !== expectedOpen) {
              diagnostics.push({
                range: token.range,
                severity: 'error',
                message: `Mismatched bracket: expected '${pairs[last.char]}' for '${last.char}' at line ${last.token.range.start.line}, but found '${val}'`,
                source: 'cpp23-lsp',
                code: 'E002',
              });
            }
          }
        }
      }
    }

    for (const unclosed of stack) {
      diagnostics.push({
        range: unclosed.token.range,
        severity: 'error',
        message: `Unclosed bracket '${unclosed.char}'`,
        source: 'cpp23-lsp',
        code: 'E003',
      });
    }
  }

  private checkMissingSemicolons(diagnostics: Diagnostic[]) {
    const lines = this.source.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('#')) {
        continue;
      }

      // Check statements that must end with semicolon
      if (
        /^(?:return|import|using|break|continue|co_yield|co_return)\b/.test(trimmed) &&
        !trimmed.endsWith(';') &&
        !trimmed.endsWith('{') &&
        !trimmed.endsWith('}')
      ) {
        // If next line starts with an operator or is a continuation, skip
        const nextLine = lines[i + 1]?.trim() || '';
        if (nextLine.startsWith('<<') || nextLine.startsWith('+') || nextLine.startsWith('.')) {
          continue;
        }

        const col = rawLine.length + 1;
        const endPos = { line: lineNum, column: col, offset: this.getOffset(lineNum, col) };

        diagnostics.push({
          range: { start: endPos, end: endPos },
          severity: 'error',
          message: `Expected ';' at end of statement`,
          source: 'cpp23-lsp',
          code: 'E004',
          quickFix: {
            title: "Insert ';'",
            replacement: ';',
            range: { start: endPos, end: endPos },
          },
        });
      }
    }
  }

  private checkRequiredHeaders(diagnostics: Diagnostic[]) {
    const hasImportStd = this.analysis.importedModules.some(m => m === 'std' || m === 'std.compat');
    if (hasImportStd) return; // 'import std;' brings in all standard headers!

    const existingHeaders = new Set(this.analysis.includedHeaders.map(h => h.toLowerCase()));

    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (token.type === 'identifier' || token.type === 'type') {
        const prev = this.tokens[i - 1];
        const isStdQualified = prev && prev.value === '::' && this.tokens[i - 2]?.value === 'std';

        const info = KNOWN_STD_SYMBOLS[token.value];
        if (info && isStdQualified) {
          const headerName = info.header.replace(/[<>]/g, '').toLowerCase();
          if (!existingHeaders.has(headerName)) {
            diagnostics.push({
              range: token.range,
              severity: 'warning',
              message: `'std::${token.value}' is used but #${info.header} (or 'import std;') is not included.`,
              source: 'cpp23-lsp',
              code: 'W001',
              quickFix: {
                title: `Add #include ${info.header}`,
                replacement: `#include ${info.header}\n`,
                range: {
                  start: { line: 1, column: 1, offset: 0 },
                  end: { line: 1, column: 1, offset: 0 },
                },
              },
            });
          }
        }
      }
    }
  }

  private checkModuleSyntax(diagnostics: Diagnostic[]) {
    for (let i = 0; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (token.value === 'import' && token.type === 'module') {
        const next = this.tokens[i + 1];
        if (!next || next.value === ';') {
          diagnostics.push({
            range: token.range,
            severity: 'error',
            message: `Expected module name after 'import' (e.g. 'import std;' or 'import <vector>;')`,
            source: 'cpp23-lsp',
            code: 'E005',
          });
        }
      }
    }
  }

  private getOffset(line: number, column: number): number {
    const lines = this.source.split('\n');
    let offset = 0;
    for (let i = 0; i < line - 1; i++) {
      offset += lines[i].length + 1;
    }
    return offset + column - 1;
  }
}

export const getCppDiagnostics = (analysis: CppAnalysisResult, source: string): Diagnostic[] => {
  const engine = new CppDiagnosticsEngine(analysis, source);
  return engine.runDiagnostics();
};
