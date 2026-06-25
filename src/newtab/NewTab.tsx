import React, { useEffect, useState } from 'react';
import { Goal, GoalStore } from '../types';
import { getStore, setStore } from '../utils/storage';

const T = {
  text:       '#e8e8e8',
  muted:      'rgba(232,232,232,0.36)',
  border:     'rgba(232,232,232,0.07)',
  border2:    'rgba(232,232,232,0.14)',
  surface:    'rgba(18,18,18,0.62)',
  accent:     '#e8e8e8',
  accentText: '#0d0d0d',
};
const FONT_SANS   = "'Space Grotesk', sans-serif";
const FONT_MONO   = "'Space Mono', monospace";
const BG_URL      = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80';
const DAY_NAMES   = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEK_LONG   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MAX_GOALS   = 10;

function todayIndex(): number {
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

// ─── Background ───────────────────────────────────────────────────────────────
function Background() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: '-40px', backgroundImage: `url('${BG_URL}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(34px)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,8,0.76)' }} />
    </div>
  );
}

// ─── Week Tracker ─────────────────────────────────────────────────────────────
function WeekTracker({ center = false }: { center?: boolean }) {
  const today    = todayIndex();
  const daysLeft = 6 - today;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: center ? 'center' : 'flex-end', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {DAY_NAMES.map((day, i) => {
          const isPast  = i < today;
          const isToday = i === today;
          const barColor = (isPast || isToday) ? '#E8A838' : T.border2;
          const lblColor = isPast ? T.text : isToday ? '#E8A838' : T.muted;
          return (
            <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', width: '30px' }}>
              <div style={{ width: '100%', height: '4px', borderRadius: '2px', display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, background: barColor }} />
                <div style={{ flex: 1, background: barColor, animation: isToday ? 'pulseAmber 2s ease-in-out infinite' : 'none' }} />
              </div>
              <span style={{ fontFamily: FONT_MONO, fontSize: '8px', color: lblColor, letterSpacing: '0.06em', lineHeight: 1, fontWeight: isToday ? 700 : 400 }}>
                {day}
              </span>
            </div>
          );
        })}
      </div>
      <span style={{ fontFamily: FONT_MONO, fontSize: '9px', color: T.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        {daysLeft === 0 ? 'Last day of the week' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left this week`}
      </span>
    </div>
  );
}

