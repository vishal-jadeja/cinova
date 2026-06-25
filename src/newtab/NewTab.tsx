import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ExternalLink, Info, Pencil, Plus, Search, X } from 'lucide-react';
import { Goal, GoalStore } from '../types';
import { DEFAULT_STORE, getStore, setStore } from '../utils/storage';

const MAX_GOALS = 10;
const BG_IMG = 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function todayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function daysLeftThisWeek(): number {
  return 6 - todayIndex();
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function BgBlur({ opacity = 0.28 }: { opacity?: number }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <img
        src={BG_IMG}
        alt=""
        style={{
          width: '100%', height: '100%', objectFit: 'cover',
          filter: 'blur(64px) saturate(0.55)',
          opacity,
          transform: 'scale(1.12)',
        }}
      />
    </div>
  );
}

function SectionLabel({ children, mb = 12 }: { children: React.ReactNode; mb?: number }) {
  return (
    <p style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '10px',
      color: '#5A6080',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      margin: 0,
      marginBottom: `${mb}px`,
    }}>
      {children}
    </p>
  );
}

// Circular badge — matches design exactly
function GoalIcon({ completed, size }: { completed: boolean; size: number }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      flexShrink: 0,
      background: completed ? '#4CAF82' : 'transparent',
      border: completed ? '1.5px solid #4CAF82' : '1.5px solid #5A6080',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size <= 12 ? '8px' : '9px',
      color: '#0C0E14',
      fontWeight: 700,
      lineHeight: 1,
      transition: 'background 200ms, border-color 200ms',
    }}>
      {completed ? '✓' : ''}
    </div>
  );
}

// ─── WeekErosionBar ───────────────────────────────────────────────────────────

function WeekErosionBar() {
  const current = todayIndex();
  const left = daysLeftThisWeek();

  return (
    <div style={{ width: '100%', marginBottom: '40px' }}>
      <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
        {DAYS.map((day, i) => {
          const isPast = i < current;
          const isToday = i === current;
          const fill = isPast || isToday ? '#E8A838' : '#1E2130';
          const labelColor = isPast ? '#E8EAF0' : isToday ? '#E8A838' : '#5A6080';

          return (
            <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {/* Bar: two equal halves — right half pulses on today */}
              <div style={{ width: '100%', height: '4px', display: 'flex', overflow: 'hidden', borderRadius: '2px' }}>
                <div style={{ flex: 1, background: fill }} />
                <div style={{
                  flex: 1,
                  background: fill,
                  animation: isToday ? 'pulseAmber 2s ease-in-out infinite' : 'none',
                }} />
              </div>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                color: labelColor,
                letterSpacing: '0.1em',
                lineHeight: 1,
              }}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        color: '#5A6080',
        letterSpacing: '0.12em',
        textAlign: 'center',
        textTransform: 'uppercase',
        margin: 0,
      }}>
        {left === 0 ? 'last day of the week' : `${left} day${left !== 1 ? 's' : ''} left this week`}
      </p>
    </div>
  );
}

// ─── GoalItem ─────────────────────────────────────────────────────────────────

interface GoalItemProps {
  goal: Goal;
  onToggle?: () => void;
  compact?: boolean;
  alwaysExpanded?: boolean;
}

