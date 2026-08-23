import type { Position, Token, TokenType } from './types';

const CPP23_KEYWORDS = new Set([
  'alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit',
  'atomic_noexcept', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case', 'catch',
  'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept',
  'const', 'consteval', 'constexpr', 'constinit', 'const_cast', 'continue',
  'co_await', 'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do',
  'double', 'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern',
  'false', 'float', 'for', 'friend', 'goto', 'if', 'import', 'inline', 'int',
  'long', 'module', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq',
  'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public',
  'reflexpr', 'register', 'reinterpret_cast', 'requires', 'return', 'short',
  'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct',
  'switch', 'template', 'this', 'thread_local', 'throw', 'true', 'try',
  'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual',
  'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq',
]);

const CPP23_BUILTIN_TYPES = new Set([
  'void', 'bool', 'char', 'signed char', 'unsigned char', 'char8_t', 'char16_t', 'char32_t',
  'wchar_t', 'short', 'short int', 'signed short', 'unsigned short',
  'int', 'signed', 'unsigned', 'unsigned int', 'long', 'long int',
  'signed long', 'unsigned long', 'long long', 'unsigned long long',
  'float', 'double', 'long double',
  'size_t', 'ptrdiff_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t',
  'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'uintptr_t', 'intptr_t',
  'float16_t', 'float32_t', 'float64_t', 'float128_t', 'bfloat16_t',
  'auto',
]);