// ─── Linkify ─────────────────────────────────────────────────────────────────
function linkify(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /https?:\/\/[^\s]+/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const url = m[0];
    parts.push(<a key={m.index} href={url} target="_blank" rel="noopener noreferrer"
      style={{ color: '#E8A838', textDecoration: 'underline', textUnderlineOffset: '2px' }}
      onClick={e => e.stopPropagation()}>{url}</a>);
    last = m.index + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// ─── Checkbox ────────────────────────────────────────────────────────────────
function Checkbox({ checked }: { checked: boolean }) {
  return (
    <div style={{
      width: '16px', height: '16px', minWidth: '16px', marginTop: '1px',
      borderRadius: '50%',
      border: `1.5px solid ${checked ? 'transparent' : T.border2}`,
      background: checked ? T.text : 'transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s', flexShrink: 0,
    }}>
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3L3.5 5.5L8 1" stroke="#0d0d0d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ onComplete }: { onComplete: (patch: Partial<GoalStore>) => void }) {
  const [weekly,  setWeekly]  = useState(['', '', '']);
  const [monthly, setMonthly] = useState(['', '', '']);
  const [yearly,  setYearly]  = useState(['', '', '']);

  function upd(setter: React.Dispatch<React.SetStateAction<string[]>>, vals: string[], i: number, v: string) {
    const n = [...vals]; n[i] = v; setter(n);
  }
  function addSlot(setter: React.Dispatch<React.SetStateAction<string[]>>, vals: string[]) {
    if (vals.length < MAX_GOALS) setter([...vals, '']);
  }
  function remSlot(setter: React.Dispatch<React.SetStateAction<string[]>>, vals: string[], i: number) {
    const n = vals.filter((_, idx) => idx !== i);
    setter(n.length ? n : ['']);
  }
  function makeGoals(texts: string[]): Goal[] {
    return texts.filter(t => t.trim()).map(t => ({ id: crypto.randomUUID(), text: t.trim(), completed: false }));
  }

  const hasWeekly = weekly.some(t => t.trim());

  const cols = [
    { label: 'This Week',  note: 'Required', vals: weekly,  setter: setWeekly,  min: 1 },
    { label: 'This Month', note: 'Optional', vals: monthly, setter: setMonthly, min: 0 },
    { label: 'This Year',  note: 'Optional', vals: yearly,  setter: setYearly,  min: 0 },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', animation: 'fadeIn 0.22s ease', fontFamily: FONT_SANS, color: T.text, overflowY: 'auto' }}>
      <Background />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '840px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.38em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>Cinova</div>
          <div style={{ fontSize: '14px', color: T.muted }}>Set your goals once. Face them every day.</div>
        </div>

        <div style={{ display: 'flex', width: '100%', marginBottom: '40px' }}>
          {cols.map(({ label, note, vals, setter, min }, colIdx) => (
            <React.Fragment key={label}>
              {colIdx > 0 && <div style={{ width: '1px', background: T.border, flexShrink: 0, margin: '0 40px' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, color: T.muted, marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '11px', color: T.muted, opacity: 0.5, marginBottom: '20px', letterSpacing: '0.04em' }}>{note}</div>
                {vals.map((val, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', borderBottom: `1px solid ${T.border2}` }}>
                    <input type="text" value={val} placeholder={`Goal ${i + 1}`}
                      onChange={e => upd(setter, vals, i, e.target.value)}
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '10px 0', fontSize: '14px', color: T.text, letterSpacing: '0.01em', fontFamily: FONT_SANS }} />
                    {vals.length > min && (
                      <button type="button" onClick={() => remSlot(setter, vals, i)}
                        style={{ background: 'none', border: 'none', color: T.muted, fontSize: '16px', lineHeight: 1, padding: '0 2px', cursor: 'pointer', opacity: 0.5 }}>×</button>
                    )}
                  </div>
                ))}
                {vals.length < MAX_GOALS && (
                  <button type="button" onClick={() => addSlot(setter, vals)}
                    style={{ background: 'none', border: 'none', color: T.muted, fontSize: '12px', letterSpacing: '0.06em', padding: '6px 0', cursor: 'pointer', fontFamily: FONT_SANS, opacity: 0.7 }}>
                    + Add goal
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => { if (hasWeekly) onComplete({ weekly: makeGoals(weekly), monthly: makeGoals(monthly), yearly: makeGoals(yearly), onboardingComplete: true }); }}
            disabled={!hasWeekly}
            style={{ padding: '15px 60px', background: hasWeekly ? T.accent : T.border2, color: hasWeekly ? T.accentText : T.muted, border: 'none', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', borderRadius: '2px', cursor: hasWeekly ? 'pointer' : 'default', fontFamily: FONT_SANS }}>
            Set my goals
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function useTime() {
  const [t, setT] = useState(() => new Date());
  useEffect(() => { const iv = setInterval(() => setT(new Date()), 1000); return () => clearInterval(iv); }, []);
  return t;
}

function SidebarSection({ label, goals, onToggle }: { label: string; goals: Goal[]; onToggle: (id: string) => void }) {
  const visible = goals.filter(g => g.text.trim());
  if (visible.length === 0) return null;
  return (
    <div style={{ marginBottom: '26px' }}>
      <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700, color: T.muted, marginBottom: '12px' }}>{label}</div>
      {visible.map(g => (
        <div key={g.id} onClick={() => onToggle(g.id)}
          style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '5px 0', cursor: 'pointer' }}>
          <Checkbox checked={g.completed} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: '12.5px', lineHeight: 1.42, opacity: g.completed ? 0.3 : 1, textDecoration: g.completed ? 'line-through' : 'none', transition: 'opacity 0.15s' }}>
              {g.text}
            </span>
            {g.description && !g.completed && (
              <p style={{ margin: '4px 0 0', fontSize: '11.5px', color: 'rgba(232,232,232,0.65)', lineHeight: 1.55, wordBreak: 'break-word' }}>
                {linkify(g.description)}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ store, onToggleGoal }: {
  store: GoalStore;
  onToggleGoal: (cat: 'weekly' | 'monthly' | 'yearly', id: string) => void;
}) {
  const now     = useTime();
  const pad     = (n: number) => String(n).padStart(2, '0');
  const hm      = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const ss      = pad(now.getSeconds());
  const dateStr = `${WEEK_LONG[now.getDay()]}, ${MONTH_NAMES[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  const [search, setSearch] = useState('');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1, display: 'flex', flexDirection: 'column', color: T.text, fontFamily: FONT_SANS, animation: 'fadeIn 0.22s ease' }}>
      <Background />

      {/* Header strip */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '18px 56px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.36em', textTransform: 'uppercase', fontWeight: 700 }}>Cinova</div>
      </div>

      {/* Content row */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', minHeight: 0 }}>

        {/* Sidebar */}
        <div style={{ width: '256px', minWidth: '256px', display: 'flex', flexDirection: 'column', borderRight: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', minHeight: 0 }}>
            <SidebarSection label="This Week"  goals={store.weekly}  onToggle={id => onToggleGoal('weekly', id)} />
            <SidebarSection label="This Month" goals={store.monthly} onToggle={id => onToggleGoal('monthly', id)} />
            <SidebarSection label="This Year"  goals={store.yearly}  onToggle={id => onToggleGoal('yearly', id)} />
          </div>
          <div style={{ padding: '14px 24px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <button onClick={() => chrome.runtime.openOptionsPage()}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: '11px', letterSpacing: '0.08em', color: T.muted, fontWeight: 500, cursor: 'pointer', fontFamily: FONT_SANS }}>
              Settings
            </button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0', padding: '40px' }}>
          {/* WeekTracker — top-right of main area, outside header */}
          <div style={{ position: 'absolute', top: '24px', right: '40px' }}>
            <WeekTracker />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', userSelect: 'none' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: '92px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1 }}>{hm}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: '46px', fontWeight: 400, letterSpacing: '-0.02em', opacity: 0.32, paddingLeft: '4px' }}>:{ss}</span>
          </div>
          <div style={{ fontSize: '12px', letterSpacing: '0.14em', color: T.muted, textTransform: 'uppercase', fontWeight: 500, marginTop: '10px', marginBottom: '32px' }}>{dateStr}</div>
          <form onSubmit={e => { e.preventDefault(); const q = search.trim(); if (q) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`; }}
            style={{ width: '100%', maxWidth: '440px' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search Google"
              style={{ width: '100%', padding: '13px 18px', background: T.surface, border: `1px solid ${T.border2}`, fontSize: '14px', color: T.text, borderRadius: '2px', letterSpacing: '0.01em', fontFamily: FONT_SANS, outline: 'none' }} />
          </form>
        </div>

      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function NewTab() {
  const [store, setLocalStore] = useState<GoalStore | null>(null);
  useEffect(() => { getStore().then(setLocalStore); }, []);

  async function handleOnboardingComplete(patch: Partial<GoalStore>) {
    const newStore: GoalStore = { ...store!, ...patch };
    await setStore(newStore); setLocalStore(newStore);
  }
  async function handleToggleGoal(cat: 'weekly' | 'monthly' | 'yearly', id: string) {
    const newStore: GoalStore = { ...store!, [cat]: store![cat].map(g => g.id === id ? { ...g, completed: !g.completed } : g) };
    await setStore(newStore); setLocalStore(newStore);
  }

  if (!store) return <div style={{ position: 'fixed', inset: 0, background: '#0d0d0d' }}><Background /></div>;
  if (!store.onboardingComplete) return <Onboarding onComplete={handleOnboardingComplete} />;
  return <Dashboard store={store} onToggleGoal={handleToggleGoal} />;
}
