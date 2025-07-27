import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// Custom storage adapter for expo-secure-store
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

// Create the Zustand store
const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            setUser: (user) => set({ user }),
            logout: async () => {
                await SecureStore.deleteItemAsync('accessToken');
                await SecureStore.deleteItemAsync('refreshToken');
                set({ user: null });
            },
        }),
        {
            name: 'auth-storage',
            storage: createJSONStorage(() => secureStorage),
        }
    )
);

// Export a function to get the raw store instance
const getAuthStore = () => ({
    setUser: (user) => useAuthStore.getState().setUser(user),
    logout: () => useAuthStore.getState().logout(),
});

export { getAuthStore, useAuthStore };
