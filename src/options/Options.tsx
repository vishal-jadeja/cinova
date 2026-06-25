import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, RotateCcw, Save, X } from 'lucide-react';
import { Goal, GoalStore } from '../types';
import { getStore, setStore } from '../utils/storage';

const MAX_GOALS = 10;
const MAX_LINKS = 5;

interface LinkDraft {
  id: string;
  url: string;
  label: string;
}

interface GoalDraft {
  id: string;
  text: string;
  completed: boolean;
  description: string;
  links: LinkDraft[];
}

type Setter = React.Dispatch<React.SetStateAction<GoalDraft[]>>;

function emptyDraft(): GoalDraft {
  return { id: crypto.randomUUID(), text: '', completed: false, description: '', links: [] };
}

function draftsFromGoals(goals: Goal[]): GoalDraft[] {
  const result = goals.map((g) => ({
    id: g.id,
    text: g.text,
    completed: g.completed,
    description: g.description ?? '',
    links: (g.links ?? []).map((l) => ({ ...l })),
  }));
  return result.length > 0 ? result : [emptyDraft()];
}

function normalizeUrl(url: string): string {
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}

function buildGoals(drafts: GoalDraft[]): Goal[] {
  return drafts
    .filter((d) => d.text.trim())
    .map((d) => {
      const validLinks = d.links
        .filter((l) => l.url.trim())
        .map((l) => ({
          id: l.id,
          url: normalizeUrl(l.url.trim()),
          label: l.label.trim() || l.url.trim(),
        }));
      return {
        id: d.id,
        text: d.text.trim(),
        completed: d.completed,
        ...(d.description.trim() ? { description: d.description.trim() } : {}),
        ...(validLinks.length > 0 ? { links: validLinks } : {}),
      };
    });
}

const CATEGORIES = [
  { key: 'weekly' as const, label: 'WEEKLY GOALS', note: 'resets every Monday' },
  { key: 'monthly' as const, label: 'MONTHLY GOALS', note: '' },
  { key: 'yearly' as const, label: 'YEARLY GOALS', note: '' },
];