function GoalItem({ goal, onToggle, compact, alwaysExpanded }: GoalItemProps) {
  const [showDetail, setShowDetail] = useState(false);
  const hasDetail = !!(goal.description || (goal.links && goal.links.length > 0));
  const detailVisible = alwaysExpanded ? hasDetail : showDetail;
  const iconSize = compact ? 12 : 15;

  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: compact ? '6px 0' : '10px 0',
        borderBottom: '1px solid #1E2130',
        cursor: onToggle ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'opacity 150ms',
      }}
      onMouseEnter={(e) => { if (onToggle) e.currentTarget.style.opacity = '0.7'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '8px' : '10px' }}>
        <GoalIcon completed={goal.completed} size={iconSize} />
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: compact ? '12px' : '14px',
          color: goal.completed ? '#5A6080' : '#E8EAF0',
          textDecoration: goal.completed ? 'line-through' : 'none',
          transition: 'color 200ms, text-decoration 200ms',
          lineHeight: compact ? 1.3 : 1.4,
          flex: 1,
          minWidth: 0,
          ...(compact ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}),
        }}>
          {goal.text}
        </span>
        {hasDetail && !alwaysExpanded && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowDetail((s) => !s); }}
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: showDetail ? '#E8A838' : '#5A6080',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 150ms',
            }}
            title={showDetail ? 'Hide details' : 'Show details'}
          >
            <Info size={compact ? 11 : 12} />
          </button>
        )}
      </div>

      {detailVisible && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginLeft: compact ? '20px' : '25px',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {goal.description && (
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              color: '#5A6080',
              lineHeight: 1.55,
              margin: 0,
            }}>
              {goal.description}
            </p>
          )}
          {goal.links && goal.links.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {goal.links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    fontSize: '12px', color: '#E8A838',
                    textDecoration: 'none',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
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

  const inputBase: React.CSSProperties = {
    flex: 1,
    background: '#13161F',
    border: '1px solid #1E2130',
    color: '#E8EAF0',
    fontSize: '14px',
    padding: '11px 14px',
    borderRadius: '4px',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 150ms',
  };

  const sections = [
    {
      label: 'Weekly Goals', required: true,
      values: weekly, setter: setWeekly,
      ph: (i: number) => i === 0 ? 'e.g. Ship the v1 prototype' : `Weekly goal ${i + 1}`,
    },
    {
      label: 'Monthly Goals', required: false,
      values: monthly, setter: setMonthly,
      ph: (i: number) => i === 0 ? 'e.g. Complete the design system' : `Monthly goal ${i + 1}`,
    },
    {
      label: 'Yearly Goals', required: false,
      values: yearly, setter: setYearly,
      ph: (i: number) => i === 0 ? 'e.g. Build and launch Cinova' : `Yearly goal ${i + 1}`,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0C0E14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', position: 'relative', overflow: 'hidden' }}>
      <BgBlur opacity={0.18} />
      <div style={{ width: '100%', maxWidth: '520px', padding: '48px 0', position: 'relative', zIndex: 1 }}>

        <div style={{ marginBottom: '48px' }}>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '32px', fontWeight: 700, color: '#E8EAF0', letterSpacing: '-0.025em', margin: '0 0 10px' }}>Cinova</h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#5A6080', lineHeight: 1.55, margin: 0 }}>Set your goals once. Face them every tab.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {sections.map(({ label, required, values, setter, ph }) => {
            const atMax = values.length >= MAX_GOALS;
            return (
              <div key={label} style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <SectionLabel mb={0}>{label}</SectionLabel>
                  {required && (
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '9px', color: '#E8A838',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      border: '1px solid rgba(232,168,56,0.3)',
                      padding: '2px 6px', borderRadius: '3px',
                    }}>
                      required
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {values.map((val, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => updateAt(setter, i, e.target.value)}
                        placeholder={ph(i)}
                        style={inputBase}
                        onFocus={(e) => (e.currentTarget.style.borderColor = '#E8A838')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = '#1E2130')}
                      />
                      {values.length > 1 && (
                        <button type="button" onClick={() => removeGoal(setter, i)}
                          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#5A6080', padding: '4px', display: 'flex' }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!atMax && (
                  <button type="button" onClick={() => addGoal(setter)}
                    style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#5A6080', padding: 0, fontFamily: 'Inter, sans-serif', fontSize: '12px', transition: 'color 150ms' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#E8A838')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#5A6080')}>
                    <Plus size={13} /> Add goal
                  </button>
                )}
              </div>
            );
          })}

          {error && (
            <p style={{ color: '#E05A5A', fontSize: '13px', marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>{error}</p>
          )}

          <button type="submit"
            style={{ width: '100%', background: '#E8A838', color: '#0C0E14', border: 'none', padding: '15px 24px', fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', letterSpacing: '0.01em', transition: 'background 150ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#F2B540')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#E8A838')}>
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
  onToggleGoal: (category: 'weekly' | 'monthly' | 'yearly', id: string) => void;
  fading: boolean;
}

function Gate({ store, onAcknowledge, onToggleGoal, fading }: GateProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') e.preventDefault(); };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, []);

  const hasGoals = store.weekly.length > 0 || store.monthly.length > 0 || store.yearly.length > 0;

  return (
    <div style={{
      minHeight: '100vh', background: '#0C0E14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0 24px', position: 'relative', overflow: 'hidden',
      transition: 'opacity 200ms', opacity: fading ? 0 : 1,
    }}>
      <BgBlur opacity={0.28} />
      <div style={{ width: '100%', maxWidth: '520px', padding: '48px 30px', position: 'relative', zIndex: 1 }}>
        <WeekErosionBar />

        {!hasGoals ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: '#5A6080', fontSize: '14px', marginBottom: '16px', fontFamily: 'Inter, sans-serif' }}>No goals set yet.</p>
            <a href="#" onClick={(e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); }}
              style={{ color: '#E8A838', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
              Add your goals →
            </a>
          </div>
        ) : (
          <div style={{ marginBottom: '40px' }}>
            {store.weekly.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <SectionLabel>This Week</SectionLabel>
                {store.weekly.map((g) => (
                  <GoalItem key={g.id} goal={g} onToggle={() => onToggleGoal('weekly', g.id)} alwaysExpanded />
                ))}
              </div>
            )}
            {store.monthly.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <SectionLabel>This Month</SectionLabel>
                {store.monthly.map((g) => (
                  <GoalItem key={g.id} goal={g} onToggle={() => onToggleGoal('monthly', g.id)} alwaysExpanded />
                ))}
              </div>
            )}
            {store.yearly.length > 0 && (
              <div>
                <SectionLabel>This Year</SectionLabel>
                {store.yearly.map((g) => (
                  <GoalItem key={g.id} goal={g} onToggle={() => onToggleGoal('yearly', g.id)} alwaysExpanded />
                ))}
              </div>
            )}
          </div>
        )}

        <button onClick={onAcknowledge}
          style={{ width: '100%', background: '#E8A838', color: '#0C0E14', border: 'none', padding: '15px 24px', fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', letterSpacing: '0.01em', transition: 'background 150ms' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F2B540')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#E8A838')}>
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
  const [searchFocused, setSearchFocused] = useState(false);

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

  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dateStr = `${DAY_NAMES[now.getDay()]}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}`;

  return (
    <div style={{
      minHeight: '100vh', background: '#0C0E14',
      display: 'flex',
      transition: 'opacity 150ms', opacity: visible ? 1 : 0,
      position: 'relative', overflow: 'hidden',
    }}>
      <BgBlur opacity={0.28} />

      {/* Sidebar */}
      <aside style={{
        width: '240px', flexShrink: 0,
        background: '#13161F',
        borderRight: '1px solid #1E2130',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative', zIndex: 1,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid #1E2130',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: '#E8EAF0', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            CINOVA
          </span>
          <button onClick={() => chrome.runtime.openOptionsPage()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5A6080', padding: '2px', display: 'flex', alignItems: 'center', opacity: 0.5, transition: 'opacity 150ms' }}
            title="Edit goals"
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}>
            <Pencil size={13} />
          </button>
        </div>

        {/* Goal lists */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {[
            { key: 'weekly' as const, label: 'Weekly' },
            { key: 'monthly' as const, label: 'Monthly' },
            { key: 'yearly' as const, label: 'Yearly' },
          ].map(({ key, label }) => {
            const goals = store[key];
            if (goals.length === 0) return null;
            return (
              <div key={key} style={{ padding: '0 20px', marginBottom: '20px' }}>
                <SectionLabel mb={8}>{label}</SectionLabel>
                {goals.map((g) => (
                  <GoalItem key={g.id} goal={g} onToggle={() => onToggleGoal(key, g.id)} compact />
                ))}
              </div>
            );
          })}

          {store.weekly.length === 0 && store.monthly.length === 0 && store.yearly.length === 0 && (
            <div style={{ padding: '0 20px', color: '#5A6080', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}>
              <p style={{ marginBottom: '8px', marginTop: 0 }}>No goals set.</p>
              <button onClick={() => chrome.runtime.openOptionsPage()}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E8A838', padding: 0, fontFamily: 'Inter, sans-serif', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Add goals <ExternalLink size={11} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '460px', padding: '0 40px' }}>
          {/* Clock */}
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '72px', fontWeight: 700, color: '#E8EAF0', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: '10px' }}>
            {`${h}:${m}`}
          </div>
          {/* Date */}
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#5A6080', marginBottom: '44px', letterSpacing: '0.01em' }}>
            {dateStr}
          </div>
          {/* Search */}
          <form onSubmit={handleSearch}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#13161F',
              border: `1px solid ${searchFocused ? '#E8A838' : '#1E2130'}`,
              borderRadius: '6px',
              padding: '12px 16px',
              transition: 'border-color 150ms',
            }}>
              <Search size={16} style={{ flexShrink: 0, color: '#5A6080' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Google..."
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#E8EAF0', padding: 0 }}
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

type View = 'loading' | 'onboarding' | 'gate' | 'dashboard';

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
      if (!s.onboardingComplete) { setView('onboarding'); return; }
      const todayStr = new Date().toISOString().split('T')[0];
      const acked = s.acknowledgedToday && s.lastAcknowledgedDate === todayStr;
      if (acked) { setView('dashboard'); setDashVisible(true); }
      else setView('gate');
    });
  }, []);

  const handleAcknowledge = useCallback(async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newStore: GoalStore = { ...store, acknowledgedToday: true, lastAcknowledgedDate: todayStr };
    await setStore(newStore);
    setStore_(newStore);
    setGateFading(true);
    setTimeout(() => {
      setView('dashboard');
      requestAnimationFrame(() => requestAnimationFrame(() => setDashVisible(true)));
    }, 200);
  }, [store]);

  const handleToggleGoal = useCallback(
    async (category: 'weekly' | 'monthly' | 'yearly', id: string) => {
      const newStore: GoalStore = {
        ...store,
        [category]: store[category].map((g) => g.id === id ? { ...g, completed: !g.completed } : g),
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

  if (view === 'loading') return <div style={{ minHeight: '100vh', background: '#0C0E14' }} />;

  if (view === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  if (view === 'gate') {
    return (
      <Gate
        store={store}
        onAcknowledge={handleAcknowledge}
        onToggleGoal={handleToggleGoal}
        fading={gateFading}
      />
    );
  }

  return <Dashboard store={store} onToggleGoal={handleToggleGoal} visible={dashVisible} />;
}
