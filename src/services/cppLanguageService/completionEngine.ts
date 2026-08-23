import type {
  CompletionItem,
  CompletionResult,
  CppAnalysisResult,
  Position,
  Scope,
  SymbolDefinition,
} from './types';

// Comprehensive C++23 Standard Library & Keyword database
const CPP23_COMPLETIONS: CompletionItem[] = [
  // C++23 Modules
  {
    label: 'import std;',
    kind: 'module',
    detail: 'C++23 Standard Library Module',
    documentation: 'Imports the entire standard library in C++23 with instant compilation speed.',
    insertText: 'import std;\n',
    cpp23: true,
  },
  {
    label: 'import std.compat;',
    kind: 'module',
    detail: 'C++23 C-Compatibility Module',
    documentation: 'Imports both C++23 std and classic global C headers (e.g. printf, memcpy).',
    insertText: 'import std.compat;\n',
    cpp23: true,
  },

  // C++23 std::print & std::println
  {
    label: 'std::println',
    kind: 'function',
    detail: 'void std::println(format_string, args...)',
    documentation: 'C++23 formatted output with automatic newline to stdout (#include <print>).',
    insertText: 'std::println("{}", ${1:value});',
    cpp23: true,
  },
  {
    label: 'std::print',
    kind: 'function',
    detail: 'void std::print(format_string, args...)',
    documentation: 'C++23 formatted output to stdout without trailing newline (#include <print>).',
    insertText: 'std::print("{}", ${1:value});',
    cpp23: true,
  },

  // C++23 std::expected & std::unexpected
  {
    label: 'std::expected',
    kind: 'type',
    detail: 'template <class T, class E> class std::expected',
    documentation: 'C++23 vocabulary type for operations that return either a valid value T or an error E (#include <expected>).',
    insertText: 'std::expected<${1:T}, ${2:std::string}>',
    cpp23: true,
  },
  {
    label: 'std::unexpected',
    kind: 'function',
    detail: 'auto std::unexpected(E error)',
    documentation: 'C++23 helper to construct an unexpected error for std::expected (#include <expected>).',
    insertText: 'std::unexpected(${1:error})',
    cpp23: true,
  },

  // C++23 std::generator & Coroutines
  {
    label: 'std::generator',
    kind: 'type',
    detail: 'template <class Ref, class V> class std::generator',
    documentation: 'C++23 synchronous coroutine generator supporting range-for iteration (#include <generator>).',
    insertText: 'std::generator<${1:int}>',
    cpp23: true,
  },
  {
    label: 'co_yield',
    kind: 'keyword',
    detail: 'co_yield value',
    documentation: 'C++20/C++23 coroutine statement to yield a value to std::generator.',
    insertText: 'co_yield ${1:value};',
    cpp23: true,
  },
  {
    label: 'co_return',
    kind: 'keyword',
    detail: 'co_return [value]',
    documentation: 'C++20/C++23 coroutine statement to finalize coroutine execution.',
    insertText: 'co_return;',
    cpp23: true,
  },

  // C++23 std::mdspan
  {
    label: 'std::mdspan',
    kind: 'type',
    detail: 'template <class T, class Extents> class std::mdspan',
    documentation: 'C++23 multi-dimensional array view with arbitrary layout mapping (#include <mdspan>).',
    insertText: 'std::mdspan(${1:ptr}, ${2:rows}, ${3:cols})',
    cpp23: true,
  },

  // C++23 std::views (Modern Range Adaptors)
  {
    label: 'std::views::iota',
    kind: 'function',
    detail: 'auto std::views::iota(start, [bound])',
    documentation: 'C++20/23 generates an arithmetic sequence of values lazily.',
    insertText: 'std::views::iota(${1:0}, ${2:n})',
    cpp23: true,
  },
  {
    label: 'std::views::transform',
    kind: 'function',
    detail: 'std::views::transform([](auto&& x) { ... })',
    documentation: 'C++20/23 lazy element transformation adaptor.',
    insertText: 'std::views::transform([](const auto& ${1:item}) { return ${2:item}; })',
    cpp23: true,
  },
  {
    label: 'std::views::filter',
    kind: 'function',
    detail: 'std::views::filter([](auto&& x) { ... })',
    documentation: 'C++20/23 lazy filtering range adaptor.',
    insertText: 'std::views::filter([](const auto& ${1:item}) { return ${2:true}; })',
    cpp23: true,
  },
  {
    label: 'std::views::chunk',
    kind: 'function',
    detail: 'std::views::chunk(size_t n)',
    documentation: 'C++23 splits a range into consecutive chunks of size n (#include <ranges>).',
    insertText: 'std::views::chunk(${1:2})',
    cpp23: true,
  },
  {
    label: 'std::views::slide',
    kind: 'function',
    detail: 'std::views::slide(size_t n)',
    documentation: 'C++23 generates sliding windows of width n (#include <ranges>).',
    insertText: 'std::views::slide(${1:3})',
    cpp23: true,
  },
  {
    label: 'std::views::join_with',
    kind: 'function',
    detail: 'std::views::join_with(delimiter)',
    documentation: 'C++23 joins nested ranges with a delimiter sequence or value (#include <ranges>).',
    insertText: 'std::views::join_with(${1:", "})',
    cpp23: true,
  },
  {
    label: 'std::views::enumerate',
    kind: 'function',
    detail: 'std::views::enumerate',
    documentation: 'C++23 yields pairs of (index, value) for elements in a range (#include <ranges>).',
    insertText: 'std::views::enumerate',
    cpp23: true,
  },
  {
    label: 'std::views::zip',
    kind: 'function',
    detail: 'std::views::zip(r1, r2, ...)',
    documentation: 'C++23 creates a view of tuples containing elements from multiple ranges (#include <ranges>).',
    insertText: 'std::views::zip(${1:range1}, ${2:range2})',
    cpp23: true,
  },
  {
    label: 'std::views::cartesian_product',
    kind: 'function',
    detail: 'std::views::cartesian_product(r1, r2, ...)',
    documentation: 'C++23 creates n-ary cartesian product view over input ranges (#include <ranges>).',
    insertText: 'std::views::cartesian_product(${1:range1}, ${2:range2})',
    cpp23: true,
  },

  // C++23 std::ranges utilities
  {
    label: 'std::ranges::to',
    kind: 'function',
    detail: 'std::ranges::to<Container>()',
    documentation: 'C++23 converts any range or range pipeline directly into a container (#include <ranges>).',
    insertText: 'std::ranges::to<std::vector>()',
    cpp23: true,
  },
  {
    label: 'std::ranges::fold_left',
    kind: 'function',
    detail: 'std::ranges::fold_left(range, init, op)',
    documentation: 'C++23 left-associative fold algorithm on ranges (#include <algorithm>).',
    insertText: 'std::ranges::fold_left(${1:range}, ${2:0}, std::plus<>{})',
    cpp23: true,
  },
  {
    label: 'std::ranges::contains',
    kind: 'function',
    detail: 'bool std::ranges::contains(range, value)',
    documentation: 'C++23 checks if value is present in range (#include <algorithm>).',
    insertText: 'std::ranges::contains(${1:range}, ${2:value})',
    cpp23: true,
  },
  {
    label: 'std::ranges::sort',
    kind: 'function',
    detail: 'void std::ranges::sort(range, [comp], [proj])',
    documentation: 'C++20/23 sorts elements in range with optional projection.',
    insertText: 'std::ranges::sort(${1:vec});',
    cpp23: true,
  },

  // C++23 Flat Containers
  {
    label: 'std::flat_map',
    kind: 'type',
    detail: 'template <class Key, class T> class std::flat_map',
    documentation: 'C++23 cache-friendly flat sorted associative container (#include <flat_map>).',
    insertText: 'std::flat_map<${1:std::string}, ${2:int}>',
    cpp23: true,
  },
  {
    label: 'std::flat_set',
    kind: 'type',
    detail: 'template <class Key> class std::flat_set',
    documentation: 'C++23 cache-friendly flat sorted set (#include <flat_set>).',
    insertText: 'std::flat_set<${1:int}>',
    cpp23: true,
  },

  // C++23 Utilities & Keywords
  {
    label: 'std::unreachable',
    kind: 'function',
    detail: '[[noreturn]] void std::unreachable()',
    documentation: 'C++23 hints to the compiler that code path is unreachable for optimization (#include <utility>).',
    insertText: 'std::unreachable();',
    cpp23: true,
  },
  {
    label: 'std::byteswap',
    kind: 'function',
    detail: 'constexpr T std::byteswap(T n)',
    documentation: 'C++23 reverses byte order of integer values (#include <bit>).',
    insertText: 'std::byteswap(${1:value})',
    cpp23: true,
  },
  {
    label: 'std::to_underlying',
    kind: 'function',
    detail: 'constexpr auto std::to_underlying(Enum e)',
    documentation: 'C++23 casts enum to its underlying integer type (#include <utility>).',
    insertText: 'std::to_underlying(${1:enum_val})',
    cpp23: true,
  },
  {
    label: 'this auto&& self',
    kind: 'keyword',
    detail: 'Explicit object parameter (Deducing this)',
    documentation: 'C++23 explicit object parameter for recursive lambdas and crtp-free member methods.',
    insertText: 'this auto&& self',
    cpp23: true,
  },
  {
    label: 'operator[]',
    kind: 'keyword',
    detail: 'Multidimensional subscript operator',
    documentation: 'C++23 allows operator[] with multiple arguments: matrix[i, j, k].',
    insertText: 'operator[](size_t ${1:row}, size_t ${2:col}) {\n    return ${3};\n}',
    cpp23: true,
  },
  {
    label: 'constexpr',
    kind: 'keyword',
    detail: 'Compile-time constant expression',
    documentation: 'C++23 permits std::vector, std::string, and dynamic allocation in constexpr functions.',
    insertText: 'constexpr ',
  },
  {
    label: 'consteval',
    kind: 'keyword',
    detail: 'Immediate function evaluation',
    documentation: 'Functions marked consteval MUST be evaluated at compile-time.',
    insertText: 'consteval ',
  },
  {
    label: 'constinit',
    kind: 'keyword',
    detail: 'Compile-time static initialization',
    documentation: 'Ensures variable with static/thread storage is initialized at compile-time.',
    insertText: 'constinit ',
  },

  // Fast Competitive / Systems Snippets
  {
    label: 'c++23-fastio',
    kind: 'snippet',
    detail: 'C++23 Fast I/O Setup',
    documentation: 'Speeds up cin/cout synchronization for high performance.',
    insertText: 'std::ios::sync_with_stdio(false);\nstd::cin.tie(nullptr);\n',
    cpp23: true,
  },
  {
    label: 'c++23-main',
    kind: 'snippet',
    detail: 'C++23 modern main() skeleton',
    documentation: 'Modern C++23 entrypoint with print support.',
    insertText: '#include <print>\n\nint main() {\n    std::println("Hello, C++23!");\n    return 0;\n}\n',
    cpp23: true,
  },
  {
    label: 'c++23-for-range',
    kind: 'snippet',
    detail: 'Range-based for loop with deducing structured binding',
    documentation: 'Iterates over containers/views with structured binding.',
    insertText: 'for (const auto& [${1:k}, ${2:v}] : ${3:container}) {\n    ${4}\n}',
    cpp23: true,
  },
];

