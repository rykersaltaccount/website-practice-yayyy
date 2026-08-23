import type { CppAnalysisResult, Position, CompletionResult, Diagnostic } from './types';
import { tokenizeCpp23 } from './lexer';
import { parseCpp23 } from './parser';
import { getCppCompletions } from './completionEngine';
import { getCppDiagnostics } from './diagnosticsEngine';

export * from './types';
export * from './lexer';
export * from './parser';
export * from './completionEngine';
export * from './diagnosticsEngine';

export class CppLanguageService {
  public static analyzeDocument(source: string): CppAnalysisResult {
    const tokens = tokenizeCpp23(source);
    const analysis = parseCpp23(tokens);
    const diagnostics = getCppDiagnostics(analysis, source);
    analysis.diagnostics = diagnostics;
    return analysis;
  }

  public static getCompletions(
    analysis: CppAnalysisResult,
    source: string,
    position: Position
  ): CompletionResult {
    return getCppCompletions(analysis, source, position);
  }

  public static getDiagnostics(
    analysis: CppAnalysisResult,
    source: string
  ): Diagnostic[] {
    return getCppDiagnostics(analysis, source);
  }
}
