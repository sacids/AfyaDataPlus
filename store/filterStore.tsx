import { create } from 'zustand';

interface FilterState {
  filter: string;
  setFilter: (filter: string) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  filter: 'All',
  setFilter: (filter) => set({ filter }),
}));