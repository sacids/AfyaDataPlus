// store/authStore.js
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const secureStorage = {
    getItem: async (key) => {
        const value = await SecureStore.getItemAsync(key);
        return value ? JSON.parse(value) : null;
    },
    setItem: async (key, value) => {
        await SecureStore.setItemAsync(key, JSON.stringify(value));
    },
    removeItem: async (key) => {
        await SecureStore.deleteItemAsync(key);
    },
};

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            isLoading: true, // Start as true

            setUser: (user) => {
                set({ user, isLoading: false });
            },

            instances: {},

            setInstanceSession: (url, token, username) => set((state) => ({
                instances: {
                    ...state.instances,
                    [url]: { token, username }
                }
            })),

            getTokenForUrl: (url) => {
                const state = get();
                return state.instances[url]?.token || null;
            },

            logout: async () => {
                await SecureStore.deleteItemAsync('auth-storage');
                await SecureStore.deleteItemAsync('saved_username');
                await SecureStore.deleteItemAsync('saved_password');
                set({ user: null, instances: {}, isLoading: false });
            },

            finishLoading: () => {
                set({ isLoading: false });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => secureStorage),
            // This runs after rehydration is complete
            onRehydrateStorage: () => (state) => {
                // State has been restored from storage
                if (state) {
                    // You can do any post-rehydration logic here
                    console.log('Auth state rehydrated');
                }
                // Return a function to run after rehydration
                return (state, error) => {
                    if (error) {
                        console.error('Rehydration error:', error);
                    }
                    // Mark loading as complete after rehydration
                    if (state) {
                        setTimeout(() => {
                            state.finishLoading();
                        }, 0);
                    }
                };
            },
        }
    )
);

export { useAuthStore };
