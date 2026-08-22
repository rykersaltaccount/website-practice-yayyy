import { useContext, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, ReactNode } from 'react';
import AppContext from '../contexts/AppContext';

type WorkspaceFile = {
  name: string;
  content: string;
};

type FileHandle = {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{ write: (content: string) => Promise<void>; close: () => Promise<void> }>;
};

type DirectoryHandle = {
  kind: 'directory';
  name: string;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandle>;
  values: () => AsyncIterableIterator<FileHandle>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryHandle>;
};

const javascriptTokenPattern = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b(?:const|let|var|function|return|if|else|for|while|class|new|throw|try|catch|typeof|import|from|export|default|async|await)\b|\b(?:true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|\b(?:console|Math|Array|Object|Map|Set|String|Number|JSON|Promise)\b|\b[a-zA-Z_$][\w$]*(?=\s*\()|===|!==|=>|==|!=|<=|>=|&&|\|\||[+*/%=<>!-])/g;

const highlightJavaScript = (code: string) => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(javascriptTokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(code.slice(lastIndex, index));

    let color = '#abb2bf';
    if (token.startsWith('//') || token.startsWith('/*')) color = '#5c6370';
    else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) color = '#98c379';
    else if (/^\d/.test(token)) color = '#d19a66';
    else if (/^(true|false|null|undefined)$/.test(token)) color = '#d19a66';
    else if (/^(const|let|var|function|return|if|else|for|while|class|new|throw|try|catch|typeof|import|from|export|default|async|await)$/.test(token)) color = '#c678dd';
    else if (/^(console|Math|Array|Object|Map|Set|String|Number|JSON|Promise)$/.test(token)) color = '#e5c07b';
    else if (/^[a-zA-Z_$][\w$]*(?=\s*\()/.test(token)) color = '#61afef';
    else color = '#56b6c2';

    nodes.push(<span key={`${index}-${token}`} style={{ color }}>{token}</span>);
    lastIndex = index + token.length;
  }

  if (lastIndex < code.length) nodes.push(code.slice(lastIndex));
  return nodes;
};

