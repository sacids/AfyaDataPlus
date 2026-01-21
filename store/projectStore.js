import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const useProjectStore = create(
    persist(
        (set) => ({
            currentProject: null,
            currentData: null,
            setCurrentProject: (project) => set({ currentProject: project }),
            setCurrentData: (data) => set({ currentData: data }),
        }),
        {
            name: 'project-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useProjectStore;