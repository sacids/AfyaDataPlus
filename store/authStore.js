// store/authStore.js
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { config } from '../constants/config';


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
            isLoading: true,
            setUser: async (user) => {
                set({ user, isLoading: false });
            },

            instances: {}, // { "https://server-a.com": { token: '...', username: '...' } }

            // New method to add/update an instance session
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
                await SecureStore.deleteItemAsync('auth-storage'); // The Zustand persistence key
                await SecureStore.deleteItemAsync('saved_username');
                await SecureStore.deleteItemAsync('saved_password');
                set({ user: null, instances: {}, isLoading: false });
            },
            checkSession: async () => {
                // Don't set loading state here to avoid re-renders
                try {
                    const tokenData = await SecureStore.getItemAsync(config.TOKEN_KEY);
                    if (tokenData) {
                        const { user } = JSON.parse(tokenData);
                        set({ user });
                    }
                } catch (error) {
                    console.error('Session check error:', error);
                }
            },

        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => secureStorage),
        }
    )
);


export { useAuthStore };