const CodeEditorPage = () => {
  const context = useContext(AppContext)!;
  const directoryHandle = useRef<DirectoryHandle | null>(null);
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFile, setActiveFile] = useState('main.cpp');
  const [status, setStatus] = useState('In-browser draft. Connect your workspace to sync with VS Code.');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [syncVersion, setSyncVersion] = useState(0);
  const [practicePrompt, setPracticePrompt] = useState('');
  const [practiceHistory, setPracticeHistory] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load saved files from localStorage on initial render
  useEffect(() => {
    const savedFiles = localStorage.getItem('codevault-workspace-files');
    const savedActiveFile = localStorage.getItem('codevault-active-file');

    if (savedFiles) {
      try {
        const parsedFiles = JSON.parse(savedFiles);
        setFiles(parsedFiles);

        // Set active file if it exists in the saved files, otherwise default to first file or main.cpp
        if (savedActiveFile && parsedFiles.some((file: { name: string }) => file.name === savedActiveFile)) {
          setActiveFile(savedActiveFile);
        } else if (parsedFiles.length > 0) {
          setActiveFile(parsedFiles[0].name);
        } else {
          // Create default empty files if none exist
          setFiles([
            { name: 'main.cpp', content: '' },
            { name: 'tests.cpp', content: '' }
          ]);
          setActiveFile('main.cpp');
        }
      } catch (error) {
        console.error('Failed to parse saved workspace files:', error);
        // Fallback to default files
        setFiles([
          { name: 'main.cpp', content: '' },
          { name: 'tests.cpp', content: '' }
        ]);
        setActiveFile('main.cpp');
      }
    } else {
      // No saved files, create default empty ones
      setFiles([
        { name: 'main.cpp', content: '' },
        { name: 'tests.cpp', content: '' }
      ]);
      setActiveFile('main.cpp');
    }
  }, []);

  // Save files to localStorage whenever they change
  useEffect(() => {
    if (files.length > 0) {
      try {
        localStorage.setItem('codevault-workspace-files', JSON.stringify(files));
        localStorage.setItem('codevault-active-file', activeFile);
      } catch (error) {
        console.error('Failed to save workspace files:', error);
      }
    }
  }, [files, activeFile]);

  const activeContent = files.find(file => file.name === activeFile)?.content || '';

  const updateActiveContent = (content: string) => {
    setFiles(current => current.map(file => file.name === activeFile ? { ...file, content } : file));
  };

  const handleEditorChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const cursorPosition = textarea.selectionStart;
    const previousContent = activeContent;

    if (previousContent.length === textarea.value.length + 1) {
      const deletedOpening = previousContent[cursorPosition - 1];
      const expectedClosing = ({ '(': ')', '[': ']', '{': '}' } as Record<string, string>)[deletedOpening];

      if (expectedClosing && previousContent[cursorPosition] === expectedClosing && textarea.value[cursorPosition] === expectedClosing) {
        const nextValue = `${textarea.value.slice(0, cursorPosition - 1)}${textarea.value.slice(cursorPosition + 1)}`;
        updateActiveContent(nextValue);
        requestAnimationFrame(() => textarea.setSelectionRange(cursorPosition - 1, cursorPosition - 1));
        return;
      }
    }

    const insertedCharacter = textarea.value[cursorPosition - 1];
    const closingCharacters: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
    const closingCharacter = closingCharacters[insertedCharacter];

    if (closingCharacter && textarea.value[cursorPosition] !== closingCharacter) {
      const nextValue = `${textarea.value.slice(0, cursorPosition)}${closingCharacter}${textarea.value.slice(cursorPosition)}`;
      updateActiveContent(nextValue);
      requestAnimationFrame(() => textarea.setSelectionRange(cursorPosition, cursorPosition));
      return;
    }

    updateActiveContent(textarea.value);
  };

  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget;
    const cursorPosition = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

    if (pairs[event.key] && cursorPosition === selectionEnd) {
      event.preventDefault();
      const nextValue = `${textarea.value.slice(0, cursorPosition)}${event.key}${pairs[event.key]}${textarea.value.slice(cursorPosition)}`;
      updateActiveContent(nextValue);
      requestAnimationFrame(() => textarea.setSelectionRange(cursorPosition + 1, cursorPosition + 1));
      return;
    }

    if (event.key === 'Backspace' && cursorPosition === selectionEnd) {
      const opening = textarea.value[cursorPosition - 2];
      const closing = textarea.value[cursorPosition - 1];
      if (pairs[opening] === closing) {
        event.preventDefault();
        const nextValue = `${textarea.value.slice(0, cursorPosition - 2)}${textarea.value.slice(cursorPosition)}`;
        updateActiveContent(nextValue);
        requestAnimationFrame(() => textarea.setSelectionRange(cursorPosition - 2, cursorPosition - 2));
        return;
      }
    }

    if (event.key !== 'Delete' || cursorPosition !== selectionEnd) return;

    const opening = textarea.value[cursorPosition - 1];
    const closing = textarea.value[cursorPosition];
    if (pairs[opening] !== closing) return;

    event.preventDefault();
    const nextValue = `${textarea.value.slice(0, cursorPosition - 1)}${textarea.value.slice(cursorPosition + 1)}`;
    updateActiveContent(nextValue);
    requestAnimationFrame(() => textarea.setSelectionRange(cursorPosition - 1, cursorPosition - 1));
  };

  const readWorkspace = async (handle: DirectoryHandle) => {
    const loadedFiles: WorkspaceFile[] = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file' && /\.(js|ts|jsx|tsx|json|md|c|cc|cpp|cxx|h|hpp)$/.test(entry.name)) {
        loadedFiles.push({ name: entry.name, content: await (await entry.getFile()).text() });
      }
    }

    if (loadedFiles.length > 0) {
      // Ensure we have main.cpp and tests.cpp files
      const hasMain = loadedFiles.some(file => file.name === 'main.cpp');
      const hasTests = loadedFiles.some(file => file.name === 'tests.cpp');

      if (!hasMain) loadedFiles.push({ name: 'main.cpp', content: '' });
      if (!hasTests) loadedFiles.push({ name: 'tests.cpp', content: '' });

      setFiles(loadedFiles);
      setActiveFile(current => loadedFiles.some(file => file.name === current)
        ? current
        : loadedFiles.find(file => file.name === 'main.cpp')?.name || loadedFiles[0].name);
    }
  };

  const connectWorkspace = async () => {
    const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
    if (!picker) {
      setStatus('Folder sync needs a Chromium browser with File System Access support.');
      return;
    }

    try {
      const handle = await picker();
      directoryHandle.current = handle;
      await readWorkspace(handle);
      setSyncVersion(version => version + 1);
      setStatus(`Connected to ${handle.name}. Watching for VS Code changes.`);
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        setStatus('Could not connect to that folder. Check the browser permission.');
      }
    }
  };

  const saveActiveFile = async () => {
    const handle = directoryHandle.current;
    if (!handle) {
      setStatus('Connect a workspace folder before saving to VS Code.');
      return;
    }

    const fileHandle = await handle.getFileHandle(activeFile, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(activeContent);
    await writable.close();
    setStatus(`${activeFile} saved to the connected workspace.`);
  };

  useEffect(() => {
    if (!directoryHandle.current) return undefined;
    const interval = window.setInterval(() => {
      const handle = directoryHandle.current;
      if (handle) void readWorkspace(handle).catch(() => setStatus('Workspace permission expired. Reconnect the folder.'));
    }, 2000);
    return () => window.clearInterval(interval);
  }, [activeFile, syncVersion]);

  const runCode = async () => {
    if (/\.(c|cc|cpp|cxx|h|hpp)$/i.test(activeFile)) {
      setIsRunning(true);
      setOutput('Compiling and running...');
      try {
        const response = await fetch('/api/compile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: activeContent, filename: activeFile }),
        });
        const result = await response.json() as { ok?: boolean; phase?: string; output?: string; error?: string };
        if (!response.ok) throw new Error(result.error || `Compiler server returned HTTP ${response.status}`);
        setOutput(result.output || 'Compiler returned no output.');
        setStatus(result.ok ? 'C++ compiled and ran successfully.' : `C++ ${result.phase || 'compiler'} reported an issue.`);
      } catch (error) {
        setOutput(`Compiler connection failed: ${error instanceof Error ? error.message : String(error)}. Start the compiler server with npm run dev:compiler.`);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    setIsRunning(true);
    setOutput('Running...');
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...values: unknown[]) => logs.push(values.map(value => String(value)).join(' '));

    try {
      const code = files.find(file => file.name === 'tests.js')
        ? `${files.find(file => file.name === 'main.js')?.content || ''}\n${files.find(file => file.name === 'tests.js')?.content || ''}`
        : activeContent;
      new Function(code)();
      setOutput(logs.length > 0 ? logs.join('\n') : 'Ran successfully with no console output.');
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      console.log = originalLog;
      setIsRunning(false);
    }
  };

  const cleanGeneratedCode = (content: string) => content
    .replace(/^```(?:javascript|typescript|js|ts|cpp|c\+\+|c)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const requestConfiguredPractice = async (task: 'exercise' | 'tests', specifics: string) => {
    const provider = localStorage.getItem('codevault-ai-provider') || 'ollama';
    const endpoint = localStorage.getItem('codevault-ai-endpoint') || 'http://localhost:11434/v1/chat/completions';
    const model = localStorage.getItem('codevault-ai-model') || 'llama3.2';
    const apiKey = localStorage.getItem('codevault-ai-key')?.trim();
    const selectedMistake = context.mistakes.find(item => !item.reviewedRecently) || context.mistakes[0];
    const mistakeContext = selectedMistake
      ? `Recorded mistake: ${selectedMistake.description}\nExample: ${selectedMistake.example}\nLearning log: ${selectedMistake.learningLog}`
      : 'No recorded mistake exists yet; focus on the user\'s stated difficulty.';
    const prompt = task === 'exercise'
      ? `Create one focused C++ coding exercise. Focus on exactly one mistake or difficulty, not a broad curriculum.\n${mistakeContext}\nUser specifics: ${specifics || 'Choose the most relevant unreviewed mistake.'}\nReturn only a complete main.cpp file. Use standard C++23, include required headers, provide a clear problem comment and function signature, and leave TODO guidance without including the solution.`
      : `Create focused C++23 tests for the current solve function. Target exactly one mistake or difficulty.\n${mistakeContext}\nUser specifics: ${specifics || 'Cover normal input, one edge case, and the recorded mistake.'}\nReturn only a complete tests.cpp file. Use assert, include required headers, declare solve, and do not rewrite the solution.`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && provider !== 'ollama' ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: 'You are a precise programming practice coach. Follow the requested output format exactly and keep the exercise narrowly focused.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) throw new Error(`${provider} returned HTTP ${response.status}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Ollama returned no code.');
    return cleanGeneratedCode(content);
  };

  const generateExercise = async () => {
    const mistake = context.mistakes.find(item => !item.reviewedRecently) || context.mistakes[0];
    const focus = mistake?.description || 'edge cases and clear input validation';
    const specifics = practicePrompt.trim();
    setIsGenerating(true);
    setPracticeHistory(current => [...current, `Exercise request: ${specifics || focus}`]);
    try {
      const provider = localStorage.getItem('codevault-ai-provider');
      const generated = provider === 'ollama' || provider === 'nim'
        ? await requestConfiguredPractice('exercise', specifics)
        : `#include <string>\n\n// Focused C++ exercise based on: ${focus}\n// User focus: ${specifics || 'Handle the recorded mistake deliberately.'}\n\nstd::string solve(const std::string& input) {\n  // TODO: explain your approach before implementing it\n  return input;\n}\n`;
      setFiles(current => current.map(file => file.name === 'main.cpp' ? { ...file, content: generated } : file));
      setActiveFile('main.cpp');
      setStatus(provider === 'nim' ? 'NVIDIA NIM generated a focused C++ exercise in main.cpp.' : provider === 'ollama' ? 'Ollama generated a focused C++ exercise in main.cpp.' : 'Generated a local focused C++ exercise in main.cpp.');
      setPracticePrompt('');
    } catch (error) {
      setStatus(`Exercise generation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTests = async () => {
    const mistake = context.mistakes.find(item => !item.reviewedRecently) || context.mistakes[0];
    const focus = mistake?.description || 'normal cases, empty input, and boundary values';
    const specifics = practicePrompt.trim();
    setIsGenerating(true);
    setPracticeHistory(current => [...current, `Test request: ${specifics || focus}`]);
    try {
      const provider = localStorage.getItem('codevault-ai-provider');
      const generated = provider === 'ollama' || provider === 'nim'
        ? await requestConfiguredPractice('tests', specifics)
        : `#include <cassert>\n#include <string>\n\n// Focused C++ tests for: ${focus}\n// User focus: ${specifics || 'Cover normal cases, empty input, and boundary values.'}\n\nstd::string solve(const std::string& input);\n\nint main() {\n  assert(solve(\"\") == \"\");\n  return 0;\n}\n`;
      setFiles(current => current.map(file => file.name === 'tests.cpp' ? { ...file, content: generated } : file));
      setActiveFile('tests.cpp');
      setStatus(provider === 'nim' ? 'NVIDIA NIM generated focused C++ tests in tests.cpp.' : provider === 'ollama' ? 'Ollama generated focused C++ tests in tests.cpp.' : 'Generated local focused C++ tests in tests.cpp.');
      setPracticePrompt('');
    } catch (error) {
      setStatus(`Test generation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={isFullscreen ? 'fixed inset-0 z-50 flex flex-col gap-4 overflow-hidden bg-[#08090a] p-4' : 'flex min-h-full flex-col gap-5 max-w-7xl mx-auto'}>
      {/* Header - Improved Button Hierarchy: Primary action has dominant color, others secondary/tertiary */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Interactive Code Workspace</h1>
          <p className="text-xs text-[#8a8f98] mt-1">C++23 practice sandbox linked to your VS Code local tree</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Connect Workspace - Tertiary (ghost button) */}
          <button
            type="button"
            onClick={connectWorkspace}
            className="rounded-md border border-white/[0.1] px-3 py-1.5 text-xs text-[#8a8f98] hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Connect Workspace
          </button>
          {/* Save File - Secondary (outline/button with lighter fill) */}
          <button
            type="button"
            onClick={saveActiveFile}
            className="rounded-md border border-white/[0.12] px-3 py-1.5 text-xs font-semibold hover:border-white/[0.2] hover:bg-white/[0.06] transition-colors"
          >
            Save File
          </button>
          {/* Compile & Run - Primary (dominant solid color) */}
          <button
            type="button"
            onClick={() => void runCode()}
            disabled={isRunning}
            className="flex items-center gap-1.5 rounded-md bg-[#10b981] px-3.5 py-1.5 text-xs font-semibold text-[#08090a] hover:bg-[#10b981]/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            <span>▶</span>
            <span>{isRunning ? 'Running...' : /\.(c|cc|cpp|cxx|h|hpp)$/i.test(activeFile) ? 'Compile & Run' : 'Execute'}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(fullscreen => !fullscreen)}
            className="rounded-md border border-white/[0.1] px-3 py-1.5 text-xs text-[#8a8f98] hover:text-white transition-colors"
          >
            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0c0d12] px-3.5 py-2 text-xs text-[#8a8f98]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#5e6ad2]" />
        <span>{status}</span>
      </div>

      {/* Code Editor Window */}
      <div className="flex min-h-[32rem] flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#090a0f] shadow-2xl">
        {/* Editor Tab Bar - Improved Tab Styling: lighter grey with colored top-border accent */}
        <div className="flex flex-wrap items-center gap-1 border-b border-white/[0.08] bg-[#0e1015] px-3 py-1.5">
          {files.map(file => (
            <button
              key={file.name}
              type="button"
              onClick={() => setActiveFile(file.name)}
              className={`rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                activeFile === file.name
                  ? 'bg-[#090a0f] text-white border-b-2 border-[#5e6ad2] shadow-sm font-medium' /* Lighter shade with colored top-border accent */
                  : 'text-[#8a8f98] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {file.name}
            </button>
          ))}
        </div>

        {/* Editor Body */}
        <div className="code-editor-scrollbar-hidden relative min-h-[28rem] flex-1 overflow-hidden bg-[#090a0f]">
          <pre
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 m-0 whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6"
          >
            {highlightJavaScript(activeContent)}
            {activeContent.endsWith('\n') ? '\n' : ''}
          </pre>
          <textarea
            value={activeContent}
            onChange={handleEditorChange}
            onKeyDown={handleEditorKeyDown}
            spellCheck={false}
            onScroll={event => {
              const preview = event.currentTarget.previousElementSibling;
              if (preview) preview.setAttribute('style', `transform: translateY(-${event.currentTarget.scrollTop}px)`);
            }}
            className="code-editor-scrollbar-hidden relative z-10 block min-h-[28rem] h-full w-full resize-none overflow-y-auto overflow-x-hidden bg-transparent p-5 font-mono text-xs leading-6 text-transparent caret-white outline-none selection:bg-[#5e6ad2]/30"
            aria-label={`Edit ${activeFile}`}
          />
        </div>

        {/* Output Console - Improved Output Contrast: brighter terminal green */}
        <div className="border-t border-white/[0.08] bg-[#0b0c10] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8f98]">
              Execution Output
            </span>
          </div>
          <pre className="min-h-12 whitespace-pre-wrap font-mono text-xs text-[#4ade80] leading-relaxed">
            {output || 'Click Compile & Run to execute active code.'}
          </pre>
        </div>
      </div>

      {/* AI Practice Generator Card */}
      <div className="linear-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Targeted AI Practice Generator</h2>
          <p className="text-xs text-[#8a8f98]">Instruct the practice coach on what feels difficult to generate focused exercises.</p>
        </div>

        <textarea
          value={practicePrompt}
          onChange={event => setPracticePrompt(event.target.value)}
          className="linear-input w-full p-3 text-xs min-h-[70px]"
          placeholder="Example: I struggle with sliding window boundary checks on empty strings. Generate a test case and scaffold."
          aria-label="Describe what you want to practice"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generateExercise()}
            disabled={isGenerating}
            className="linear-btn-primary px-3.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Exercise'}
          </button>
          <button
            type="button"
            onClick={() => void generateTests()}
            disabled={isGenerating}
            className="rounded-md border border-white/[0.1] px-3.5 py-1.5 text-xs text-[#8a8f98] hover:text-white transition-colors disabled:opacity-50"
          >
            Generate Tests
          </button>
        </div>

        {practiceHistory.length > 0 && (
          <div className="border-t border-white/[0.06] pt-3 text-[11px] text-[#62666f] space-y-1">
            <span className="font-semibold uppercase text-[10px] tracking-wider text-[#8a8f98] block">Recent prompts</span>
            {practiceHistory.slice(-3).map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditorPage;