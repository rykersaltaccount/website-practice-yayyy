import React, { useEffect, useState } from 'react';
import { getAiConfig, providerDefaults, saveAiConfig, type AiConfig, type AiProvider, type AiTask } from '../utils/aiProviders';

const providerLabels: Record<AiProvider, string> = {
  nim: 'NVIDIA NIM', ollama: 'Ollama', chatgpt: 'ChatGPT / OpenAI', gemini: 'Gemini', grok: 'Grok / xAI', custom: 'Custom OpenAI-compatible',
};
const tasks: Array<{ id: AiTask; label: string; description: string }> = [
  { id: 'practice', label: 'Practice exercises', description: 'Short targeted drills at your chosen difficulty.' },
  { id: 'test', label: 'Mastery tests', description: 'Five-level assessments that can mark a concept mastered.' },
  { id: 'helper', label: 'AI Helper', description: 'Workspace analysis, advice, and issue creation.' },
];

const AiSettingsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [task, setTask] = useState<AiTask>('practice');
  const [config, setConfig] = useState<AiConfig>(() => getAiConfig('practice'));

  useEffect(() => setConfig(getAiConfig(task)), [task]);

  const selectProvider = (provider: AiProvider) => setConfig(current => ({ ...current, ...providerDefaults[provider], apiKey: current.apiKey }));
  const update = (field: keyof AiConfig, value: string) => setConfig(current => ({ ...current, [field]: value }));
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    saveAiConfig(task, config);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-white/[0.12] bg-[#0c0d12] shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/[0.08] px-6 py-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#c084fc]">AI configuration</p><h2 className="mt-1 text-lg font-bold text-white">Providers & API keys</h2><p className="mt-1 text-xs text-[#8a8f98]">Each capability has its own provider and credentials.</p></div>
          <button type="button" onClick={onClose} className="text-[#8a8f98] hover:text-white" aria-label="Close settings">✕</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr]">
          <nav className="border-b border-white/[0.08] p-3 md:border-b-0 md:border-r">
            {tasks.map(item => <button key={item.id} type="button" onClick={() => setTask(item.id)} className={`mb-1 w-full rounded-md px-3 py-2 text-left text-xs ${task === item.id ? 'bg-[#5e6ad2]/15 text-white' : 'text-[#8a8f98] hover:bg-white/[0.04] hover:text-white'}`}>{item.label}</button>)}
          </nav>
          <form onSubmit={save} className="space-y-4 p-6">
            <div><label className="mb-1 block text-[11px] font-semibold text-[#8a8f98]">Provider</label><select value={config.provider} onChange={event => selectProvider(event.target.value as AiProvider)} className="linear-input w-full px-3 py-2 text-xs">{Object.entries(providerLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div><label className="mb-1 block text-[11px] font-semibold text-[#8a8f98]">API key {config.provider === 'ollama' && <span className="font-normal text-[#62666f]">(not required)</span>}</label><input type="password" value={config.apiKey} onChange={event => update('apiKey', event.target.value)} className="linear-input w-full px-3 py-2 text-xs" placeholder={config.provider === 'ollama' ? 'Leave blank for local Ollama' : 'Paste provider API key'} /></div>
            <div><label className="mb-1 block text-[11px] font-semibold text-[#8a8f98]">Model</label><input value={config.model} onChange={event => update('model', event.target.value)} className="linear-input w-full px-3 py-2 text-xs font-mono" placeholder="Provider model name" /></div>
            <div><label className="mb-1 block text-[11px] font-semibold text-[#8a8f98]">Endpoint</label><input value={config.endpoint} onChange={event => update('endpoint', event.target.value)} className="linear-input w-full px-3 py-2 text-xs font-mono" placeholder="https://..." /></div>
            <div className="flex items-center justify-between pt-2"><p className="max-w-xs text-[10px] leading-relaxed text-[#62666f]">Keys are stored in this browser's local storage. Never use a service-role key in a browser app.</p><button type="submit" className="linear-btn-primary px-4 py-2 text-xs font-semibold">Save {tasks.find(item => item.id === task)?.label}</button></div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiSettingsModal;
