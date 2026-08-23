export type TokenType =
  | 'keyword'
  | 'identifier'
  | 'type'
  | 'number'
  | 'string'
  | 'character'
  | 'operator'
  | 'punctuation'
  | 'preprocessor'
  | 'comment'
  | 'module'
  | 'unknown';

export interface Position {
  line: number; // 1-indexed
  column: number; // 1-indexed
  offset: number; // 0-indexed character offset
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Token {
  type: TokenType;
  value: string;
  range: Range;
}

export type SymbolKind =
  | 'variable'
  | 'function'
  | 'parameter'
  | 'class'
  | 'struct'
  | 'concept'
  | 'module'
  | 'namespace'
  | 'enum'
  | 'typeAlias'
  | 'templateParam';

export interface SymbolDefinition {
  name: string;
  kind: SymbolKind;
  type?: string;
  range: Range;
  scopeId: string;
  doc?: string;
  members?: Map<string, SymbolDefinition>;
  isConstexpr?: boolean;
  isConst?: boolean;
  isExplicitObjectParam?: boolean; // C++23 deducing this
}

export interface Scope {
  id: string;
  parentId?: string;
  kind: 'global' | 'namespace' | 'class' | 'struct' | 'function' | 'block' | 'lambda';
  name?: string;
  symbols: Map<string, SymbolDefinition>;
  range: Range;
  children: Scope[];
}

export type DiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint';

export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  code?: string;
  source: 'cpp23-lsp';
  quickFix?: {
    title: string;
    replacement: string;
    range: Range;
  };
}

export type CompletionItemKind =
  | 'variable'
  | 'function'
  | 'method'
  | 'field'
  | 'class'
  | 'struct'
  | 'module'
  | 'keyword'
  | 'snippet'
  | 'constant'
  | 'concept'
  | 'namespace'
  | 'type';

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText: string;
  filterText?: string;
  sortText?: string;
  cpp23?: boolean;
  score?: number;
}

export interface CompletionResult {
  items: CompletionItem[];
  ghostText?: string;
  triggerPrefix: string;
  position: Position;
}

export interface CppAnalysisResult {
  tokens: Token[];
  rootScope: Scope;
  symbols: SymbolDefinition[];
  diagnostics: Diagnostic[];
  importedModules: string[];
  includedHeaders: string[];
}