export class CppLexer {
  private source: string;
  private length: number;
  private index = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
    this.length = source.length;
  }

  private charAt(offset: number = 0): string {
    const target = this.index + offset;
    return target < this.length ? this.source[target] : '';
  }

  private advance(count: number = 1): string {
    let result = '';
    for (let i = 0; i < count && this.index < this.length; i++) {
      const ch = this.source[this.index];
      result += ch;
      this.index++;
      if (ch === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
    }
    return result;
  }

  private getPosition(): Position {
    return { line: this.line, column: this.column, offset: this.index };
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let safetyCounter = this.length * 4 + 100;

    while (this.index < this.length && safetyCounter-- > 0) {
      const prevIndex = this.index;
      const startPos = this.getPosition();
      const ch = this.charAt();

      // Whitespace
      if (/\s/.test(ch)) {
        this.advance();
        continue;
      }

      // Preprocessor directive
      if (ch === '#' && (startPos.column === 1 || this.isAtLineStartWhitespace())) {
        const value = this.readPreprocessor();
        tokens.push({
          type: 'preprocessor',
          value,
          range: { start: startPos, end: this.getPosition() },
        });
        if (this.index <= prevIndex) this.advance();
        continue;
      }

      // Single-line or Multi-line Comment
      if (ch === '/' && this.charAt(1) === '/') {
        let value = '';
        while (this.index < this.length && this.charAt() !== '\n') {
          value += this.advance();
        }
        tokens.push({
          type: 'comment',
          value,
          range: { start: startPos, end: this.getPosition() },
        });
        if (this.index <= prevIndex) this.advance();
        continue;
      }

      if (ch === '/' && this.charAt(1) === '*') {
        let value = this.advance(2);
        while (this.index < this.length && !(this.charAt() === '*' && this.charAt(1) === '/')) {
          value += this.advance();
        }
        if (this.index < this.length) {
          value += this.advance(2);
        }
        tokens.push({
          type: 'comment',
          value,
          range: { start: startPos, end: this.getPosition() },
        });
        if (this.index <= prevIndex) this.advance();
        continue;
      }

      // Raw String Literal R"(...)"
      if (
        ((ch === 'R' || ch === 'u' || ch === 'U' || ch === 'L') && this.charAt(1) === '"') ||
        (ch === 'u' && this.charAt(1) === '8' && this.charAt(2) === 'R' && this.charAt(3) === '"')
      ) {
        const rawMatch = this.source.slice(this.index).match(/^(?:u8R|uR|UR|LR|R)"([^(]*)\(([\s\S]*?)\)\1"/);
        if (rawMatch) {
          const literal = this.advance(rawMatch[0].length);
          tokens.push({
            type: 'string',
            value: literal,
            range: { start: startPos, end: this.getPosition() },
          });
          continue;
        }
      }

      // Standard String Literal
      if (
        ch === '"' ||
        ((ch === 'u' || ch === 'U' || ch === 'L') && this.charAt(1) === '"') ||
        (ch === 'u' && this.charAt(1) === '8' && this.charAt(2) === '"')
      ) {
        const value = this.readString();
        tokens.push({
          type: 'string',
          value,
          range: { start: startPos, end: this.getPosition() },
        });
        if (this.index <= prevIndex) this.advance();
        continue;
      }

      // Character Literal
      if (
        ch === '\'' ||
        ((ch === 'u' || ch === 'U' || ch === 'L') && this.charAt(1) === '\'') ||
        (ch === 'u' && this.charAt(1) === '8' && this.charAt(2) === '\'')
      ) {
        const value = this.readChar();
        tokens.push({
          type: 'character',
          value,
          range: { start: startPos, end: this.getPosition() },
        });
        if (this.index <= prevIndex) this.advance();
        continue;
      }

      // Numeric Literal
      if (/\d/.test(ch) || (ch === '.' && /\d/.test(this.charAt(1)))) {
        const value = this.readNumber();
        tokens.push({
          type: 'number',
          value,
          range: { start: startPos, end: this.getPosition() },
        });
        if (this.index <= prevIndex) this.advance();
        continue;
      }

      // Identifiers / Keywords / Types / Modules
      if (/[a-zA-Z_]/.test(ch)) {
        const value = this.readIdentifier();
        let type: TokenType = 'identifier';

        if (CPP23_KEYWORDS.has(value)) {
          type = value === 'import' || value === 'module' || value === 'export' ? 'module' : 'keyword';
        } else if (CPP23_BUILTIN_TYPES.has(value)) {
          type = 'type';
        }

        tokens.push({
          type,
          value,
          range: { start: startPos, end: this.getPosition() },
        });
        if (this.index <= prevIndex) this.advance();
        continue;
      }

      // Multi-char Operators & Punctuation
      const op = this.readOperator();
      if (op) {
        const isPunctuation = /^[{}()[\];,]$/.test(op);
        tokens.push({
          type: isPunctuation ? 'punctuation' : 'operator',
          value: op,
          range: { start: startPos, end: this.getPosition() },
        });
        continue;
      }

      // Fallback: single unknown char
      const unknownChar = this.advance();
      tokens.push({
        type: 'unknown',
        value: unknownChar,
        range: { start: startPos, end: this.getPosition() },
      });
    }

    return tokens;
  }

  private isAtLineStartWhitespace(): boolean {
    let i = this.index - 1;
    while (i >= 0) {
      if (this.source[i] === '\n') return true;
      if (!/\s/.test(this.source[i])) return false;
      i--;
    }
    return true;
  }

  private readPreprocessor(): string {
    let result = '';
    while (this.index < this.length) {
      const ch = this.charAt();
      if (ch === '\\' && this.charAt(1) === '\n') {
        result += this.advance(2);
        continue;
      }
      if (ch === '\n') break;
      result += this.advance();
    }
    return result;
  }

  private readString(): string {
    let result = '';
    if (this.charAt() === 'u' && this.charAt(1) === '8') result += this.advance(2);
    else if (this.charAt() === 'u' || this.charAt() === 'U' || this.charAt === 'L' as any) result += this.advance();

    if (this.charAt() === '"') result += this.advance();

    while (this.index < this.length) {
      const ch = this.charAt();
      if (ch === '\\' && this.index + 1 < this.length) {
        result += this.advance(2);
        continue;
      }
      if (ch === '"' || ch === '\n') {
        if (ch === '"') result += this.advance();
        break;
      }
      result += this.advance();
    }
    return result;
  }

  private readChar(): string {
    let result = '';
    if (this.charAt() === 'u' && this.charAt(1) === '8') result += this.advance(2);
    else if (this.charAt() === 'u' || this.charAt() === 'U' || this.charAt === 'L' as any) result += this.advance();

    if (this.charAt() === '\'') result += this.advance();

    while (this.index < this.length) {
      const ch = this.charAt();
      if (ch === '\\' && this.index + 1 < this.length) {
        result += this.advance(2);
        continue;
      }
      if (ch === '\'' || ch === '\n') {
        if (ch === '\'') result += this.advance();
        break;
      }
      result += this.advance();
    }
    return result;
  }

  private readNumber(): string {
    let result = '';
    // Hex or Binary prefix
    if (this.charAt() === '0' && (this.charAt(1) === 'x' || this.charAt(1) === 'X' || this.charAt(1) === 'b' || this.charAt(1) === 'B')) {
      result += this.advance(2);
      while (this.index < this.length) {
        const c = this.charAt();
        if (/[0-9a-fA-F']/.test(c)) {
          result += this.advance();
        } else {
          break;
        }
      }
    } else {
      while (this.index < this.length) {
        const c = this.charAt();
        if (/[0-9.']/.test(c)) {
          result += this.advance();
        } else if ((c === 'e' || c === 'E') && (this.charAt(1) === '+' || this.charAt(1) === '-' || /\d/.test(this.charAt(1)))) {
          result += this.advance();
          if (this.charAt() === '+' || this.charAt() === '-') result += this.advance();
        } else {
          break;
        }
      }
    }

    // C++23 Suffixes: uz, z, UZ, Z, f16, f32, f64, f128, bf16, u, l, ll, ull, f, etc.
    const suffixMatch = this.source.slice(this.index).match(/^(?:uz|zu|z|UZ|ZU|Z|bf16|f16|f32|f64|f128|BF16|F16|F32|F64|F128|ull|llu|ll|l|u|f|sv|s|ms|us|ns|min|h|d|y)\b/i);
    if (suffixMatch) {
      result += this.advance(suffixMatch[0].length);
    }

    return result;
  }

  private readIdentifier(): string {
    let result = '';
    while (this.index < this.length && /[a-zA-Z0-9_]/.test(this.charAt())) {
      result += this.advance();
    }
    return result;
  }

  private readOperator(): string {
    // 3-char operators
    const three = this.source.slice(this.index, this.index + 3);
    if (['<=>', '<<=', '>>=', '->*', '...'].includes(three)) {
      return this.advance(3);
    }

    // 2-char operators
    const two = this.source.slice(this.index, this.index + 2);
    if ([
      '::', '->', '++', '--', '==', '!=', '<=', '>=', '&&', '||',
      '<<', '>>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=',
      '##', '.*',
    ].includes(two)) {
      return this.advance(2);
    }

    // 1-char operators and punctuation
    const one = this.charAt();
    if ('+-*/%^&|~!=<>?:.,;()[]{}#'.includes(one)) {
      return this.advance(1);
    }

    return '';
  }
}

export const tokenizeCpp23 = (source: string): Token[] => {
  const lexer = new CppLexer(source);
  return lexer.tokenize();
};