// Member definitions for standard C++ types
const TYPE_MEMBERS: Record<string, CompletionItem[]> = {
  vector: [
    { label: 'push_back', kind: 'method', detail: 'void push_back(const T& val)', insertText: 'push_back(${1:val})' },
    { label: 'emplace_back', kind: 'method', detail: 'T& emplace_back(Args&&... args)', insertText: 'emplace_back(${1:args...})' },
    { label: 'pop_back', kind: 'method', detail: 'void pop_back()', insertText: 'pop_back()' },
    { label: 'size', kind: 'method', detail: 'size_t size() const noexcept', insertText: 'size()' },
    { label: 'empty', kind: 'method', detail: 'bool empty() const noexcept', insertText: 'empty()' },
    { label: 'clear', kind: 'method', detail: 'void clear() noexcept', insertText: 'clear()' },
    { label: 'begin', kind: 'method', detail: 'iterator begin() noexcept', insertText: 'begin()' },
    { label: 'end', kind: 'method', detail: 'iterator end() noexcept', insertText: 'end()' },
    { label: 'front', kind: 'method', detail: 'T& front()', insertText: 'front()' },
    { label: 'back', kind: 'method', detail: 'T& back()', insertText: 'back()' },
    { label: 'data', kind: 'method', detail: 'T* data() noexcept', insertText: 'data()' },
    { label: 'resize', kind: 'method', detail: 'void resize(size_t count)', insertText: 'resize(${1:count})' },
    { label: 'reserve', kind: 'method', detail: 'void reserve(size_t new_cap)', insertText: 'reserve(${1:cap})' },
  ],
  expected: [
    { label: 'has_value', kind: 'method', detail: 'constexpr bool has_value() const noexcept', insertText: 'has_value()', cpp23: true },
    { label: 'value', kind: 'method', detail: 'constexpr T& value()', insertText: 'value()', cpp23: true },
    { label: 'error', kind: 'method', detail: 'constexpr E& error()', insertText: 'error()', cpp23: true },
    { label: 'value_or', kind: 'method', detail: 'constexpr T value_or(U&& default_value) const', insertText: 'value_or(${1:fallback})', cpp23: true },
    { label: 'and_then', kind: 'method', detail: 'constexpr auto and_then(F&& f)', insertText: 'and_then([](auto&& ${1:val}) { return ${2}; })', cpp23: true },
    { label: 'or_else', kind: 'method', detail: 'constexpr auto or_else(F&& f)', insertText: 'or_else([](auto&& ${1:err}) { return ${2}; })', cpp23: true },
    { label: 'transform', kind: 'method', detail: 'constexpr auto transform(F&& f)', insertText: 'transform([](auto&& ${1:val}) { return ${2}; })', cpp23: true },
    { label: 'transform_error', kind: 'method', detail: 'constexpr auto transform_error(F&& f)', insertText: 'transform_error([](auto&& ${1:err}) { return ${2}; })', cpp23: true },
  ],
  optional: [
    { label: 'has_value', kind: 'method', detail: 'constexpr bool has_value() const noexcept', insertText: 'has_value()' },
    { label: 'value', kind: 'method', detail: 'constexpr T& value()', insertText: 'value()' },
    { label: 'value_or', kind: 'method', detail: 'constexpr T value_or(U&& default_val) const', insertText: 'value_or(${1:default_val})' },
    { label: 'and_then', kind: 'method', detail: 'constexpr auto and_then(F&& f)', insertText: 'and_then([](auto&& ${1:val}) { return ${2}; })', cpp23: true },
    { label: 'or_else', kind: 'method', detail: 'constexpr auto or_else(F&& f)', insertText: 'or_else([]() { return ${1}; })', cpp23: true },
    { label: 'transform', kind: 'method', detail: 'constexpr auto transform(F&& f)', insertText: 'transform([](auto&& ${1:val}) { return ${2}; })', cpp23: true },
    { label: 'reset', kind: 'method', detail: 'void reset() noexcept', insertText: 'reset()' },
  ],
  string: [
    { label: 'size', kind: 'method', detail: 'size_t size() const noexcept', insertText: 'size()' },
    { label: 'length', kind: 'method', detail: 'size_t length() const noexcept', insertText: 'length()' },
    { label: 'empty', kind: 'method', detail: 'bool empty() const noexcept', insertText: 'empty()' },
    { label: 'c_str', kind: 'method', detail: 'const char* c_str() const noexcept', insertText: 'c_str()' },
    { label: 'starts_with', kind: 'method', detail: 'bool starts_with(string_view sv) const', insertText: 'starts_with(${1:prefix})' },
    { label: 'ends_with', kind: 'method', detail: 'bool ends_with(string_view sv) const', insertText: 'ends_with(${1:suffix})' },
    { label: 'contains', kind: 'method', detail: 'bool contains(string_view sv) const (C++23)', insertText: 'contains(${1:substr})', cpp23: true },
    { label: 'substr', kind: 'method', detail: 'string substr(size_t pos = 0, size_t count = npos) const', insertText: 'substr(${1:pos}, ${2:count})' },
    { label: 'find', kind: 'method', detail: 'size_t find(string_view sv, size_t pos = 0) const', insertText: 'find(${1:target})' },
  ],
  mdspan: [
    { label: 'rank', kind: 'method', detail: 'static constexpr size_t rank() noexcept', insertText: 'rank()', cpp23: true },
    { label: 'extent', kind: 'method', detail: 'constexpr size_t extent(size_t r) const noexcept', insertText: 'extent(${1:0})', cpp23: true },
    { label: 'size', kind: 'method', detail: 'constexpr size_t size() const noexcept', insertText: 'size()', cpp23: true },
    { label: 'data_handle', kind: 'method', detail: 'constexpr pointer data_handle() const noexcept', insertText: 'data_handle()', cpp23: true },
  ],
};

