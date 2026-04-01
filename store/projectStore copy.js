import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { select } from '../utils/database';

const useProjectStore = create(
    persist(
        (set) => ({
            currentProject: null,
            currentData: null,
            currentForm: null,
            setCurrentProject: (project) => set({ currentProject: project }),
            //setCurrentData: (data) => set({ currentData: data }),
            setCurrentData: async (data) => {
                try {
                    // First set the currentData immediately
                    set({ currentData: data });

                    // Then fetch and set the form data
                    if (data?.form) {
                        const currentFormData = await select('form_defn', 'form_id = ?', [data.form]);
                        //console.log('project store', currentFormData?.[0]);
                        set({ currentForm: currentFormData?.[0] });
                    } else {
                        set({ currentForm: null });
                    }
                } catch (error) {
                    console.error('Error in setCurrentData:', error);
                    // Still set the data even if form fetch fails
                    set({ currentData: data, currentForm: null });
                }
            },
        }),
        {
            name: 'project-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useProjectStore;