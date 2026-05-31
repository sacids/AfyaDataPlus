import { create } from 'zustand';

export interface FilterPayload {
  key: string;       // e.g., 'status', 'workflow_state', 'archived'
  value: any;        // e.g., 'All', 'draft', true, false
  label: string;      // The display name of the tag
}

interface FilterState {
  activeFilter: FilterPayload;
  setFilter: (filter: FilterPayload) => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  // Default fallback state
  activeFilter: { key: 'status', value: 'All', label: 'All' },
  setFilter: (activeFilter) => set({ activeFilter }),
}));