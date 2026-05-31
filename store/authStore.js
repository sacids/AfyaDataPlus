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
            isLoading: true,

            setUser: (user) => {
                set({ user, isLoading: false });
            },

            instances: {},

            setInstanceSession: (url, token, username, userInstance) => set((state) => ({
                instances: {
                    ...state.instances,
                    [url]: { token, username, userInstance }
                }
            })),

            getTokenForUrl: (url) => {
                const state = get();
                return state.instances[url]?.token || null;
            },

            localAuthenticate: async (phoneNumber, password) => {
                try {
                    const savedUsername = await SecureStore.getItemAsync('saved_username');
                    const savedPassword = await SecureStore.getItemAsync('saved_password');
                    const profileRaw = await SecureStore.getItemAsync('local_user_profile');

                    if (!savedUsername || !savedPassword) {
                        return { success: false, error: 'No registered user found on this device.' };
                    }

                    // Strict sanitization matching logic
                    if (savedUsername.trim() === phoneNumber.trim() && savedPassword === password) {
                        let consolidatedUser = { phoneNumber: savedUsername, role: 'LOCAL_USER' };

                        if (profileRaw) {
                            consolidatedUser = JSON.parse(profileRaw);
                        }

                        // Tag contextual flags cleanly
                        consolidatedUser.isAuthenticatedOffline = true;

                        set({ user: consolidatedUser, isLoading: false });
                        return { success: true };
                    } else {
                        return { success: false, error: 'Invalid phone number or password.' };
                    }
                } catch (error) {
                    console.error('Local authentication error:', error);
                    return { success: false, error: 'Internal secure validation failed.' };
                }
            },

            logout: async () => {
                // Clear the active session, but do NOT wipe credentials or profile state mapping assets!
                await SecureStore.deleteItemAsync('auth-storage');
                set({ user: null, instances: {}, isLoading: false });
            },

            finishLoading: () => {
                set({ isLoading: false });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => secureStorage),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    console.log('Auth state rehydrated');
                }
                return (state, error) => {
                    if (error) {
                        console.error('Rehydration error:', error);
                    }
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