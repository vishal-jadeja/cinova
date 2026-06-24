import React, { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { Goal, GoalStore } from '../types';
import { getStore, setStore } from '../utils/storage';

const CATEGORIES = [
  { key: 'weekly' as const, label: 'WEEKLY GOALS', note: 'resets every Monday' },
  { key: 'monthly' as const, label: 'MONTHLY GOALS', note: '' },
  { key: 'yearly' as const, label: 'YEARLY GOALS', note: '' },
];

function goalTextsFromStore(goals: Goal[]): [string, string, string] {
  return [goals[0]?.text ?? '', goals[1]?.text ?? '', goals[2]?.text ?? ''];
}

export default function Options() {
  const [store, setLocalStore] = useState<GoalStore | null>(null);
  const [weekly, setWeekly] = useState<[string, string, string]>(['', '', '']);
  const [monthly, setMonthly] = useState<[string, string, string]>(['', '', '']);
  const [yearly, setYearly] = useState<[string, string, string]>(['', '', '']);
  const [toast, setToast] = useState('');

  useEffect(() => {
    getStore().then((s) => {
      setLocalStore(s);
      setWeekly(goalTextsFromStore(s.weekly));
      setMonthly(goalTextsFromStore(s.monthly));
      setYearly(goalTextsFromStore(s.yearly));
    });
  }, []);

  function buildGoals(texts: [string, string, string], existing: Goal[]): Goal[] {
    return texts
      .map((text, i) => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        const existingGoal = existing.find((g) => g.text === trimmed);
        return {
          id: existingGoal?.id ?? crypto.randomUUID(),
          text: trimmed,
          completed: existingGoal?.completed ?? false,
        };
      })
      .filter(Boolean) as Goal[];
  }

  async function handleSave() {
    if (!store) return;
    const newStore: GoalStore = {
      ...store,
      weekly: buildGoals(weekly, store.weekly),
      monthly: buildGoals(monthly, store.monthly),
      yearly: buildGoals(yearly, store.yearly),
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
          const values = key === 'weekly' ? weekly : key === 'monthly' ? monthly : yearly;
          const setter =
            key === 'weekly' ? setWeekly : key === 'monthly' ? setMonthly : setYearly;

          return (
            <div key={key} className="mb-10">
              <div className="flex items-baseline gap-3 mb-4">
                <span
                  className="text-text-secondary text-xs font-mono tracking-widest uppercase"
                  style={{ fontFamily: 'JetBrains Mono', letterSpacing: '0.15em' }}
                >
                  {label}
                </span>
                {note && (
                  <span className="text-text-secondary text-xs" style={{ opacity: 0.5 }}>
                    ({note})
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {([0, 1, 2] as const).map((i) => (
                  <input
                    key={i}
                    type="text"
                    value={values[i]}
                    onChange={(e) => {
                      const next = [...values] as [string, string, string];
                      next[i] = e.target.value;
                      setter(next);
                    }}
                    placeholder={`Goal ${i + 1}`}
                    className="w-full bg-surface border border-border-subtle text-text-primary placeholder-text-secondary px-4 py-3 text-sm rounded focus:outline-none focus:border-accent transition-colors"
                    style={{ borderRadius: '6px', fontFamily: 'Inter' }}
                  />
                ))}
              </div>
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
          <div className="flex items-center gap-2 text-danger text-xs font-mono tracking-widest uppercase mb-4">
            <span style={{ fontFamily: 'JetBrains Mono', letterSpacing: '0.15em' }}>
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
