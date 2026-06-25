import React, { useEffect, useState } from 'react';
import { GoalStore } from '../types';
import { getStore, setStore } from '../utils/storage';
import logoMark from '/CinovaLogo.png';

const FONT_SANS = "'Space Grotesk', sans-serif";
const BG_URLS = [
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=60',
  'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=60',
  'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&w=400&q=60',
  'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=400&q=60',
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=400&q=60',
  'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=400&q=60',
  'https://images.unsplash.com/photo-1418985991508-e47386d96a71?auto=format&fit=crop&w=400&q=60',
];
const BG_URL = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80';

const T = {
  text: '#e8e8e8',
  muted: 'rgba(232,232,232,0.36)',
  border: 'rgba(232,232,232,0.07)',
  border2: 'rgba(232,232,232,0.14)',
  surface: 'rgba(18,18,18,0.62)',
  accent: '#e8e8e8',
  accentText: '#0d0d0d',
  amber: '#E8A838',
};

type BarState = 'hidden' | 'dirty' | 'leaving' | 'saved';
type Snapshot = { customBg: string; bgMode: 'custom' | 'auto'; selectedBgIndex: number | null };

const GHOST_BTN: React.CSSProperties = {
  background: 'none', border: `1px solid rgba(232,232,232,0.14)`, color: 'rgba(232,232,232,0.36)',
  padding: '8px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em',
  borderRadius: '4px', cursor: 'pointer', fontFamily: FONT_SANS, transition: 'border-color 150ms, color 150ms',
};
const PRIMARY_BTN: React.CSSProperties = {
  background: '#e8e8e8', color: '#0d0d0d', border: 'none',
  padding: '8px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
  borderRadius: '4px', cursor: 'pointer', fontFamily: FONT_SANS,
};

