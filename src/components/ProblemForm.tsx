import React, { useState } from 'react';
import type { Problem, Reflection } from '../types';

interface ProblemFormProps {
  onSubmit: (problem: Omit<Problem, 'id'>) => void;
  initialData?: Omit<Problem, 'id'>;
  isEditMode?: boolean;
}

const ProblemForm: React.FC<ProblemFormProps> = ({
  onSubmit,
  initialData,
  isEditMode = false
}) => {
  const [formData, setFormData] = useState<Omit<Problem, 'id'>>({
    title: initialData?.title || '',
    difficulty: initialData?.difficulty || 'Easy',
    status: initialData?.status || 'Todo',
    priority: initialData?.priority || 'Medium',
    leetCodeUrl: initialData?.leetCodeUrl || '',
    topics: initialData?.topics || [],
    dateSolved: initialData?.dateSolved || new Date().toISOString(),
    initialApproach: initialData?.initialApproach || '',
    finalApproach: initialData?.finalApproach || '',
    solution: initialData?.solution || '',
    mistakes: initialData?.mistakes || [],
    whatILearned: initialData?.whatILearned || '',
    reflection: initialData?.reflection || {
      whatWasDifficult: '',
      whatInitiallyThought: '',
      whatMadeItClick: '',
      conceptLearned: '',
      mistakeToAvoid: '',
      confidence: 3
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => {
      if (name === 'topics') {
        return {
          ...prev,
          topics: value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        };
      }
      if (name === 'mistakes') {
        return {
          ...prev,
          mistakes: value.split('\n').map(mistake => mistake.trim()).filter(mistake => mistake.length > 0)
        };
      }
      if (type === 'number') {
        return { ...prev, [name]: parseInt(value) || 0 };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleReflectionChange = (field: keyof Reflection, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      reflection: {
        ...prev.reflection,
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-xs text-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5">Problem / Issue Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Faster app launch or LRU Cache"
            className="linear-input w-full px-3 py-2 text-xs"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5">Difficulty</label>
          <select
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            className="linear-input w-full px-3 py-2 text-xs"
          >
            <option value="Easy">Easy (🟢)</option>
            <option value="Medium">Medium (🟡)</option>
            <option value="Hard">Hard (🔴)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5">Status</label>
          <select
            name="status"
            value={formData.status || 'Todo'}
            onChange={handleChange}
            className="linear-input w-full px-3 py-2 text-xs"
          >
            <option value="Backlog">Backlog</option>
            <option value="Todo">Todo</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5">Priority</label>
          <select
            name="priority"
            value={formData.priority || 'Medium'}
            onChange={handleChange}
            className="linear-input w-full px-3 py-2 text-xs"
          >
            <option value="Urgent">🔴 Urgent</option>
            <option value="High">📶 High</option>
            <option value="Medium">📶 Medium</option>
            <option value="Low">📶 Low</option>
            <option value="None">None</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5">LeetCode URL</label>
          <input
            type="url"
            name="leetCodeUrl"
            value={formData.leetCodeUrl}
            onChange={handleChange}
            className="linear-input w-full px-3 py-2 text-xs"
            placeholder="https://leetcode.com/problems/..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5">Topics / Tags (comma separated)</label>
          <input
            type="text"
            name="topics"
            value={formData.topics.join(', ')}
            onChange={handleChange}
            className="linear-input w-full px-3 py-2 text-xs"
            placeholder="Array, Dynamic Programming, Performance"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5">Final Approach & Algorithm</label>
        <textarea
          name="finalApproach"
          value={formData.finalApproach}
          onChange={handleChange}
          rows={3}
          className="linear-input w-full px-3 py-2 text-xs"
          placeholder="Describe optimal data structures, pointers, and time complexity..."
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-[#8a8f98] mb-1.5">Code Solution</label>
        <textarea
          name="solution"
          value={formData.solution}
          onChange={handleChange}
          rows={4}
          className="linear-input w-full p-3 font-mono text-xs text-[#abb2bf] bg-[#090a0e]"
          placeholder="// function solve() { ... }"
        />
      </div>

      {/* Reflection Details */}
      <div className="rounded-lg border border-white/[0.08] bg-[#121318] p-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8a8f98]">Key Learnings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-[#8a8f98] mb-1">What finally made it click?</label>
            <input
              type="text"
              value={formData.reflection.whatMadeItClick}
              onChange={(e) => handleReflectionChange('whatMadeItClick', e.target.value)}
              className="linear-input w-full px-2.5 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#8a8f98] mb-1">Concept Learned</label>
            <input
              type="text"
              value={formData.reflection.conceptLearned}
              onChange={(e) => handleReflectionChange('conceptLearned', e.target.value)}
              className="linear-input w-full px-2.5 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#8a8f98] mb-1">Mistake to avoid next time</label>
            <input
              type="text"
              value={formData.reflection.mistakeToAvoid}
              onChange={(e) => handleReflectionChange('mistakeToAvoid', e.target.value)}
              className="linear-input w-full px-2.5 py-1.5 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#8a8f98] mb-1">Confidence (1-5)</label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.reflection.confidence}
              onChange={(e) => handleReflectionChange('confidence', parseInt(e.target.value) || 3)}
              className="linear-input w-full px-2.5 py-1.5 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          className="linear-btn-primary px-5 py-2 text-xs font-semibold"
        >
          {isEditMode ? 'Update Issue' : 'Create Issue'}
        </button>
      </div>
    </form>
  );
};

export default ProblemForm;