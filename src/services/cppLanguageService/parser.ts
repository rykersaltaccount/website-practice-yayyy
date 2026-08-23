import type { CppAnalysisResult, Diagnostic, Range, Scope, SymbolDefinition, Token } from './types';

export class CppParser {
  private tokens: Token[];
  private current = 0;
  private rootScope: Scope;
  private currentScope: Scope;
  private symbols: SymbolDefinition[] = [];
  private diagnostics: Diagnostic[] = [];
  private importedModules: string[] = [];
  private includedHeaders: string[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    const initialRange: Range = {
      start: { line: 1, column: 1, offset: 0 },
      end: tokens.length > 0 ? tokens[tokens.length - 1].range.end : { line: 1, column: 1, offset: 0 },
    };

    this.rootScope = {
      id: 'scope-global',
      kind: 'global',
      symbols: new Map(),
      range: initialRange,
      children: [],
    };
    this.currentScope = this.rootScope;
  }

  private peek(offset: number = 0): Token | undefined {
    return this.tokens[this.current + offset];
  }

  private match(...values: string[]): boolean {
    const token = this.peek();
    return Boolean(token && values.includes(token.value));
  }

  private advance(): Token | undefined {
    if (this.current < this.tokens.length) {
      const token = this.tokens[this.current];
      this.current++;
      return token;
    }
    return undefined;
  }

  private pushScope(kind: Scope['kind'], name?: string, startToken?: Token): Scope {
    const newScope: Scope = {
      id: `scope-${kind}-${Math.random().toString(36).substring(2, 8)}`,
      parentId: this.currentScope.id,
      kind,
      name,
      symbols: new Map(),
      range: {
        start: startToken?.range.start || this.peek()?.range.start || { line: 1, column: 1, offset: 0 },
        end: { line: 999999, column: 999999, offset: 99999999 },
      },
      children: [],
    };
    this.currentScope.children.push(newScope);
    this.currentScope = newScope;
    return newScope;
  }

  private popScope(endToken?: Token) {
    if (this.currentScope.parentId) {
      if (endToken) {
        this.currentScope.range.end = endToken.range.end;
      }
      const findParent = (s: Scope, targetId: string): Scope | undefined => {
        if (s.id === targetId) return s;
        for (const child of s.children) {
          const res = findParent(child, targetId);
          if (res) return res;
        }
        return undefined;
      };
      const parent = findParent(this.rootScope, this.currentScope.parentId);
      if (parent) {
        this.currentScope = parent;
      }
    }
  }

  private addSymbol(symbol: SymbolDefinition) {
    this.currentScope.symbols.set(symbol.name, symbol);
    this.symbols.push(symbol);
  }

  public parse(): CppAnalysisResult {
    while (this.current < this.tokens.length) {
      try {
        this.parseTopLevelItem();
      } catch {
        // Fault-tolerance: Recover to next semicolon or brace
        this.recover();
      }
    }

    return {
      tokens: this.tokens,
      rootScope: this.rootScope,
      symbols: this.symbols,
      diagnostics: this.diagnostics,
      importedModules: this.importedModules,
      includedHeaders: this.includedHeaders,
    };
  }

