import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Info,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';

const MAX_GOALS = 10;
import { Goal, GoalStore } from '../types';
import { DEFAULT_STORE, getStore, setStore } from '../utils/storage';

type View = 'loading' | 'onboarding' | 'gate' | 'dashboard';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// JS getDay(): 0=Sun, 1=Mon … 6=Sat  →  map to our 0-based Mon index
function todayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function daysLeftThisWeek(): number {
  return 6 - todayIndex();
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function WeekErosionBar() {
  const current = todayIndex();
  const left = daysLeftThisWeek();

  return (
    <div className="w-full mb-8">
      <div className="flex gap-1 mb-2">
        {DAYS.map((day, i) => {
          const isPast = i < current;
          const isToday = i === current;
          const isFuture = i > current;

          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <span
                className="text-text-secondary text-xs"
                style={{ fontFamily: 'JetBrains Mono', fontSize: '9px', letterSpacing: '0.1em' }}
              >
                {day.toUpperCase()}
              </span>
              <div
                className="w-full h-1.5 relative overflow-hidden"
                style={{ borderRadius: '2px', background: '#1E2130' }}
              >
                {isPast && (
                  <div className="absolute inset-0 bg-accent" />
                )}
                {isToday && (
                  <>
                    <div className="absolute top-0 left-0 bottom-0 bg-accent" style={{ width: '50%' }} />
                    <div
                      className="absolute top-0 left-0 bottom-0 bg-accent animate-pulse"
                      style={{ width: '50%', opacity: 0.6 }}
                    />
                  </>
                )}
                {isFuture && null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-text-secondary text-xs text-right" style={{ fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' }}>
        {left === 0 ? 'last day of the week' : `${left} day${left !== 1 ? 's' : ''} left this week`}
      </p>
    </div>
  );
}

interface GoalItemProps {
  goal: Goal;
  onClick?: () => void;
  compact?: boolean;
  alwaysExpanded?: boolean;
}

function GoalItem({ goal, onClick, compact, alwaysExpanded }: GoalItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  const hasDetail = !!(goal.description || (goal.links && goal.links.length > 0));
  const detailVisible = alwaysExpanded ? hasDetail : showDetail;
  const iconSize = compact ? 13 : 15;

  return (
    <div className={compact ? 'py-1' : 'py-1.5'}>
      <div className="flex items-start gap-2">
        <button
          onClick={onClick}
          disabled={!onClick}
          className={`flex-shrink-0 mt-0.5 transition-opacity ${
            onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
          }`}
        >
          {goal.completed ? (
            <CheckCircle2 size={iconSize} className="text-success" />
          ) : (
            <Circle size={iconSize} className="text-text-secondary" />
          )}
        </button>

        <span
          className={`flex-1 text-sm leading-snug transition-all duration-200 ${
            goal.completed ? 'line-through text-text-secondary' : 'text-text-primary'
          }`}
          style={{ fontFamily: 'Inter' }}
        >
          {goal.text}
        </span>

        {hasDetail && !alwaysExpanded && (
          <button
            onClick={() => setShowDetail((s) => !s)}
            className={`flex-shrink-0 mt-0.5 transition-colors ${
              showDetail ? 'text-accent' : 'text-text-secondary hover:text-accent'
            }`}
            title={showDetail ? 'Hide details' : 'Show details'}
          >
            <Info size={compact ? 11 : 12} />
          </button>
        )}
      </div>

      {detailVisible && (
        <div
          className="mt-1.5 flex flex-col gap-1.5"
          style={{ marginLeft: compact ? '19px' : '23px' }}
        >
          {goal.description && (
            <p
              className="text-xs text-text-secondary leading-relaxed"
              style={{ fontFamily: 'Inter' }}
            >
              {goal.description}
            </p>
          )}
          {goal.links && goal.links.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {goal.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-accent hover:underline w-fit"
                  style={{ fontFamily: 'Inter' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={compact ? 9 : 10} />
                  <span>{link.label || link.url}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
}

function SectionLabel({ children }: SectionLabelProps) {
  return (
    <p
      className="text-text-secondary mb-3"
      style={{
        fontFamily: 'JetBrains Mono',
        fontSize: '10px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </p>
  );
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

interface OnboardingProps {
  onComplete: (store: GoalStore) => void;
}

function Onboarding({ onComplete }: OnboardingProps) {
  const [weekly, setWeekly] = useState<string[]>(['']);
  const [monthly, setMonthly] = useState<string[]>(['']);
  const [yearly, setYearly] = useState<string[]>(['']);
  const [error, setError] = useState('');

  function buildGoals(texts: string[]): Goal[] {
    return texts
      .filter((t) => t.trim())
      .map((text) => ({ id: crypto.randomUUID(), text: text.trim(), completed: false }));
  }

  function updateAt(setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) {
    setter((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function addGoal(setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter((prev) => [...prev, '']);
  }

  function removeGoal(setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) {
    setter((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length === 0 ? [''] : next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weekly.some((t) => t.trim())) {
      setError('Add at least one weekly goal to get started.');
      return;
    }
    const newStore: GoalStore = {
      ...DEFAULT_STORE,
      weekly: buildGoals(weekly),
      monthly: buildGoals(monthly),
      yearly: buildGoals(yearly),
      onboardingComplete: true,
      acknowledgedToday: false,
      lastWeeklyReset: new Date().toISOString(),
    };
    await setStore(newStore);
    onComplete(newStore);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-[520px]">
        <div className="mb-10">
          <h1
            className="text-3xl font-bold text-text-primary mb-2"
            style={{ fontFamily: 'Inter', letterSpacing: '0.01em' }}
          >
            Cinova
          </h1>
          <p className="text-text-secondary text-sm">
            Set your goals once. Face them every tab.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Weekly Goals', note: 'resets every Monday', values: weekly, setter: setWeekly, required: true },
            { label: 'Monthly Goals', note: '', values: monthly, setter: setMonthly, required: false },
            { label: 'Yearly Goals', note: '', values: yearly, setter: setYearly, required: false },
          ].map(({ label, note, values, setter, required }) => {
            const atMax = values.length >= MAX_GOALS;
            return (
              <div key={label} className="mb-8">
                <div className="flex items-baseline gap-2 mb-3">
                  <SectionLabel>{label}</SectionLabel>
                  {note && (
                    <span className="text-text-secondary text-xs" style={{ opacity: 0.5 }}>
                      {note}
                    </span>
                  )}
                  {required && (
                    <span className="text-accent text-xs ml-auto">required</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {values.map((val, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateAt(setter, i, e.target.value)}
                        placeholder={`Goal ${i + 1}${i === 0 && required ? ' *' : ''}`}
                        className="flex-1 bg-surface border border-border-subtle text-text-primary placeholder-text-secondary px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
                        style={{ borderRadius: '6px', fontFamily: 'Inter' }}
                      />
                      {values.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeGoal(setter, i)}
                          className="flex-shrink-0 text-text-secondary hover:text-danger transition-colors p-1"
                          title="Remove goal"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!atMax ? (
                  <button
                    type="button"
                    onClick={() => addGoal(setter)}
                    className="flex items-center gap-1.5 mt-3 text-text-secondary hover:text-accent transition-colors text-xs"
                    style={{ fontFamily: 'Inter' }}
                  >
                    <Plus size={13} />
                    Add goal
                  </button>
                ) : (
                  <p className="mt-3 text-text-secondary text-xs" style={{ opacity: 0.5, fontFamily: 'Inter' }}>
                    Maximum {MAX_GOALS} goals reached
                  </p>
                )}
              </div>
            );
          })}

          {error && (
            <p className="text-danger text-sm mb-4">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-accent text-background font-semibold py-4 text-sm tracking-wide transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]"
            style={{ borderRadius: '6px', fontFamily: 'Inter', letterSpacing: '0.04em' }}
          >
            Set my goals →
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Gate ────────────────────────────────────────────────────────────────────

interface GateProps {
  store: GoalStore;
  onAcknowledge: () => void;
  fading: boolean;
}

function Gate({ store, onAcknowledge, fading }: GateProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const hasGoals =
    store.weekly.length > 0 || store.monthly.length > 0 || store.yearly.length > 0;

  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center px-6 transition-opacity duration-200"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <div className="w-full max-w-[520px]">
        <WeekErosionBar />

        {!hasGoals ? (
          <div className="text-center py-8">
            <p className="text-text-secondary text-sm mb-4">No goals set yet.</p>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                chrome.runtime.openOptionsPage();
              }}
              className="text-accent text-sm underline"
            >
              Add your goals →
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-8 mb-10">
            {store.weekly.length > 0 && (
              <div>
                <SectionLabel>This Week</SectionLabel>
                {store.weekly.map((g) => (
                  <GoalItem key={g.id} goal={g} alwaysExpanded />
                ))}
              </div>
            )}
            {store.monthly.length > 0 && (
              <div>
                <SectionLabel>This Month</SectionLabel>
                {store.monthly.map((g) => (
                  <GoalItem key={g.id} goal={g} alwaysExpanded />
                ))}
              </div>
            )}
            {store.yearly.length > 0 && (
              <div>
                <SectionLabel>This Year</SectionLabel>
                {store.yearly.map((g) => (
                  <GoalItem key={g.id} goal={g} alwaysExpanded />
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onAcknowledge}
          className="w-full bg-accent text-background font-semibold py-4 text-sm tracking-wide transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.99]"
          style={{ borderRadius: '6px', fontFamily: 'Inter', letterSpacing: '0.04em' }}
        >
          I see my goals — start browsing →
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

interface DashboardProps {
  store: GoalStore;
  onToggleGoal: (category: 'weekly' | 'monthly' | 'yearly', id: string) => void;
  visible: boolean;
}

function Dashboard({ store, onToggleGoal, visible }: DashboardProps) {
  const [now, setNow] = useState(new Date());
  const [query, setQuery] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    }
  }

  return (
    <div
      className="min-h-screen bg-background flex transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col py-6 px-5 overflow-y-auto"
        style={{
          width: '240px',
          background: '#13161F',
          borderRight: '1px solid #1E2130',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <span
            className="text-text-primary font-bold text-sm"
            style={{ fontFamily: 'Inter', letterSpacing: '0.04em' }}
          >
            CINOVA
          </span>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="text-text-secondary hover:text-accent transition-colors p-1"
            title="Edit goals"
          >
            <Pencil size={13} />
          </button>
        </div>

        {[
          { key: 'weekly' as const, label: 'Weekly' },
          { key: 'monthly' as const, label: 'Monthly' },
          { key: 'yearly' as const, label: 'Yearly' },
        ].map(({ key, label }) => {
          const goals = store[key];
          if (goals.length === 0) return null;
          return (
            <div key={key} className="mb-6">
              <SectionLabel>{label}</SectionLabel>
              {goals.map((g) => (
                <GoalItem
                  key={g.id}
                  goal={g}
                  onClick={() => onToggleGoal(key, g.id)}
                  compact
                />
              ))}
            </div>
          );
        })}

        {store.weekly.length === 0 && store.monthly.length === 0 && store.yearly.length === 0 && (
          <div className="text-text-secondary text-xs mt-2">
            <p className="mb-2">No goals set.</p>
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="text-accent hover:underline flex items-center gap-1"
            >
              Add goals <ExternalLink size={11} />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-lg flex flex-col items-center gap-8">
          <div className="text-center">
            <div
              className="text-6xl font-bold text-text-primary mb-1"
              style={{ fontFamily: 'Inter', fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {formatTime(now)}
            </div>
            <div
              className="text-text-secondary text-sm"
              style={{ fontFamily: 'Inter' }}
            >
              {formatDate(now)}
            </div>
          </div>

          <form onSubmit={handleSearch} className="w-full">
            <div
              className="flex items-center gap-3 bg-surface border border-border-subtle px-4 py-3 focus-within:border-accent transition-colors"
              style={{ borderRadius: '6px' }}
            >
              <Search size={16} className="text-text-secondary flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Google..."
                className="flex-1 bg-transparent text-text-primary placeholder-text-secondary text-sm focus:outline-none"
                style={{ fontFamily: 'Inter' }}
                autoFocus
              />
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function NewTab() {
  const [view, setView] = useState<View>('loading');
  const [store, setStore_] = useState<GoalStore>(DEFAULT_STORE);
  const [gateFading, setGateFading] = useState(false);
  const [dashVisible, setDashVisible] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    getStore().then((s) => {
      setStore_(s);
      if (!s.onboardingComplete) {
        setView('onboarding');
        return;
      }
      const todayStr = new Date().toISOString().split('T')[0];
      const acked = s.acknowledgedToday && s.lastAcknowledgedDate === todayStr;
      if (acked) {
        setView('dashboard');
        setDashVisible(true);
      } else {
        setView('gate');
      }
    });
  }, []);

  const handleAcknowledge = useCallback(async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newStore: GoalStore = {
      ...store,
      acknowledgedToday: true,
      lastAcknowledgedDate: todayStr,
    };
    await setStore(newStore);
    setStore_(newStore);

    // fade gate out, then show dashboard
    setGateFading(true);
    setTimeout(() => {
      setView('dashboard');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setDashVisible(true));
      });
    }, 200);
  }, [store]);

  const handleToggleGoal = useCallback(
    async (category: 'weekly' | 'monthly' | 'yearly', id: string) => {
      const newStore: GoalStore = {
        ...store,
        [category]: store[category].map((g) =>
          g.id === id ? { ...g, completed: !g.completed } : g
        ),
      };
      setStore_(newStore);
      await setStore(newStore);
    },
    [store]
  );

  const handleOnboardingComplete = useCallback((newStore: GoalStore) => {
    setStore_(newStore);
    setView('gate');
  }, []);

  if (view === 'loading') {
    return <div className="min-h-screen bg-background" />;
  }

  if (view === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (view === 'gate') {
    return (
      <Gate
        store={store}
        onAcknowledge={handleAcknowledge}
        fading={gateFading}
      />
    );
  }

  return (
    <Dashboard
      store={store}
      onToggleGoal={handleToggleGoal}
      visible={dashVisible}
    />
  );
}