export default function Options() {
  const [store, setLocalStore] = useState<GoalStore | null>(null);
  const [weekly, setWeekly] = useState<GoalDraft[]>([emptyDraft()]);
  const [monthly, setMonthly] = useState<GoalDraft[]>([emptyDraft()]);
  const [yearly, setYearly] = useState<GoalDraft[]>([emptyDraft()]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  useEffect(() => {
    getStore().then((s) => {
      setLocalStore(s);
      setWeekly(draftsFromGoals(s.weekly));
      setMonthly(draftsFromGoals(s.monthly));
      setYearly(draftsFromGoals(s.yearly));
    });
  }, []);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateDraft(setter: Setter, id: string, patch: Partial<Omit<GoalDraft, 'id'>>) {
    setter((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function addDraft(setter: Setter) {
    setter((prev) => [...prev, emptyDraft()]);
  }

  function removeDraft(setter: Setter, id: string) {
    setter((prev) => {
      const next = prev.filter((d) => d.id !== id);
      return next.length === 0 ? [emptyDraft()] : next;
    });
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function addLink(setter: Setter, goalId: string) {
    setter((prev) =>
      prev.map((d) =>
        d.id === goalId
          ? { ...d, links: [...d.links, { id: crypto.randomUUID(), url: '', label: '' }] }
          : d
      )
    );
  }

  function removeLink(setter: Setter, goalId: string, linkId: string) {
    setter((prev) =>
      prev.map((d) =>
        d.id === goalId ? { ...d, links: d.links.filter((l) => l.id !== linkId) } : d
      )
    );
  }

  function updateLink(
    setter: Setter,
    goalId: string,
    linkId: string,
    patch: { url?: string; label?: string }
  ) {
    setter((prev) =>
      prev.map((d) =>
        d.id === goalId
          ? { ...d, links: d.links.map((l) => (l.id === linkId ? { ...l, ...patch } : l)) }
          : d
      )
    );
  }

  async function handleSave() {
    if (!store) return;
    const newStore: GoalStore = {
      ...store,
      weekly: buildGoals(weekly),
      monthly: buildGoals(monthly),
      yearly: buildGoals(yearly),
    };
    await setStore(newStore);
    setLocalStore(newStore);
    setToast('Goals saved ✓');
    setTimeout(() => setToast(''), 2000);
  }

  async function handleResetWeekly() {
    if (!store) return;
    const newStore: GoalStore = {
      ...store,
      weekly: store.weekly.map((g) => ({ ...g, completed: false })),
    };
    await setStore(newStore);
    setLocalStore(newStore);
    setToast('Weekly progress reset ✓');
    setTimeout(() => setToast(''), 2000);
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-4 h-4 border border-accent rounded-full animate-spin border-t-transparent" />
      </div>
    );
  }

  const stateMap = {
    weekly: { values: weekly, setter: setWeekly },
    monthly: { values: monthly, setter: setMonthly },
    yearly: { values: yearly, setter: setYearly },
  };

  return (
    <div className="min-h-screen bg-background text-text-primary py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: 'Inter', letterSpacing: '0.02em' }}
        >
          Cinova
        </h1>
        <p className="text-text-secondary text-sm mb-10">Your goals. Every tab.</p>

        <div className="border-t border-border-subtle mb-10" />

        {CATEGORIES.map(({ key, label, note }) => {
          const { values, setter } = stateMap[key];
          const atMax = values.length >= MAX_GOALS;

          return (
            <div key={key} className="mb-10">
              <div className="flex items-baseline gap-3 mb-4">
                <span
                  className="text-text-secondary text-xs uppercase"
                  style={{ fontFamily: 'JetBrains Mono', letterSpacing: '0.15em' }}
                >
                  {label}
                </span>
                {note && (
                  <span className="text-text-secondary text-xs" style={{ opacity: 0.5 }}>
                    ({note})
                  </span>
                )}
                <span className="text-text-secondary text-xs ml-auto" style={{ opacity: 0.4 }}>
                  {values.filter((d) => d.text.trim()).length}/{MAX_GOALS}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {values.map((draft, i) => {
                  const isExpanded = expanded.has(draft.id);
                  const hasContent =
                    draft.description.trim() || draft.links.some((l) => l.url.trim());

                  return (
                    <div
                      key={draft.id}
                      className="border border-border-subtle"
                      style={{ borderRadius: '6px' }}
                    >
                      {/* Goal row */}
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <input
                          type="text"
                          value={draft.text}
                          onChange={(e) => updateDraft(setter, draft.id, { text: e.target.value })}
                          placeholder={`Goal ${i + 1}`}
                          className="flex-1 bg-transparent text-text-primary placeholder-text-secondary text-sm focus:outline-none"
                          style={{ fontFamily: 'Inter' }}
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpanded(draft.id)}
                          className={`flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                            isExpanded
                              ? 'text-accent'
                              : hasContent
                              ? 'text-accent opacity-70 hover:opacity-100'
                              : 'text-text-secondary hover:text-accent'
                          }`}
                          style={{ fontFamily: 'Inter', borderRadius: '4px' }}
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          <span style={{ fontSize: '11px' }}>Details</span>
                        </button>
                        {values.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDraft(setter, draft.id)}
                            className="flex-shrink-0 text-text-secondary hover:text-danger transition-colors p-1"
                            title="Remove goal"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {/* Detail panel */}
                      {isExpanded && (
                        <div
                          className="px-3 pb-4 border-t border-border-subtle"
                          style={{ background: 'rgba(255,255,255,0.02)' }}
                        >
                          {/* Description */}
                          <div className="mt-3 mb-4">
                            <label
                              className="block text-text-secondary mb-1.5"
                              style={{
                                fontFamily: 'JetBrains Mono',
                                fontSize: '10px',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Description
                            </label>
                            <textarea
                              value={draft.description}
                              onChange={(e) =>
                                updateDraft(setter, draft.id, { description: e.target.value })
                              }
                              placeholder="Optional context, notes, or motivation…"
                              rows={3}
                              className="w-full bg-surface border border-border-subtle text-text-primary placeholder-text-secondary px-3 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                              style={{ borderRadius: '6px', fontFamily: 'Inter' }}
                            />
                          </div>

                          {/* Links */}
                          <div>
                            <label
                              className="block text-text-secondary mb-2"
                              style={{
                                fontFamily: 'JetBrains Mono',
                                fontSize: '10px',
                                letterSpacing: '0.12em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Links
                            </label>

                            {draft.links.length > 0 && (
                              <div className="flex flex-col gap-2 mb-2">
                                {draft.links.map((link) => (
                                  <div key={link.id} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={link.url}
                                      onChange={(e) =>
                                        updateLink(setter, draft.id, link.id, { url: e.target.value })
                                      }
                                      placeholder="https://…"
                                      className="flex-1 bg-surface border border-border-subtle text-text-primary placeholder-text-secondary px-3 py-2 text-xs focus:outline-none focus:border-accent transition-colors"
                                      style={{ borderRadius: '6px', fontFamily: 'Inter' }}
                                    />
                                    <input
                                      type="text"
                                      value={link.label}
                                      onChange={(e) =>
                                        updateLink(setter, draft.id, link.id, {
                                          label: e.target.value,
                                        })
                                      }
                                      placeholder="Label (optional)"
                                      className="w-36 bg-surface border border-border-subtle text-text-primary placeholder-text-secondary px-3 py-2 text-xs focus:outline-none focus:border-accent transition-colors"
                                      style={{ borderRadius: '6px', fontFamily: 'Inter' }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeLink(setter, draft.id, link.id)}
                                      className="flex-shrink-0 text-text-secondary hover:text-danger transition-colors p-1"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {draft.links.length < MAX_LINKS ? (
                              <button
                                type="button"
                                onClick={() => addLink(setter, draft.id)}
                                className="flex items-center gap-1.5 text-text-secondary hover:text-accent transition-colors text-xs"
                                style={{ fontFamily: 'Inter' }}
                              >
                                <Plus size={12} />
                                Add link
                              </button>
                            ) : (
                              <p
                                className="text-text-secondary text-xs"
                                style={{ opacity: 0.5, fontFamily: 'Inter' }}
                              >
                                Maximum {MAX_LINKS} links per goal
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!atMax ? (
                <button
                  type="button"
                  onClick={() => addDraft(setter)}
                  className="flex items-center gap-1.5 mt-3 text-text-secondary hover:text-accent transition-colors text-xs"
                  style={{ fontFamily: 'Inter' }}
                >
                  <Plus size={13} />
                  Add goal
                </button>
              ) : (
                <p
                  className="mt-3 text-text-secondary text-xs"
                  style={{ opacity: 0.5, fontFamily: 'Inter' }}
                >
                  Maximum {MAX_GOALS} goals reached
                </p>
              )}
            </div>
          );
        })}

        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-accent text-background font-semibold px-6 py-3 text-sm transition-all hover:brightness-110 hover:scale-[1.01] mb-12"
          style={{ borderRadius: '6px', fontFamily: 'Inter' }}
        >
          <Save size={15} />
          Save Goals
        </button>

        <div className="border-t border-border-subtle mb-8" />

        <div>
          <div className="flex items-center gap-2 text-danger text-xs mb-4">
            <span style={{ fontFamily: 'JetBrains Mono', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              ⚠ Reset weekly goal progress
            </span>
          </div>
          <p className="text-text-secondary text-sm mb-4">
            Marks all weekly goals as incomplete without removing them.
          </p>
          <button
            onClick={handleResetWeekly}
            className="flex items-center gap-2 border border-border-subtle text-text-secondary px-5 py-2.5 text-sm transition-all hover:border-danger hover:text-danger"
            style={{ borderRadius: '6px', fontFamily: 'Inter' }}
          >
            <RotateCcw size={14} />
            Reset weekly progress
          </button>
        </div>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 bg-surface border border-border-subtle text-text-primary px-4 py-3 text-sm"
          style={{ borderRadius: '6px', fontFamily: 'Inter' }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