export class CppCompletionEngine {
  private analysis: CppAnalysisResult;
  private source: string;

  constructor(analysis: CppAnalysisResult, source: string) {
    this.analysis = analysis;
    this.source = source;
  }

  public getCompletionsAt(position: Position): CompletionResult {
    const lines = this.source.split('\n');
    const currentLine = lines[position.line - 1] || '';
    const prefixLine = currentLine.slice(0, position.column - 1);

    // Member access trigger: obj. or ptr->
    const memberDotMatch = prefixLine.match(/([a-zA-Z_]\w*)\s*\.$/);
    const memberArrowMatch = prefixLine.match(/([a-zA-Z_]\w*)\s*->$/);
    if (memberDotMatch || memberArrowMatch) {
      const objName = (memberDotMatch || memberArrowMatch)![1];
      return this.getMemberCompletions(objName, position, '');
    }

    // Member access with partial prefix: obj.sub or ptr->sub
    const memberPartialMatch = prefixLine.match(/([a-zA-Z_]\w*)\s*(?:\.|->)([a-zA-Z_]\w*)$/);
    if (memberPartialMatch) {
      const objName = memberPartialMatch[1];
      const memberPrefix = memberPartialMatch[2];
      return this.getMemberCompletions(objName, position, memberPrefix);
    }

    // Scope resolution trigger: std::views:: or std:: or Type::
    const scopeMatch = prefixLine.match(/((?:[a-zA-Z_]\w*::)+)([a-zA-Z_]\w*)?$/);
    if (scopeMatch) {
      const qualifiedPrefix = scopeMatch[1];
      const partial = scopeMatch[2] || '';
      return this.getScopeResolutionCompletions(qualifiedPrefix, partial, position);
    }

    // Word prefix before cursor
    const wordMatch = prefixLine.match(/([a-zA-Z_]\w*)$/);
    const typedWord = wordMatch ? wordMatch[1] : '';

    const items: CompletionItem[] = [];

    // 1. Local and Scope Symbols (highest rank)
    const scopeSymbols = this.collectSymbolsInScopeAt(position);
    for (const sym of scopeSymbols) {
      if (!typedWord || sym.name.toLowerCase().startsWith(typedWord.toLowerCase())) {
        items.push({
          label: sym.name,
          kind: sym.kind === 'parameter' ? 'variable' : sym.kind === 'function' ? 'function' : 'variable',
          detail: sym.type ? `${sym.type} ${sym.name}` : sym.name,
          documentation: `Defined in scope (${sym.kind})`,
          insertText: sym.name,
          score: 100 + (sym.kind === 'parameter' ? 10 : 20),
        });
      }
    }

    // 2. C++23 Knowledge Base
    for (const item of CPP23_COMPLETIONS) {
      if (!typedWord || item.label.toLowerCase().includes(typedWord.toLowerCase()) || (item.filterText && item.filterText.toLowerCase().includes(typedWord.toLowerCase()))) {
        const startsWith = item.label.toLowerCase().startsWith(typedWord.toLowerCase());
        items.push({
          ...item,
          score: startsWith ? (item.cpp23 ? 90 : 80) : 50,
        });
      }
    }

    // Sort by score descending
    items.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Calculate Ghost Text
    let ghostText: string | undefined;
    if (typedWord && items.length > 0) {
      const topMatch = items[0];
      const cleanInsert = topMatch.insertText.replace(/\$\{\d+:([^}]+)\}/g, '$1').replace(/\$\{\d+\}/g, '');
      if (cleanInsert.toLowerCase().startsWith(typedWord.toLowerCase())) {
        ghostText = cleanInsert.slice(typedWord.length);
      }
    }