  private parseTopLevelItem() {
    const token = this.peek();
    if (!token) return;

    // Preprocessor Directive
    if (token.type === 'preprocessor') {
      const match = token.value.match(/^#\s*include\s*[<"]([^>"]+)[>"]/);
      if (match) {
        this.includedHeaders.push(match[1]);
      }
      this.advance();
      return;
    }

    // C++23 Module Import: import std; import std.compat; import <header>;
    if (token.value === 'import' && token.type === 'module') {
      this.parseImportDirective();
      return;
    }

    // Export module declaration
    if (token.value === 'export' && this.peek(1)?.value === 'module') {
      this.advance(); // export
      this.advance(); // module
      const moduleName = this.readQualifiedName();
      if (moduleName) this.importedModules.push(moduleName);
      if (this.match(';')) this.advance();
      return;
    }

    // Namespaces
    if (token.value === 'namespace') {
      this.parseNamespace();
      return;
    }

    // Struct / Class
    if (token.value === 'struct' || token.value === 'class') {
      this.parseClassOrStruct();
      return;
    }

    // Concepts
    if (token.value === 'concept') {
      this.parseConcept();
      return;
    }

    // Template prefix
    if (token.value === 'template') {
      this.parseTemplateDeclaration();
      return;
    }

    // Scope block { ... }
    if (token.value === '{') {
      const start = this.advance()!;
      this.pushScope('block', undefined, start);
      return;
    }

    if (token.value === '}') {
      const end = this.advance()!;
      this.popScope(end);
      return;
    }

    // Functions, variables, using statements, etc.
    this.parseDeclarationOrStatement();
  }

  private parseImportDirective() {
    this.advance(); // consume 'import'
    let moduleName = '';
    const startToken = this.peek();

    if (this.match('<')) {
      this.advance();
      while (this.peek() && !this.match('>')) {
        moduleName += this.advance()!.value;
      }
      if (this.match('>')) this.advance();
    } else {
      moduleName = this.readQualifiedName();
    }

    if (moduleName) {
      this.importedModules.push(moduleName);
      this.addSymbol({
        name: moduleName,
        kind: 'module',
        range: { start: startToken?.range.start || { line: 1, column: 1, offset: 0 }, end: this.peek()?.range.end || { line: 1, column: 1, offset: 0 } },
        scopeId: this.currentScope.id,
      });
    }

    if (this.match(';')) this.advance();
  }

  private parseNamespace() {
    this.advance(); // 'namespace'
    const name = this.readQualifiedName() || 'anonymous';
    const startToken = this.peek();
    this.addSymbol({
      name,
      kind: 'namespace',
      range: { start: startToken?.range.start || { line: 1, column: 1, offset: 0 }, end: startToken?.range.end || { line: 1, column: 1, offset: 0 } },
      scopeId: this.currentScope.id,
    });

    if (this.match('{')) {
      const brace = this.advance()!;
      this.pushScope('namespace', name, brace);
    }
  }

  private parseClassOrStruct() {
    const kind = this.advance()!.value as 'class' | 'struct';
    const nameToken = this.peek();
    let name = 'anonymous';

    if (nameToken && (nameToken.type === 'identifier' || nameToken.type === 'type')) {
      name = this.advance()!.value;
    }

    const symbol: SymbolDefinition = {
      name,
      kind,
      range: { start: nameToken?.range.start || { line: 1, column: 1, offset: 0 }, end: nameToken?.range.end || { line: 1, column: 1, offset: 0 } },
      scopeId: this.currentScope.id,
      members: new Map(),
    };
    this.addSymbol(symbol);

    // Skip inheritance up to '{' or ';'
    while (this.peek() && !this.match('{', ';')) {
      this.advance();
    }

    if (this.match('{')) {
      const brace = this.advance()!;
      this.pushScope(kind, name, brace);
    }
  }

  private parseConcept() {
    this.advance(); // 'concept'
    const nameToken = this.peek();
    if (nameToken && nameToken.type === 'identifier') {
      this.advance();
      this.addSymbol({
        name: nameToken.value,
        kind: 'concept',
        range: nameToken.range,
        scopeId: this.currentScope.id,
      });
    }

    while (this.peek() && !this.match(';')) {
      this.advance();
    }
    if (this.match(';')) this.advance();
  }

  private parseTemplateDeclaration() {
    this.advance(); // 'template'
    if (this.match('<')) {
      this.advance();
      let depth = 1;
      while (this.peek() && depth > 0) {
        if (this.match('<')) depth++;
        else if (this.match('>')) depth--;
        this.advance();
      }
    }
  }

  private parseDeclarationOrStatement() {
    let isConstexpr = false;
    let isConst = false;

    while (this.match('constexpr', 'consteval', 'constinit', 'inline', 'static', 'virtual', 'explicit', 'friend')) {
      const mod = this.advance()!.value;
      if (mod.startsWith('const')) isConstexpr = true;
    }

    if (this.match('const')) {
      isConst = true;
      this.advance();
    }

    // Type or auto
    const typeTokens: string[] = [];
    while (this.peek() && (this.peek()!.type === 'type' || this.peek()!.type === 'identifier' || this.match('::', '<', '>', '*', '&', '&&', 'auto', 'decltype'))) {
      if (this.peek(1)?.value === '(' && !['auto', 'decltype', 'void', 'int', 'bool', 'char', 'double', 'float'].includes(this.peek()!.value)) {
        // Looks like a function name without explicit type or constructor
        break;
      }
      typeTokens.push(this.advance()!.value);
      if (this.match('<')) {
        let depth = 1;
        typeTokens.push(this.advance()!.value);
        while (this.peek() && depth > 0) {
          if (this.match('<')) depth++;
          else if (this.match('>')) depth--;
          typeTokens.push(this.advance()!.value);
        }
      }
      if (this.peek()?.type === 'identifier' && this.peek(1)?.value === '(') {
        break;
      }
    }

    const typeStr = typeTokens.join(' ').replace(/\s+([*&])/g, '$1').trim();

    // Identifier or Operator (e.g. operator[])
    let name = '';
    let nameToken = this.peek();

    if (this.match('operator')) {
      this.advance(); // 'operator'
      let op = '';
      if (this.match('[', ']')) {
        while (this.match('[', ']', '(', ')', '+', '-', '*', '/', '=', '<', '>', '!')) {
          op += this.advance()!.value;
        }
        name = `operator${op}`;
      } else if (this.peek()) {
        name = `operator${this.advance()!.value}`;
      }
    } else if (nameToken && (nameToken.type === 'identifier' || nameToken.type === 'type')) {
      name = this.readQualifiedName();
    }

    if (!name) {
      this.advance();
      return;
    }

    // Is it a function declaration/definition?
    if (this.match('(')) {
      const funcStart = nameToken?.range || this.peek()!.range;
      const funcSymbol: SymbolDefinition = {
        name,
        kind: 'function',
        type: typeStr || 'auto',
        range: funcStart,
        scopeId: this.currentScope.id,
        isConstexpr,
        isConst,
      };
      this.addSymbol(funcSymbol);

      // Parse parameters (including C++23 deducing this: `this auto&& self`)
      this.pushScope('function', name, nameToken);
      this.parseFunctionParameters();

      // Trailing return type -> auto
      if (this.match('->')) {
        this.advance();
        const trailing: string[] = [];
        while (this.peek() && !this.match('{', ';', 'noexcept', 'const', 'requires')) {
          trailing.push(this.advance()!.value);
        }
        funcSymbol.type = trailing.join(' ');
      }

      // Constraints / qualifiers
      while (this.peek() && !this.match('{', ';')) {
        this.advance();
      }

      if (this.match('{')) {
        this.advance(); // body starts
      } else if (this.match(';')) {
        this.advance();
        this.popScope(); // pop param scope for declaration
      }
      return;
    }

    // Otherwise, it's a variable or field
    const varSymbol: SymbolDefinition = {
      name,
      kind: this.currentScope.kind === 'class' || this.currentScope.kind === 'struct' ? 'variable' : 'variable',
      type: typeStr || 'auto',
      range: nameToken?.range || { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      scopeId: this.currentScope.id,
      isConstexpr,
      isConst,
    };
    this.addSymbol(varSymbol);

    // Skip initializer up to ';' or ','
    while (this.peek() && !this.match(';', '{')) {
      this.advance();
    }
    if (this.match(';')) {
      this.advance();
    }
  }

  private parseFunctionParameters() {
    this.advance(); // '('
    let depth = 1;

    while (this.peek() && depth > 0) {
      if (this.match('(')) {
        depth++;
        this.advance();
        continue;
      }
      if (this.match(')')) {
        depth--;
        if (depth === 0) {
          this.advance();
          break;
        }
      }

      let isExplicitObjectParam = false;
      if (this.match('this')) {
        isExplicitObjectParam = true;
        this.advance(); // C++23 'this'
      }

      const paramTypeTokens: string[] = [];
      while (this.peek() && (this.peek()!.type === 'type' || this.peek()!.type === 'identifier' || this.match('::', '<', '>', '*', '&', '&&', 'const', 'auto'))) {
        if (this.peek()?.type === 'identifier' && (this.peek(1)?.value === ',' || this.peek(1)?.value === ')' || this.peek(1)?.value === '=')) {
          break;
        }
        paramTypeTokens.push(this.advance()!.value);
      }

      const paramNameToken = this.peek();
      if (paramNameToken && paramNameToken.type === 'identifier' && !['const', 'auto', 'int', 'void'].includes(paramNameToken.value)) {
        this.advance();
        this.addSymbol({
          name: paramNameToken.value,
          kind: 'parameter',
          type: paramTypeTokens.join(' ') || 'auto',
          range: paramNameToken.range,
          scopeId: this.currentScope.id,
          isExplicitObjectParam,
        });
      }

      // Skip default argument if any
      if (this.match('=')) {
        while (this.peek() && !this.match(',', ')')) {
          this.advance();
        }
      }

      if (this.match(',')) this.advance();
    }
  }

  private readQualifiedName(): string {
    let name = '';
    while (this.peek() && (this.peek()!.type === 'identifier' || this.peek()!.type === 'type' || this.match('::'))) {
      name += this.advance()!.value;
    }
    return name;
  }

  private recover() {
    while (this.peek()) {
      const tok = this.advance();
      if (!tok) break;
      if (tok.value === ';' || tok.value === '}') {
        break;
      }
    }
  }
}

export const parseCpp23 = (tokens: Token[]): CppAnalysisResult => {
  const parser = new CppParser(tokens);
  return parser.parse();
};
