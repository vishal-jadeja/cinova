# Cinova — Implementation Plan

## Feature 1: Focus Mode

### Manifest changes
- [ ] Add `declarativeNetRequest` and `declarativeNetRequestWithHostAccess` permissions to `manifest.json`
- [ ] Add `host_permissions: ["<all_urls>"]` (required for dynamic rule injection)
- [ ] Register new `block` page: add `src/block/index.html` to `web_accessible_resources`

### Types (`src/types/index.ts`)
- [ ] Add `BlockedSite` interface:
  ```ts
  interface BlockedSite {
    id: string;
    domain: string;           // e.g. "twitter.com"
    type: 'timed' | 'lifetime';
    expiresAt?: number;       // ms timestamp, only for timed
    ruleId: number;           // declarativeNetRequest rule ID
  }
  ```
- [ ] Add `blockedSites: BlockedSite[]` to storage schema

### Storage (`src/utils/storage.ts`)
- [ ] Add `getBlockedSites()` / `setBlockedSites()` helpers
- [ ] Store in `chrome.storage.local` (not sync — rule IDs are device-specific)

### Block page (`src/block/`)
- [ ] New Vite entry: `src/block/index.html` + `src/block/main.tsx` + `src/block/Block.tsx`
- [ ] Block.tsx reads current URL from query param (`?url=...`) passed by redirect
- [ ] Reads active weekly goals from storage and displays them
- [ ] For timed blocks: shows countdown timer to auto-unblock
- [ ] For lifetime blocks: shows confirmation phrase input (e.g. type "I give up") to unblock
- [ ] On confirmed phrase: removes site from storage + removes declarativeNetRequest rule
- [ ] Styling: same dark theme, shows Cinova logo, goal sidebar

### Background service worker (`src/background.ts`)
- [ ] On install / startup: re-register all active `declarativeNetRequest` rules from storage (rules don't persist across service worker restarts)
- [ ] On `chrome.alarms.onAlarm`: check if alarm matches a blocked site ID → remove rule + remove from storage
- [ ] Helper: `addBlockRule(site)` — calls `chrome.declarativeNetRequest.updateDynamicRules` to add redirect rule pointing to block page
- [ ] Helper: `removeBlockRule(ruleId)` — removes rule by ID

### Settings UI (new Focus Mode section in options or a dedicated page)
- [ ] Input to add a domain (validate format, strip `https://`, strip paths)
- [ ] Duration picker: dropdown with preset options (1h, 2h, 4h, 8h, custom, lifetime)
- [ ] Custom duration: hour/minute inputs
- [ ] On add: create `BlockedSite`, call `addBlockRule`, set `chrome.alarms.create` for timed blocks, save to storage
- [ ] List of active blocks: domain, type, time remaining (live countdown for timed)
- [ ] Remove button: instant for timed; friction modal for lifetime (type confirmation phrase)
- [ ] Empty state: encouragement copy

### New tab dashboard
- [ ] Small "Focus" indicator in header or sidebar showing count of active blocks (optional, low priority)

---

## Feature 2: Rewards Mode

### Types (`src/types/index.ts`)
- [ ] Add `Reward` interface:
  ```ts
  interface Reward {
    id: string;
    label: string;       // e.g. "Netflix evening"
    threshold: number;   // number of weekly goals to complete
    unlockedAt?: number; // timestamp when unlocked this week, undefined = locked
  }
  ```
- [ ] Add `rewards: Reward[]` to `GoalStore`

### Unlock logic (`src/newtab/NewTab.tsx`)
- [ ] After toggling a weekly goal, count completed weekly goals
- [ ] For each reward where `completedCount >= threshold` and `!reward.unlockedAt`: set `unlockedAt = Date.now()` and persist
- [ ] For each reward where `completedCount < threshold` and `reward.unlockedAt`: re-lock (un-completing a goal can re-lock rewards)

### New tab dashboard — Rewards section
- [ ] Add rewards section below/beside goals in sidebar (or a dedicated collapsible panel)
- [ ] Locked reward: show label + "X goals needed" in muted style
- [ ] Unlocked reward: highlighted, amber accent, "Earned ✓" indicator
- [ ] Empty state: prompt to add rewards from settings
- [ ] Animate unlock: subtle `fadeIn` when reward state changes from locked → unlocked

### Rewards editor (in Options page, new `CategorySection`-style block)
- [ ] Add reward: text input for label + number input for threshold
- [ ] List of current rewards with edit/remove
- [ ] Validation: threshold must be ≥ 1 and ≤ total weekly goals count
- [ ] Save with the rest of goals on the Options save button

### Weekly reset logic (`src/background.ts` or `src/utils/storage.ts`)
- [ ] On weekly reset: clear `unlockedAt` from all rewards (keep definitions)
- [ ] Snapshot current week's reward state into history before clearing (see Feature 3)

---

## Feature 3: History Page

### Storage schema
- [ ] Add `HistoryEntry` interface:
  ```ts
  interface HistoryEntry {
    weekStart: string;          // ISO date string, Monday of that week
    goals: {
      weekly: { text: string; completed: boolean }[];
      monthly: { text: string; completed: boolean }[];
      yearly: { text: string; completed: boolean }[];
    };
    rewards: { label: string; threshold: number; earned: boolean }[];
  }
  ```
- [ ] Store in `chrome.storage.local` under key `"history"` as `HistoryEntry[]`
- [ ] Cap at last 52 entries (1 year) to avoid unbounded growth

### Snapshot on reset (`src/background.ts`)
- [ ] Before clearing weekly goals/rewards, write a `HistoryEntry` snapshot to `chrome.storage.local`
- [ ] Only write if there's at least one goal defined (skip empty weeks)

### History page (`src/history/`)
- [ ] New Vite entry: `src/history/index.html` + `src/history/main.tsx` + `src/history/History.tsx`
- [ ] Add to `manifest.json` `web_accessible_resources`
- [ ] List of past weeks in reverse chronological order
- [ ] Each week card shows:
  - Week date range (e.g. "Jun 16 – Jun 22")
  - Weekly goals: completed vs total (e.g. "4 / 6 completed")
  - Rewards earned
  - Expandable: full goal list with completion state
- [ ] Empty state: "No history yet — complete your first week"
- [ ] Link from Options page (header area) and new tab sidebar

### Navigation
- [ ] Add "History" link to Options page header
- [ ] Optionally: small history icon in new tab sidebar footer

---

## Implementation Order (suggested)

1. **Rewards Mode** — pure UI + logic, no new permissions, lowest risk
2. **History** — depends on weekly reset hook already in background.ts; add snapshot + page
3. **Focus Mode** — most complex, requires new permissions + background rule management + new page

---

## Open Questions / Decisions Needed Before Build

- Focus Mode: which page should host the block list UI — Options page (new tab) or a dedicated Focus page?
- Rewards: should locked rewards be visible on the new tab by default, or only shown when at least one reward is defined?
- History: should monthly/yearly goal snapshots also be saved, or only weekly (since only weekly resets)?
- History: max cap — 52 weeks is ~1 year. Is that enough or should it be unlimited?
