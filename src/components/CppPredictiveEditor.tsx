import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type KeyboardEvent,
  type ChangeEvent,
  type CSSProperties,
} from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import {
  CppLanguageService,
  type CompletionItem,
  type Diagnostic,
  type Position,
} from '../services/cppLanguageService';

interface CppPredictiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  style?: CSSProperties;
  minHeight?: number;
  maxHeight?: number;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  onDiagnosticsChange?: (diagnostics: Diagnostic[]) => void;
}

export const CppPredictiveEditor: React.FC<CppPredictiveEditorProps> = ({
  value,
  onChange,
  className = '',
  style,
  minHeight = 220,
  maxHeight = 520,
  placeholder = 'Write modern C++23 code...',
  readOnly = false,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  onDiagnosticsChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPos, setCursorPos] = useState<Position>({ line: 1, column: 1, offset: 0 });
  const [ghostText, setGhostText] = useState<string>('');
  const [completions, setCompletions] = useState<CompletionItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [showDiagnosticsPanel, setShowDiagnosticsPanel] = useState(false);
  const [isPredictorEnabled, setIsPredictorEnabled] = useState(true);

  // Compute AST & Diagnostics with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const analysis = CppLanguageService.analyzeDocument(value || '');
        setDiagnostics(analysis.diagnostics || []);
        if (onDiagnosticsChange) onDiagnosticsChange(analysis.diagnostics || []);
      } catch (err) {
        console.error('C++ Analysis error:', err);
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [value, onDiagnosticsChange]);

  // Update completions & ghost text on cursor move or code change
  const updateCompletions = useCallback(
    (code: string, offset: number) => {
      if (!isPredictorEnabled || readOnly || disabled) {
        setGhostText('');
        setCompletions([]);
        setIsMenuOpen(false);
        return;
      }

      try {
        const safeOffset = Math.min(Math.max(0, offset), code.length);
        const lines = code.slice(0, safeOffset).split('\n');
        const line = lines.length;
        const column = (lines[lines.length - 1] || '').length + 1;
        const pos: Position = { line, column, offset: safeOffset };
        setCursorPos(pos);

        const analysis = CppLanguageService.analyzeDocument(code);
        const res = CppLanguageService.getCompletions(analysis, code, pos);

        if (res.items.length > 0 && res.triggerPrefix.length > 0) {
          setCompletions(res.items);
          setGhostText(res.ghostText || '');
          setSelectedIndex(0);
          setIsMenuOpen(true);
        } else {
          setCompletions([]);
          setGhostText('');
          setIsMenuOpen(false);
        }
      } catch (err) {
        console.error('C++ Prediction update error:', err);
        setGhostText('');
        setCompletions([]);
        setIsMenuOpen(false);
      }
    },
    [isPredictorEnabled, readOnly, disabled]
  );

  // Syntax highlighting via Prism
  const highlightedCode = useMemo(() => {
    try {
      const grammar = Prism.languages.cpp || Prism.languages.clike || {};
      return Prism.highlight(value || '', grammar, 'cpp');
    } catch {
      return (value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [value]);

  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const offset = e.target.selectionStart;
    onChange(newValue);
    updateCompletions(newValue, offset);
  };

  const handleSelectOrClick = () => {
    if (textareaRef.current) {
      const offset = textareaRef.current.selectionStart;
      updateCompletions(value, offset);
    }
  };

  const applyCompletion = (item: CompletionItem) => {
    if (!textareaRef.current) return;
    const offset = textareaRef.current.selectionStart;
    const lines = value.slice(0, offset).split('\n');
    const currentLine = lines[lines.length - 1] || '';

    // Find prefix to replace
    const wordMatch = currentLine.match(/([a-zA-Z_]\w*)$/);
    const prefixLen = wordMatch ? wordMatch[1].length : 0;

    const rawInsert = item.insertText.replace(/\$\{\d+:([^}]+)\}/g, '$1').replace(/\$\{\d+\}/g, '');
    const before = value.slice(0, Math.max(0, offset - prefixLen));
    const after = value.slice(offset);
    const nextCode = `${before}${rawInsert}${after}`;

    onChange(nextCode);
    setGhostText('');
    setCompletions([]);
    setIsMenuOpen(false);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const nextPos = Math.min(before.length + rawInsert.length, nextCode.length);
        textareaRef.current.setSelectionRange(nextPos, nextPos);
        textareaRef.current.focus();
      }
    });
  };

  const applyQuickFix = (diagnostic: Diagnostic) => {
    if (!diagnostic.quickFix) return;
    const { replacement, range } = diagnostic.quickFix;
    const lines = value.split('\n');
    let startOffset = 0;
    for (let i = 0; i < range.start.line - 1; i++) {
      startOffset += (lines[i] || '').length + 1;
    }
    startOffset += range.start.column - 1;

    const safeOffset = Math.min(Math.max(0, startOffset), value.length);
    const nextCode = `${value.slice(0, safeOffset)}${replacement}${value.slice(safeOffset)}`;
    onChange(nextCode);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Accept Ghost Text / Selected Autocomplete on Tab or Enter (if menu open)
    if (e.key === 'Tab' && !e.shiftKey) {
      if (isMenuOpen && completions.length > 0) {
        e.preventDefault();
        applyCompletion(completions[selectedIndex] || completions[0]);
        return;
      }
      if (ghostText) {
        e.preventDefault();
        const topItem = completions[0];
        if (topItem) {
          applyCompletion(topItem);
        } else {
          // Direct ghost insert
          const offset = textareaRef.current?.selectionStart || 0;
          const nextCode = `${value.slice(0, offset)}${ghostText}${value.slice(offset)}`;
          onChange(nextCode);
          setGhostText('');
          setCompletions([]);
          setIsMenuOpen(false);
        }
        return;
      }
      // Normal Tab indentation (4 spaces)
      e.preventDefault();
      const offset = textareaRef.current?.selectionStart || 0;
      const nextCode = `${value.slice(0, offset)}    ${value.slice(offset)}`;
      onChange(nextCode);
      requestAnimationFrame(() => {
        textareaRef.current?.setSelectionRange(offset + 4, offset + 4);
      });
      return;
    }

    // 2. Navigation in Autocomplete Menu
    if (isMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % completions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + completions.length) % completions.length);
        return;
      }
      if (e.key === 'Enter' && completions.length > 0) {
        e.preventDefault();
        applyCompletion(completions[selectedIndex] || completions[0]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMenuOpen(false);
        setGhostText('');
        setCompletions([]);
        return;
      }
    }

    // 3. Trigger Autocomplete via Ctrl+Space
    if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const offset = textareaRef.current?.selectionStart || 0;
      const lines = value.slice(0, offset).split('\n');
      const line = lines.length;
      const column = (lines[lines.length - 1] || '').length + 1;
      const pos: Position = { line, column, offset };
      const analysis = CppLanguageService.analyzeDocument(value);
      const res = CppLanguageService.getCompletions(analysis, value, pos);
      if (res.items.length > 0) {
        setCompletions(res.items);
        setSelectedIndex(0);
        setIsMenuOpen(true);
      }
      return;
    }

    // 4. Bracket / Quote Auto-closing
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
    if (pairs[e.key]) {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === textarea.selectionEnd) {
        e.preventDefault();
        const offset = textarea.selectionStart;
        const closing = pairs[e.key];
        const nextCode = `${value.slice(0, offset)}${e.key}${closing}${value.slice(offset)}`;
        onChange(nextCode);
        requestAnimationFrame(() => {
          textarea.setSelectionRange(offset + 1, offset + 1);
        });
        return;
      }
    }

    // 5. Backspace auto-deleting pairs
    if (e.key === 'Backspace') {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === textarea.selectionEnd) {
        const offset = textarea.selectionStart;
        const prevChar = value[offset - 1];
        const nextChar = value[offset];
        if (pairs[prevChar] === nextChar) {
          e.preventDefault();
          const nextCode = `${value.slice(0, offset - 1)}${value.slice(offset + 1)}`;
          onChange(nextCode);
          requestAnimationFrame(() => {
            textarea.setSelectionRange(offset - 1, offset - 1);
          });
          return;
        }
      }
    }

    // 6. Enter key automatic indentation
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === textarea.selectionEnd) {
        const offset = textarea.selectionStart;
        const lineBefore = value.slice(0, offset).split('\n').pop() || '';
        const matchIndent = lineBefore.match(/^(\s*)/);
        let indent = matchIndent ? matchIndent[1] : '';
        if (lineBefore.trim().endsWith('{')) {
          indent += '    ';
        }
        e.preventDefault();
        const nextCode = `${value.slice(0, offset)}\n${indent}${value.slice(offset)}`;
        onChange(nextCode);
        requestAnimationFrame(() => {
          const nextPos = offset + 1 + indent.length;
          textarea.setSelectionRange(nextPos, nextPos);
        });
        return;
      }
    }
  };

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warnCount = diagnostics.filter(d => d.severity === 'warning').length;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col rounded-lg border border-white/[0.12] bg-[#090b0f] font-mono text-xs shadow-inner focus-within:border-[#5e6ad2] ${className}`}
      style={{ minHeight, ...style }}
    >
      {/* Top Header Bar: C++23 LSP & Diagnostics status */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0c0e14] px-3 py-1.5 text-[11px] select-none">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded bg-[#5e6ad2]/20 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#aeb6ff]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
            C++23 LSP
          </span>
          <span className="text-[10px] text-[#8a8f98]">
            Ln {cursorPos.line}, Col {cursorPos.column}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Diagnostics Badge */}
          <button
            type="button"
            onClick={() => setShowDiagnosticsPanel(prev => !prev)}
            className={`flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] transition-colors ${
              errorCount > 0
                ? 'bg-[#f43f5e]/15 text-[#fda4af] hover:bg-[#f43f5e]/25'
                : warnCount > 0
                ? 'bg-[#fbbf24]/15 text-[#fde68a] hover:bg-[#fbbf24]/25'
                : 'text-[#6ee7b7] hover:bg-white/[0.04]'
            }`}
            title="Toggle Diagnostics List"
          >
            {errorCount > 0 ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[#f43f5e]" />
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </>
            ) : warnCount > 0 ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
                {warnCount} {warnCount === 1 ? 'warning' : 'warnings'}
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                No errors
              </>
            )}
          </button>

          {/* Autocomplete Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsPredictorEnabled(prev => !prev);
              setGhostText('');
              setCompletions([]);
              setIsMenuOpen(false);
            }}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              isPredictorEnabled ? 'text-[#a7f3d0] hover:text-white' : 'text-[#62666f] hover:text-[#8a8f98]'
            }`}
            title="Toggle C++23 Autocomplete & Predictions"
          >
            {isPredictorEnabled ? '⚡ Predictions: ON' : 'Predictions: OFF'}
          </button>
        </div>
      </div>

      {/* Editor Body with Syntax Highlighting, Transparent Input & Ghost Text */}
      <div className="relative flex-1 overflow-y-auto" style={{ maxHeight }}>
        {/* Layer 1: Syntax Highlighted Code */}
        <pre
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-white"
          dangerouslySetInnerHTML={{ __html: highlightedCode + '<br />' }}
        />

        {/* Layer 2: Real Textarea for User Input */}
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelectOrClick}
          onClick={handleSelectOrClick}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          data-gramm={false}
          aria-label={ariaLabel || 'C++23 Source Code Editor'}
          className="relative z-10 block h-full min-h-[192px] w-full resize-none bg-transparent p-3 font-mono text-xs leading-relaxed text-transparent caret-white outline-none selection:bg-[#5e6ad2]/35"
        />

        {/* Layer 3: Inline Ghost Text Banner Indicator */}
        {ghostText && isPredictorEnabled && (
          <div className="absolute bottom-2 right-3 z-20 flex items-center gap-1.5 rounded-md border border-[#10b981]/30 bg-[#090b0f]/90 px-2 py-1 text-[11px] text-[#6ee7b7] shadow-lg backdrop-blur-sm animate-fadeIn pointer-events-none">
            <span className="font-semibold text-white">Prediction:</span>
            <span className="font-mono text-[#a7f3d0]">{ghostText}</span>
            <span className="rounded bg-white/[0.1] px-1 py-0.2 text-[9px] text-[#8a8f98]">Tab ⇥</span>
          </div>
        )}

        {/* Layer 4: Autocomplete Floating Menu */}
        {isMenuOpen && completions.length > 0 && (
          <div className="absolute left-6 top-12 z-30 max-h-60 w-80 overflow-y-auto rounded-lg border border-white/[0.15] bg-[#0c0d12] p-1.5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-2 py-1 text-[10px] text-[#8a8f98]">
              <span className="font-semibold text-[#aeb6ff]">C++23 IntelliSense</span>
              <span>↑↓ Navigate • Tab / ↵ Select</span>
            </div>
            <div className="mt-1 space-y-0.5">
              {completions.map((item, idx) => (
                <button
                  key={`${item.label}-${idx}`}
                  type="button"
                  onClick={() => applyCompletion(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors ${
                    idx === selectedIndex ? 'bg-[#5e6ad2]/20 text-white' : 'text-[#b7bbc3] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="font-mono font-medium text-white">{item.label}</span>
                    {item.detail && (
                      <span className="truncate text-[10px] text-[#8a8f98]">{item.detail}</span>
                    )}
                  </div>
                  {item.cpp23 && (
                    <span className="shrink-0 rounded bg-[#10b981]/15 px-1 py-0.2 text-[9px] font-bold text-[#10b981]">
                      C++23
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Diagnostics Drawer Panel (when toggled or errors exist) */}
      {showDiagnosticsPanel && diagnostics.length > 0 && (
        <div className="border-t border-white/[0.08] bg-[#0c0e14] p-3 text-xs animate-fadeIn">
          <div className="flex items-center justify-between pb-1.5">
            <span className="font-semibold text-white">Diagnostics & C++23 Guidance</span>
            <button
              type="button"
              onClick={() => setShowDiagnosticsPanel(false)}
              className="text-[#8a8f98] hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 space-y-2 max-h-36 overflow-y-auto">
            {diagnostics.map((diag, index) => (
              <div
                key={index}
                className={`flex items-start justify-between rounded-md border p-2 text-xs ${
                  diag.severity === 'error'
                    ? 'border-[#f43f5e]/30 bg-[#f43f5e]/10 text-[#fda4af]'
                    : 'border-[#fbbf24]/30 bg-[#fbbf24]/10 text-[#fde68a]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] opacity-75">
                      Ln {diag.range.start.line}, Col {diag.range.start.column}
                    </span>
                    <span className="font-semibold">{diag.message}</span>
                  </div>
                </div>
                {diag.quickFix && (
                  <button
                    type="button"
                    onClick={() => applyQuickFix(diag)}
                    className="ml-3 rounded bg-white/[0.12] px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/[0.2]"
                  >
                    Quick Fix: {diag.quickFix.title}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
