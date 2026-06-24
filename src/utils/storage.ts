import { GoalStore } from '../types';

export const DEFAULT_STORE: GoalStore = {
  weekly: [],
  monthly: [],
  yearly: [],
  lastWeeklyReset: new Date().toISOString(),
  acknowledgedToday: false,
  lastAcknowledgedDate: '',
  onboardingComplete: false,
};

export const getStore = (): Promise<GoalStore> =>
  new Promise((resolve) =>
    chrome.storage.sync.get('cinova', (data) =>
      resolve(data.cinova ?? DEFAULT_STORE)
    )
  );

export const setStore = (store: GoalStore): Promise<void> =>
  new Promise((resolve) =>
    chrome.storage.sync.set({ cinova: store }, resolve)
  );
