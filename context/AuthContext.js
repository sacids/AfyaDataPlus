import { useNetInfo } from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from "react";
import api from '../api/axiosInstance';
import { config } from '../constants/config';

const TOKEN_KEY = config.TOKEN_KEY;
const AuthContext = createContext({});

function replaceSpecialChars(str) {
    return str.replace(/[^a-zA-Z0-9]/g, "-");
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value && process.env.NODE_ENV !== 'production') {
        throw new Error('useAuth must be wrapped in a <AuthProvider />');
    }
    return value;
}

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState(null);
    const netInfo = useNetInfo();

    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                const storedData = await SecureStore.getItemAsync(TOKEN_KEY);
                if (storedData) {
                    const parsed = JSON.parse(storedData);
                    setAuthState(parsed);
                } else {
                    // Trigger initial auto-login via the api instance
                    await attemptAutoLogin();
                }
            } catch (e) {
                console.error("Error loading auth state", e);
            }
        };
        loadStoredAuth();
    }, []);

    const attemptAutoLogin = async () => {
        try {
            // Calling a protected endpoint or a dummy "me" endpoint 
            // will trigger the axiosInstance interceptor's auto-login logic.
            // Alternatively, we call the login flow here via api.
            const response = await api.get('/api/v1/projects');
            // If the interceptor succeeds, the storage is already updated.
            const storedData = await SecureStore.getItemAsync(TOKEN_KEY);
            if (storedData) {
                setAuthState(JSON.parse(storedData));
            }
            return true;
        } catch (error) {
            console.error('Auto-login failed:', error);
            setAuthState(null);
            return false;
        }
    };

    const login = async (username, password) => {
        const user_key = replaceSpecialChars(username);

        if (!netInfo.isConnected) {
            const userInfo = await SecureStore.getItemAsync(user_key);
            if (userInfo) {
                const { result, passwd } = JSON.parse(userInfo);
                if (password === passwd) {
                    setAuthState(result);
                    return { error: false };
                }
            }
            return { error: true, error_msg: 'Offline login failed' };
        }

        try {
            // Use the 'api' instance instead of raw axios
            const result = await api.post(`${config.BASE_URL}auth/login/`, {
                username_or_email: username,
                password: password,
            });

            const newAuthState = {
                access: result.data.access,
                refresh: result.data.refresh,
                user: result.data.user,
                profile: result.data.profile,
                groups: result.data.groups
            };

            setAuthState(newAuthState);
            await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(newAuthState));

            // Store for offline usage
            await SecureStore.setItemAsync(user_key, JSON.stringify({
                result: newAuthState,
                passwd: password,
                username: username
            }));

            return { error: false };
        } catch (e) {
            return { error: true, error_msg: e.response?.data?.msg || 'Invalid credentials' };
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setAuthState(null);
    };

    const value = {
        onLogin: login,
        onLogout: logout,
        autoLogin: attemptAutoLogin,
        setAuthState, 
        authState,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};