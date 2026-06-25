import React, { useEffect, useState } from 'react';
import { Goal, GoalStore } from '../types';
import { getStore, setStore } from '../utils/storage';

const MAX_GOALS  = 10;
const FONT_SANS  = "'Space Grotesk', sans-serif";
const FONT_MONO  = "'Space Mono', monospace";
const BG_URL     = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80';

const T = {
  text:       '#e8e8e8',
  muted:      'rgba(232,232,232,0.36)',
  border:     'rgba(232,232,232,0.07)',
  border2:    'rgba(232,232,232,0.14)',
  surface:    'rgba(18,18,18,0.62)',
  accent:     '#e8e8e8',
  accentText: '#0d0d0d',
};

interface GoalDraft {
  id: string;
  text: string;
  completed: boolean;
  description: string;
}

type Setter = React.Dispatch<React.SetStateAction<GoalDraft[]>>;

function emptyDraft(): GoalDraft {
  return { id: crypto.randomUUID(), text: '', completed: false, description: '' };
}

function draftsFromGoals(goals: Goal[]): GoalDraft[] {
  const r = goals.map(g => ({ id: g.id, text: g.text, completed: g.completed, description: g.description ?? '' }));
  return r.length > 0 ? r : [emptyDraft()];
}

function buildGoals(drafts: GoalDraft[]): Goal[] {
  return drafts.filter(d => d.text.trim()).map(d => ({
    id: d.id, text: d.text.trim(), completed: d.completed,
    ...(d.description.trim() ? { description: d.description.trim() } : {}),
  }));
}

