import { GoalStore } from '../types';

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('dailyCheck', { periodInMinutes: 60 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'dailyCheck') return;

  const data = await chrome.storage.sync.get('cinova');
  const store: GoalStore = data.cinova;
  if (!store) return;

  const today = new Date();
  const lastReset = new Date(store.lastWeeklyReset);
  const isMonday = today.getDay() === 1;
  const isNewWeek = today.getTime() - lastReset.getTime() > 6 * 24 * 60 * 60 * 1000;

  if (isMonday && isNewWeek) {
    store.weekly = store.weekly.map((g) => ({ ...g, completed: false }));
    store.lastWeeklyReset = today.toISOString();
    await chrome.storage.sync.set({ cinova: store });
  }

  const todayStr = today.toISOString().split('T')[0];
  if (store.lastAcknowledgedDate !== todayStr) {
    store.acknowledgedToday = false;
    await chrome.storage.sync.set({ cinova: store });
  }
});
