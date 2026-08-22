import { useContext, useEffect, useRef, useState } from 'react';
import AppContext from '../contexts/AppContext';

interface Message {
  role: 'assistant' | 'user';
  author?: string;
  timestamp?: string;
  avatar?: string;
  text: string;
}

const formatMessage = (text: string) => text.split('\n').map((line, lineIndex) => {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  const content = parts.map((part, partIndex) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${lineIndex}-${partIndex}`} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });

  return (
    <span key={lineIndex} className={/^(\d+\.\s+|[-*]\s+)/.test(line) ? 'block pl-2 text-sm leading-relaxed text-[#f7f8f8]' : 'block text-sm leading-relaxed text-[#f7f8f8]'}>
      {content}
    </span>
  );
});

const API_PRESETS = {
  openai: { label: 'ChatGPT / OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  xai: { label: 'Grok / xAI', endpoint: 'https://api.x.ai/v1/chat/completions', model: 'grok-4.5' },
  nim: { label: 'NVIDIA NIM', endpoint: '/api/nvidia/v1/chat/completions', model: 'meta/llama-3.1-8b-instruct' },
  ollama: { label: 'Ollama (local)', endpoint: 'http://localhost:11434/v1/chat/completions', model: 'llama3.2' },
  custom: { label: 'Custom OpenAI-compatible', endpoint: '', model: '' },
} as const;
type ApiProvider = keyof typeof API_PRESETS;

const AiHelper = () => {
  const context = useContext(AppContext);
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiProvider, setApiProvider] = useState<ApiProvider>(() => (localStorage.getItem('codevault-ai-provider') as ApiProvider) || 'openai');
  const [apiEndpoint, setApiEndpoint] = useState(() => localStorage.getItem('codevault-ai-endpoint') || API_PRESETS.openai.endpoint);
  const [apiModel, setApiModel] = useState(() => localStorage.getItem('codevault-ai-model') || API_PRESETS.openai.model);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('codevault-ai-key') || '');
  const [messages, setMessages] = useState<Message[]>([]);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const isOllama = apiProvider === 'ollama';

  useEffect(() => {
    const textarea = promptRef.current;
    if (!textarea) return;

    const maxHeight = 180;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [prompt]);

  if (!context) return null;

  const addMessage = (message: Message) => {
    setMessages(current => [...current, message]);
  };

  const saveApiSettings = () => {
    localStorage.setItem('codevault-ai-provider', apiProvider);
    localStorage.setItem('codevault-ai-endpoint', apiEndpoint.trim());
    localStorage.setItem('codevault-ai-model', apiModel.trim());
    localStorage.setItem('codevault-ai-key', apiKey.trim());
    setShowSettings(false);
    addMessage({
      role: 'assistant',
      author: 'Linear Agent',
      avatar: 'AI',
      timestamp: 'Just now',
      text: apiKey.trim() ? `API mode configured for ${API_PRESETS[apiProvider].label}.` : 'Using offline autonomous workspace assistant.',
    });
  };

  const askConfiguredApi = async (request: string) => {
    const requestEndpoint = apiProvider === 'nim' ? API_PRESETS.nim.endpoint : apiEndpoint.trim();
    const workspace = {
      problems: context.problems.slice(-40).map(p => ({ title: p.title, status: p.status, difficulty: p.difficulty, topics: p.topics })),
      notes: context.notes.slice(-20).map(n => ({ title: n.title, tags: n.tags })),
      concepts: context.concepts.slice(-20).map(c => ({ name: c.name, description: c.description })),
      mistakes: context.mistakes.slice(-20).map(m => ({ description: m.description, reviewed: m.reviewedRecently })),
    };

    let response: Response;
    try {
      response = await fetch(requestEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
        },
        body: JSON.stringify({
          model: apiModel.trim(),
          temperature: 0.3,
          messages: [
            { role: 'system', content: 'You are Linear Agent, an autonomous programming and sprint assistant for engineers. Give concise, razor-sharp technical advice and action items based on the workspace.' },
            { role: 'user', content: `Workspace:\n${JSON.stringify(workspace)}\n\nPrompt: ${request}` },
          ],
        }),
      });
    } catch (error) {
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      throw new Error(`Could not reach ${API_PRESETS[apiProvider].label}. Network/CORS: ${detail}`);
    }

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(`${API_PRESETS[apiProvider].label} returned HTTP ${response.status}: ${responseBody.slice(0, 300)}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || 'Completed request.';
  };

  const handlePrompt = async (event: React.FormEvent) => {
    event.preventDefault();
    const request = prompt.trim();
    if (!request) return;

    addMessage({
      role: 'user',
      author: 'you',
      avatar: 'U',
      timestamp: 'Just now',
      text: request,
    });
    setPrompt('');

    // Check for quick commands
    if (request.toLowerCase().includes('create urgent') || request.toLowerCase().includes('create issue')) {
      const title = request.replace(/@Linear|@CodeVault|create urgent issue|create issue|create urgent issues and assign to me|create/gi, '').trim() || 'Urgent: Cold start vehicle state optimization';
      context.addProblem({
        title,
        difficulty: 'Hard',
        status: 'In Progress',
        priority: 'Urgent',
        assignee: { name: 'you' },
        topics: ['Performance', 'Optimization', 'Bug'],
        leetCodeUrl: 'https://leetcode.com',
        initialApproach: 'Identified during an AI Helper discussion.',
        finalApproach: 'Progressive hydration with background worker sync.',
        solution: '// Created from AI Helper',
        mistakes: [],
        whatILearned: 'Captured live from discussion.',
        dateSolved: new Date().toISOString(),
        reflection: {
          whatWasDifficult: 'Cold start latency.',
          whatInitiallyThought: 'Full sync needed.',
          whatMadeItClick: 'Render minimum state first.',
          conceptLearned: 'Progressive Hydration',
          mistakeToAvoid: 'Blocking the main thread.',
          confidence: 5,
        }
      });

      addMessage({
        role: 'assistant',
        author: 'Linear Agent',
        avatar: 'AI',
        timestamp: 'Just now',
        text: `Created urgent issue **"${title}"** (Assigned to you, Status: In Progress, Priority: Urgent). Added to Kanban Board!`,
      });
      return;
    }

    if ((apiKey.trim() || isOllama) && apiEndpoint.trim() && apiModel.trim()) {
      setIsLoading(true);
      try {
        const responseText = await askConfiguredApi(request);
        addMessage({
          role: 'assistant',
          author: 'Linear Agent',
          avatar: 'AI',
          timestamp: 'Just now',
          text: responseText,
        });
      } catch (error) {
        addMessage({
          role: 'assistant',
          author: 'Linear Agent',
          avatar: 'AI',
          timestamp: 'Just now',
          text: `API request failed: ${error instanceof Error ? error.message : String(error)}.`,
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Offline workspace intelligence
    let response = '';
    const normalizedRequest = request.toLowerCase();
    if (normalizedRequest.includes('suggest') || normalizedRequest.includes('what should') || normalizedRequest.includes('next')) {
      response = `Workspace analysis:\n- ${context.problems.length} total problems tracked\n- ${context.mistakes.filter(m => !m.reviewedRecently).length} unreviewed mistake(s)\n- Recommendation: Focus on **Dynamic Programming State Compression** or review your cold-start launch issue.`;
    } else {
      response = `I've analyzed your workspace. You have ${context.problems.length} problems on the board, ${context.notes.length} notes, and ${context.concepts.length} concepts recorded. Try "@Linear create urgent issues and assign to me" to create tracked issues from chat.`;
    }

    addMessage({
      role: 'assistant',
      author: 'Linear Agent',
      avatar: 'AI',
      timestamp: 'Just now',
      text: response,
    });
  };

  return (
    <>
      {/* Floating AI Helper panel */}
      {isOpen && (
        <section
          className="fixed bottom-6 left-4 sm:left-8 z-50 flex w-[min(30rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0c0d12]/95 text-white shadow-2xl backdrop-blur-xl animate-fadeIn"
          aria-label="AI Helper"
        >
          {/* AI Helper header */}
          <header className="flex items-center justify-between border-b border-white/[0.08] bg-[#0e1017]/80 px-4 py-3 select-none">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-white">AI Helper</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs text-[#8a8f98] hover:text-white transition-colors"
                title="API Settings"
              >
                ⚙️
              </button>
              <button
                type="button"
                className="text-xs text-[#8a8f98] hover:text-white"
                title="AI Helper options"
              >
                ⋯
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs text-[#8a8f98] hover:text-white p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Settings Sub-panel */}
          {showSettings && (
            <form onSubmit={(e) => { e.preventDefault(); saveApiSettings(); }} className="space-y-2 border-b border-white/[0.08] bg-[#14161f] p-3 text-xs">
              <label className="block text-[#8a8f98]">Provider
                <select
                  value={apiProvider}
                  onChange={e => {
                    const provider = e.target.value as ApiProvider;
                    setApiProvider(provider);
                    if (provider !== 'custom') {
                      setApiEndpoint(API_PRESETS[provider].endpoint);
                      setApiModel(API_PRESETS[provider].model);
                    }
                  }}
                  className="linear-input mt-1 w-full py-1 px-2 text-white text-xs"
                >
                  {Object.entries(API_PRESETS).map(([value, preset]) => <option key={value} value={value}>{preset.label}</option>)}
                </select>
              </label>
              <label className="block text-[#8a8f98]">API Key
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  className="linear-input mt-1 w-full py-1 px-2 text-white text-xs"
                  placeholder="Bearer token (stored locally)"
                />
              </label>
              <button type="submit" className="linear-btn-primary w-full py-1 text-xs">Save Settings</button>
            </form>
          )}

          {/* Messages Stream (Image 1 style) */}
          {(messages.length > 0 || isLoading) && (
            <div className="max-h-80 space-y-4 overflow-y-auto p-4 select-text">
              {messages.map((msg, index) => (
                <div key={index} className="flex items-start gap-3 text-xs group">
                  {/* Avatar */}
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    msg.avatar === 'AI' ? 'bg-[#5e6ad2] text-white' :
                    'bg-[#1e202b] text-white border border-white/[0.1]'
                  }`}>
                    {msg.avatar || msg.author?.[0]?.toUpperCase() || 'U'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{msg.author || 'User'}</span>
                      <span className="text-[10px] text-[#62666f]">{msg.timestamp || '10:52 PM'}</span>
                    </div>
                    <div className="text-[#dedede] leading-relaxed">
                      {formatMessage(msg.text)}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-[#8a8f98] pl-10">
                  <span className="h-2 w-2 rounded-full bg-[#5e6ad2] animate-ping" />
                  <span>Linear Agent is reasoning...</span>
                </div>
              )}
            </div>
          )}

          {/* Command Pill Prompt (Image 1) */}
          <div className="border-t border-white/[0.08] bg-[#0b0c10] p-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setPrompt('@Linear create urgent issues and assign to me')}
                className="flex items-center gap-1 rounded-md bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 px-2 py-0.5 text-[11px] text-[#818cf8] hover:bg-[#5e6ad2]/25 transition-colors"
              >
                <span className="font-semibold">@Linear</span>
                <span>create urgent issues and assign to me</span>
              </button>
            </div>

            {/* Input & Action Toolbar (Image 1) */}
            <form onSubmit={handlePrompt} className="space-y-2">
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handlePrompt(e);
                  }
                }}
                placeholder="Ask AI Helper..."
                rows={1}
                className="w-full resize-none overflow-hidden rounded-lg border border-transparent bg-transparent p-1.5 text-xs text-white placeholder:text-[#62666f] outline-none focus:border-white/[0.1]"
              />

              {/* Bottom Icon Bar & Purple Split Send Button */}
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
                {/* Left Tool Icons */}
                <div className="flex items-center gap-1.5 text-[#8a8f98]">
                  <button type="button" className="p-1 hover:text-white rounded" title="Attach file">+</button>
                  <button type="button" className="p-1 hover:text-white rounded text-[11px] font-serif" title="Format">Aa</button>
                  <button type="button" className="p-1 hover:text-white rounded" title="Emoji">😀</button>
                  <button type="button" className="p-1 hover:text-white rounded" title="Mention">@</button>
                  <button type="button" className="p-1 hover:text-white rounded" title="Video">📹</button>
                  <button type="button" className="p-1 hover:text-white rounded" title="Voice">🎙️</button>
                  <button type="button" className="p-1 hover:text-white rounded" title="Canvas">🎨</button>
                </div>

                {/* Right Purple Split Send Button (Image 1) */}
                <div className="flex items-center rounded-md bg-[#5e6ad2] shadow-sm hover:bg-[#6875f5] transition-colors">
                  <button
                    type="submit"
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white"
                  >
                    <svg className="w-3 h-3 rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </button>
                  <div className="h-4 w-[1px] bg-white/20" />
                  <button
                    type="button"
                    className="px-1.5 py-1 text-[10px] text-white/90 hover:text-white"
                  >
                    ▼
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* Floating launcher button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full border border-white/[0.15] bg-[#0c0d12]/90 px-3.5 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md hover:border-[#5e6ad2] hover:bg-[#12141c] hover:shadow-[0_0_20px_rgba(94,106,210,0.3)] transition-all active:scale-95"
          aria-expanded={isOpen}
          aria-label="Open AI Helper"
        >
          <span className="flex h-2 w-2 rounded-full bg-[#5e6ad2] animate-ping" />
          <span>AI Helper</span>
        </button>
      )}
    </>
  );
};

export default AiHelper;