export default function Settings() {
  const [store, setLocalStore] = useState<GoalStore | null>(null);
  const [customBg, setCustomBg] = useState('');
  const [bgMode, setBgMode] = useState<'custom' | 'auto'>('auto');
  const [selectedBgIndex, setSelectedBgIndex] = useState<number | null>(null);
  const [barState, setBarState] = useState<BarState>('hidden');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  useEffect(() => {
    getStore().then(s => {
      setLocalStore(s);
      setCustomBg(s.backgroundImage ?? '');
      setBgMode(s.autoBackground ? 'auto' : 'custom');
      setSelectedBgIndex(s.backgroundIndex ?? null);
      setSnapshot({
        customBg: s.backgroundImage ?? '',
        bgMode: s.autoBackground ? 'auto' : 'custom',
        selectedBgIndex: s.backgroundIndex ?? null,
      });
    });
  }, []);

  useEffect(() => {
    if (barState !== 'dirty' && barState !== 'leaving') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [barState]);

  const navigateBack = () => { window.location.href = chrome.runtime.getURL('src/newtab/index.html'); };

  async function handleSave() {
    if (!store) return;
    const wasAutoOff = !store.autoBackground;
    const isAuto = bgMode === 'auto';
    const newStore: GoalStore = {
      ...store,
      ...(bgMode === 'custom' && customBg.trim() ? { backgroundImage: customBg.trim() } : bgMode === 'custom' ? { backgroundImage: undefined } : {}),
      autoBackground: isAuto,
      ...(isAuto && selectedBgIndex !== null
        ? { backgroundIndex: selectedBgIndex, lastBackgroundChange: undefined }
        : isAuto && wasAutoOff
          ? { backgroundIndex: undefined, lastBackgroundChange: undefined }
          : {}),
    };
    await setStore(newStore);
    setLocalStore(newStore);
    setSnapshot({ customBg: customBg.trim(), bgMode, selectedBgIndex });
    setBarState('saved');
    setTimeout(() => setBarState('hidden'), 1500);
  }

  function handleDiscard() {
    if (snapshot) {
      setCustomBg(snapshot.customBg);
      setBgMode(snapshot.bgMode);
      setSelectedBgIndex(snapshot.selectedBgIndex);
    }
    setBarState('hidden');
  }

  async function handleSaveAndGo() {
    await handleSave();
    navigateBack();
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
        <div style={{ width: '16px', height: '16px', border: '1.5px solid #e8e8e8', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', color: T.text, fontFamily: FONT_SANS, overflowY: 'auto', background: 'rgba(10,10,10,0.18)' }}>

      {/* Sticky save bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(12,12,12,0.92)',
        backdropFilter: 'blur(20px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
        borderTop: `1px solid ${T.border2}`,
        transform: barState === 'hidden' ? 'translateY(100%)' : 'translateY(0)',
        transition: 'transform 260ms cubic-bezier(0.4,0,0.2,1)',
      }}>
        <div style={{ maxWidth: '880px', margin: '0 auto', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {barState === 'saved' && (
            <span style={{ fontSize: '13px', color: T.amber, letterSpacing: '0.04em', fontWeight: 600 }}>✓ Changes saved</span>
          )}
          {barState === 'leaving' && (
            <>
              <span style={{ fontSize: '13px', color: T.text }}>Save before leaving?</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={navigateBack} style={GHOST_BTN}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,232,232,0.3)'; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.muted; }}>
                  Leave anyway
                </button>
                <button onClick={handleSaveAndGo} style={PRIMARY_BTN}>Save & go</button>
              </div>
            </>
          )}
          {barState === 'dirty' && (
            <>
              <span style={{ fontSize: '13px', color: T.muted, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.amber, display: 'inline-block', flexShrink: 0 }} />
                Unsaved changes
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleDiscard} style={GHOST_BTN}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(232,232,232,0.3)'; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.color = T.muted; }}>
                  Discard
                </button>
                <button onClick={handleSave} style={PRIMARY_BTN}>Save changes</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '-40px', backgroundImage: `url('${customBg.trim() || BG_URL}')`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(34px)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,8,0.76)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '880px', margin: '0 auto', padding: '52px 40px 80px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <img src={logoMark} alt="Cinova" style={{ height: '24px', display: 'block', opacity: 0.9 }} />
          <button
            onClick={() => { if (barState === 'dirty') { setBarState('leaving'); } else { navigateBack(); } }}
            style={{ background: 'none', border: `1px solid ${T.border2}`, padding: '8px 16px', fontSize: '11px', color: T.muted, letterSpacing: '0.06em', borderRadius: '4px', fontWeight: 500, cursor: 'pointer', fontFamily: FONT_SANS, transition: 'border-color 150ms' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,232,232,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = T.border2)}>
            ← Back
          </button>
        </div>

        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '32px', color: '#ffffff' }}>Settings</h1>

        {/* Two-column grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start', marginBottom: '28px' }}>

          {/* Background — unified card (left column) */}
          <div style={{ border: `1px solid ${T.border}`, borderRadius: '8px', overflow: 'hidden', background: T.surface }}>

            {/* Live preview */}
            <div style={{ height: '160px', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', inset: '-20px',
                backgroundImage: `url('${bgMode === 'auto' ? BG_URLS[selectedBgIndex ?? store.backgroundIndex ?? 0] : (customBg.trim() || BG_URL)}')`,
                backgroundSize: 'cover', backgroundPosition: 'center',
                filter: 'blur(8px)', transform: 'scale(1.06)',
                transition: 'background-image 400ms',
              }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,8,8,0.52)' }} />
              <div style={{ position: 'absolute', bottom: '14px', left: '18px', fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(232,232,232,0.45)', fontWeight: 600, textTransform: 'uppercase' }}>
                Preview
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em' }}>Background</div>
                {/* Mode tabs */}
                <div style={{ display: 'flex', background: 'rgba(232,232,232,0.06)', borderRadius: '6px', padding: '3px', gap: '2px' }}>
                  {(['auto', 'custom'] as const).map(mode => (
                    <button key={mode} onClick={() => { setBgMode(mode); setBarState('dirty'); }}
                      style={{
                        background: bgMode === mode ? 'rgba(232,232,232,0.12)' : 'none',
                        border: 'none', borderRadius: '4px',
                        padding: '6px 14px', fontSize: '11px', fontWeight: 600,
                        color: bgMode === mode ? '#ffffff' : T.muted,
                        letterSpacing: '0.04em', cursor: 'pointer',
                        fontFamily: FONT_SANS,
                        borderBottom: bgMode === mode ? `2px solid ${T.amber}` : '2px solid transparent',
                        transition: 'color 150ms, background 150ms',
                      }}>
                      {mode === 'custom' ? 'Custom' : 'Auto-rotate'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom mode */}
              {bgMode === 'custom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={customBg}
                      onChange={e => { setCustomBg(e.target.value); setBarState('dirty'); }}
                      placeholder="Paste an image URL…"
                      style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: `1px solid ${T.border2}`, borderRadius: '5px', padding: '10px 38px 10px 14px', fontSize: '13px', color: T.text, fontFamily: FONT_SANS, outline: 'none', letterSpacing: '0.01em', transition: 'border-color 150ms', boxSizing: 'border-box' }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(232,232,232,0.3)')}
                      onBlur={e => (e.currentTarget.style.borderColor = T.border2)}
                    />
                    {customBg.trim() && (
                      <button onClick={() => { setCustomBg(''); setBarState('dirty'); }}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '14px', padding: '2px 4px', lineHeight: 1, transition: 'color 150ms' }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
                        ✕
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.5 }}>
                    Paste any direct image URL. Blur is applied automatically.
                  </div>
                </div>
              )}

              {/* Auto-rotate mode */}
              {bgMode === 'auto' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '4px 2px 6px', msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}>
                    {BG_URLS.map((url, i) => {
                      const isActive = (selectedBgIndex ?? store.backgroundIndex) === i;
                      return (
                        <div key={i} onClick={() => { setSelectedBgIndex(i); setBarState('dirty'); }} style={{
                          flexShrink: 0, width: '120px', height: '80px', borderRadius: '5px',
                          backgroundImage: `url('${url}')`, backgroundSize: 'cover', backgroundPosition: 'center',
                          border: isActive ? `2px solid ${T.amber}` : `1px solid ${T.border}`,
                          transition: 'border 200ms, filter 150ms',
                          cursor: 'pointer',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.filter = 'brightness(1)'; }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.5 }}>
                    Cycles through curated landscapes — a new one each week when you open a new tab.
                    {store.backgroundIndex != null && (
                      <span style={{ color: T.amber, marginLeft: '6px', opacity: 0.85 }}>Amber ring = current week.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column — actions */}
          <div style={{ position: 'sticky', top: '52px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Reset weekly */}
            <div style={{ padding: '22px 24px', border: `1px solid ${T.border}`, borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px', background: T.surface }}>
              <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.01em' }}>Reset weekly progress</div>
              <div style={{ fontSize: '13px', color: T.muted, lineHeight: 1.55 }}>Unchecks all weekly goals without deleting them.</div>
              <button onClick={handleResetWeekly}
                style={{ marginTop: '4px', padding: '9px 18px', background: 'none', border: `1px solid ${T.border2}`, fontSize: '11px', fontWeight: 600, color: T.text, letterSpacing: '0.06em', borderRadius: '4px', alignSelf: 'flex-start', cursor: 'pointer', fontFamily: FONT_SANS, transition: 'border-color 150ms' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(232,232,232,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = T.border2)}>
                Reset weekly progress
              </button>
            </div>

          </div>
        </div>{/* end grid */}

      </div>
    </div>
  );
}
