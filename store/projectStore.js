import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { select } from '../utils/database';

const useProjectStore = create(
    persist(
        (set, get) => ({
            currentProject: null,
            currentData: null,
            currentFormId: null,  // Store only the ID, not the full data
            currentFormChildren: null,  // Store only the ID, not the full data
            // Optional: cache for form definitions with LRU strategy
            formDefCache: new Map(),

            setCurrentProject: (project) => {
                // Store minimal project data (only what's needed for display)

                let parsedTags = [];

                if (project?.tags) {
                    try {
                        // 1. Clean the string: remove potential double-escaping or stray backslashes
                        // This handles "[ \"Tag\" ]" and makes it "[ "Tag" ]"
                        const cleanString = project.tags.replace(/\\"/g, '"').trim();

                        // 2. Parse the cleaned string
                        const parsed = JSON.parse(cleanString);

                        // 3. Ensure we have an array of strings
                        parsedTags = Array.isArray(parsed) ? parsed.map(t => t.trim()) : [];
                    } catch (e) {
                        console.warn("Failed to parse project tags for AfyaDataPlus project:", e);
                        parsedTags = [];
                    }
                }

                //console.log('parsed tags', parsedTags)
                const minimalProject = project ? {
                    id: project.id,
                    project: project.project,
                    title: project.title,
                    code: project.code,
                    description: project.description,
                    tags: parsedTags,
                } : null;
                set({ currentProject: minimalProject });
            },

            setCurrentData: async (data) => {
                try {
                    if (!data) {
                        set({ currentData: null, currentFormId: null });
                        return;
                    }

                    // Store minimal form data (only what's needed for navigation)
                    const minimalData = {
                        id: data.id,
                        uuid: data.uuid,
                        original_uuid: data.original_uuid,
                        form: data.form,
                        title: data.title,
                        parent_uuid: data.parent_uuid,
                        status: data.status,
                        // Exclude form_data field (the actual JSON data)
                    };

                    // Then fetch and set the form data
                    if (data?.form) {
                        const currentFormData = await select('form_defn', 'form_id = ?', [data.form]);
                        set({ currentFormChildren: currentFormData?.[0].children });
                    } else {
                        set({ currentFormChildren: null });
                    }

                    set({
                        currentData: minimalData,
                        currentFormId: data.form
                    });

                    // Don't fetch form definition here - let the screen fetch it when needed
                    // This prevents storing huge data in the store
                } catch (error) {
                    console.error('Error in setCurrentData:', error);
                    set({ currentData: null, currentFormId: null });
                }
            },

            // Optional: Add method to get form definition with caching
            getCurrentFormDef: async () => {
                const { currentFormId, formDefCache } = get();
                if (!currentFormId) return null;

                // Check cache first
                if (formDefCache.has(currentFormId)) {
                    return formDefCache.get(currentFormId);
                }

                // Fetch from database
                const formData = await select('form_defn', 'form_id = ?', [currentFormId]);
                const formDef = formData?.[0];

                // Cache with size limit (LRU would be better, but simple limit for now)
                if (formDef && formDefCache.size < 10) {
                    formDefCache.set(currentFormId, formDef);
                }

                return formDef;
            },

            clearCache: () => {
                set({ formDefCache: new Map() });
            }
        }),
        {
            name: 'project-storage',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                // Only persist what's necessary
                currentProject: state.currentProject,
                currentData: state.currentData,
                currentFormId: state.currentFormId,
                // Don't persist the cache
            }),
        }
    )
);

export default useProjectStore;