export default function Options() {
  const [store,   setLocalStore] = useState<GoalStore | null>(null);
  const [weekly,  setWeekly]     = useState<GoalDraft[]>([emptyDraft()]);
  const [monthly, setMonthly]    = useState<GoalDraft[]>([emptyDraft()]);
  const [yearly,  setYearly]     = useState<GoalDraft[]>([emptyDraft()]);
  const [expanded, setExpanded]  = useState<Set<string>>(new Set());
  const [savedVisible, setSavedVisible] = useState(false);

  useEffect(() => {
    getStore().then(s => {
      setLocalStore(s);
      const w = draftsFromGoals(s.weekly);
      const mo = draftsFromGoals(s.monthly);
      const y  = draftsFromGoals(s.yearly);
      setWeekly(w); setMonthly(mo); setYearly(y);
      setExpanded(new Set([...w, ...mo, ...y].filter(d => d.description.trim()).map(d => d.id)));
    });
  }, []);

  function toggleExpanded(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function updateDraft(setter: Setter, id: string, patch: Partial<Omit<GoalDraft, 'id'>>) {
    setter(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  function addDraft(setter: Setter) {
    const d = emptyDraft();
    setter(prev => [...prev, d]);
    setExpanded(prev => new Set([...prev, d.id]));
  }

  function removeDraft(setter: Setter, id: string) {
    setter(prev => { const n = prev.filter(d => d.id !== id); return n.length === 0 ? [emptyDraft()] : n; });
    setExpanded(prev => { const n = new Set(prev); n.delete(id); return n; });
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
    setSavedVisible(true);
    // close options tab → returns to new tab
    setTimeout(() => window.close(), 700);
  }

  async function handleResetWeekly() {
    if (!store) return;
    const newStore: GoalStore = { ...store, weekly: store.weekly.map(g => ({ ...g, completed: false })) };
    await setStore(newStore);
    setLocalStore(newStore);
  }

  if (!store) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '16px', height: '16px', border: '1.5px solid #e8e8e8', borderTopColor: 'transparent', borderRadius: '50%' }} />
      </div>
    );
  }

  const cols = [
    { key: 'weekly'  as const, label: 'This Week',  values: weekly,  setter: setWeekly  },
    { key: 'monthly' as const, label: 'This Month', values: monthly, setter: setMonthly },
    { key: 'yearly'  as const, label: 'This Year',  values: yearly,  setter: setYearly  },
  ];

  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: T.text, fontFamily: FONT_SANS, overflowY: 'auto' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '-40px', backgroundImage: `url('${BG_URL}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(34px)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,8,0.76)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, padding: '48px 64px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '52px' }}>
          <div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.26em', fontWeight: 700, color: T.muted, marginBottom: '10px', fontFamily: FONT_MONO }}>
              Cinova · Settings
            </div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>Goals</h1>
          </div>
          <button onClick={() => window.close()}
            style={{ background: 'none', border: `1px solid ${T.border2}`, padding: '8px 16px', fontSize: '11px', color: T.muted, letterSpacing: '0.06em', borderRadius: '2px', fontWeight: 500, cursor: 'pointer' }}>
            ← Back
          </button>
        </div>

        {/* 3-column inputs */}
        <div style={{ display: 'flex', marginBottom: '48px' }}>
          {cols.map(({ key, label, values, setter }, colIdx) => (
            <React.Fragment key={key}>
              {colIdx > 0 && <div style={{ width: '1px', background: T.border, flexShrink: 0 }} />}
              <div style={{ flex: 1, padding: colIdx === 0 ? '0 52px 0 0' : colIdx === 2 ? '0 0 0 52px' : '0 52px' }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, color: T.muted, marginBottom: '20px' }}>
                  {label}
                </div>

                {values.map((draft, i) => {
                  const isExp    = expanded.has(draft.id);
                  const hasNotes = draft.description.trim().length > 0;
                  return (
                    <div key={draft.id} style={{ marginBottom: '10px' }}>
                      {/* goal row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderBottom: `1px solid ${T.border2}` }}>
                        <input type="text" value={draft.text} placeholder={`Goal ${i + 1}`}
                          onChange={e => updateDraft(setter, draft.id, { text: e.target.value })}
                          style={{ flex: 1, background: 'none', border: 'none', padding: '11px 0', fontSize: '14px', color: T.text, letterSpacing: '0.01em', fontFamily: FONT_SANS }} />
                        {/* notes toggle */}
                        <button type="button" onClick={() => toggleExpanded(draft.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: hasNotes ? T.text : T.muted, fontSize: '10px', fontFamily: FONT_MONO, flexShrink: 0, lineHeight: 1 }}>
                          {isExp ? '▲' : '▼'}
                        </button>
                        {values.length > 1 && (
                          <button type="button" onClick={() => removeDraft(setter, draft.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: T.muted, fontSize: '16px', flexShrink: 0, lineHeight: 1 }}>×</button>
                        )}
                      </div>
                      {/* notes panel */}
                      {isExp && (
                        <div style={{ paddingTop: '8px' }}>
                          <textarea value={draft.description}
                            onChange={e => updateDraft(setter, draft.id, { description: e.target.value })}
                            placeholder="Notes, context, or paste links — URLs become clickable on your new tab"
                            rows={3} autoFocus
                            style={{ display: 'block', width: '100%', background: 'none', border: 'none', borderBottom: `1px solid ${T.border2}`, padding: '8px 0', fontSize: '13px', color: T.muted, letterSpacing: '0.01em', fontFamily: FONT_SANS, resize: 'vertical', lineHeight: 1.6 }} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {values.length < MAX_GOALS && (
                  <button type="button" onClick={() => addDraft(setter)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: '12px', letterSpacing: '0.06em', padding: '6px 0', fontFamily: FONT_SANS }}>
                    + Add goal
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        <div style={{ height: '1px', background: T.border, marginBottom: '28px' }} />

        {/* Save */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '52px' }}>
          <button onClick={handleSave}
            style={{ padding: '12px 28px', background: T.accent, color: T.accentText, border: 'none', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '2px', cursor: 'pointer', fontFamily: FONT_SANS }}>
            Save changes
          </button>
          <span style={{ fontSize: '12px', color: T.muted, opacity: savedVisible ? 1 : 0, transition: 'opacity 0.4s', letterSpacing: '0.06em' }}>
            ✓ Saved
          </span>
        </div>

        {/* Reset weekly */}
        <div style={{ padding: '22px 24px', border: `1px solid ${T.border}`, borderRadius: '2px', display: 'inline-flex', flexDirection: 'column', gap: '8px', minWidth: '340px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em' }}>Reset weekly progress</div>
          <div style={{ fontSize: '13px', color: T.muted, lineHeight: 1.55 }}>Unchecks all weekly goals without deleting them.</div>
          <button onClick={handleResetWeekly}
            style={{ marginTop: '4px', padding: '9px 18px', background: 'none', border: `1px solid ${T.border2}`, fontSize: '11px', fontWeight: 600, color: T.text, letterSpacing: '0.06em', borderRadius: '2px', alignSelf: 'flex-start', cursor: 'pointer', fontFamily: FONT_SANS }}>
            Reset weekly progress
          </button>
        </div>
      </div>
    </div>
  );
}