    return {
      items: items.slice(0, 30),
      ghostText,
      triggerPrefix: typedWord,
      position,
    };
  }

  private getMemberCompletions(objName: string, position: Position, memberPrefix: string): CompletionResult {
    const symbol = this.findSymbol(objName, position);
    const type = symbol?.type?.toLowerCase() || '';

    let matchedMembers: CompletionItem[] = [];

    if (type.includes('vector')) matchedMembers = TYPE_MEMBERS.vector;
    else if (type.includes('expected')) matchedMembers = TYPE_MEMBERS.expected;
    else if (type.includes('optional')) matchedMembers = TYPE_MEMBERS.optional;
    else if (type.includes('string')) matchedMembers = TYPE_MEMBERS.string;
    else if (type.includes('mdspan')) matchedMembers = TYPE_MEMBERS.mdspan;
    else {
      // Fallback: Combine common container methods
      matchedMembers = [
        ...TYPE_MEMBERS.vector,
        ...TYPE_MEMBERS.expected,
        ...TYPE_MEMBERS.string,
      ];
    }

    // Filter by member prefix
    const items = matchedMembers.filter(m =>
      !memberPrefix || m.label.toLowerCase().startsWith(memberPrefix.toLowerCase())
    );

    let ghostText: string | undefined;
    if (memberPrefix && items.length > 0) {
      const clean = items[0].insertText.replace(/\$\{\d+:([^}]+)\}/g, '$1').replace(/\$\{\d+\}/g, '');
      if (clean.toLowerCase().startsWith(memberPrefix.toLowerCase())) {
        ghostText = clean.slice(memberPrefix.length);
      }
    }

    return {
      items,
      ghostText,
      triggerPrefix: memberPrefix,
      position,
    };
  }

  private getScopeResolutionCompletions(qualifiedPrefix: string, partial: string, position: Position): CompletionResult {
    const prefix = qualifiedPrefix.toLowerCase();
    const items: CompletionItem[] = [];

    if (prefix.includes('std::views::')) {
      for (const item of CPP23_COMPLETIONS) {
        if (item.label.startsWith('std::views::')) {
          const shortLabel = item.label.replace('std::views::', '');
          if (!partial || shortLabel.toLowerCase().startsWith(partial.toLowerCase())) {
            items.push({
              ...item,
              label: shortLabel,
              insertText: item.insertText.replace('std::views::', ''),
              score: 95,
            });
          }
        }
      }
    } else if (prefix.includes('std::ranges::')) {
      for (const item of CPP23_COMPLETIONS) {
        if (item.label.startsWith('std::ranges::')) {
          const shortLabel = item.label.replace('std::ranges::', '');
          if (!partial || shortLabel.toLowerCase().startsWith(partial.toLowerCase())) {
            items.push({
              ...item,
              label: shortLabel,
              insertText: item.insertText.replace('std::ranges::', ''),
              score: 95,
            });
          }
        }
      }
    } else if (prefix.includes('std::')) {
      for (const item of CPP23_COMPLETIONS) {
        if (item.label.startsWith('std::')) {
          const shortLabel = item.label.replace('std::', '');
          if (!partial || shortLabel.toLowerCase().startsWith(partial.toLowerCase())) {
            items.push({
              ...item,
              label: shortLabel,
              insertText: item.insertText.replace('std::', ''),
              score: 90,
            });
          }
        }
      }
    }

    let ghostText: string | undefined;
    if (partial && items.length > 0) {
      const clean = items[0].insertText.replace(/\$\{\d+:([^}]+)\}/g, '$1').replace(/\$\{\d+\}/g, '');
      if (clean.toLowerCase().startsWith(partial.toLowerCase())) {
        ghostText = clean.slice(partial.length);
      }
    }

    return {
      items,
      ghostText,
      triggerPrefix: partial,
      position,
    };
  }

  private collectSymbolsInScopeAt(position: Position): SymbolDefinition[] {
    const symbols: SymbolDefinition[] = [];
    const findInScope = (scope: Scope) => {
      if (
        position.line >= scope.range.start.line &&
        position.line <= scope.range.end.line
      ) {
        for (const sym of scope.symbols.values()) {
          symbols.push(sym);
        }
        for (const child of scope.children) {
          findInScope(child);
        }
      }
    };

    findInScope(this.analysis.rootScope);
    return symbols;
  }

  private findSymbol(name: string, position: Position): SymbolDefinition | undefined {
    const inScope = this.collectSymbolsInScopeAt(position);
    return inScope.find(s => s.name === name) || this.analysis.symbols.find(s => s.name === name);
  }
}

export const getCppCompletions = (
  analysis: CppAnalysisResult,
  source: string,
  position: Position
): CompletionResult => {
  const engine = new CppCompletionEngine(analysis, source);
  return engine.getCompletionsAt(position);
};
