import { useNetInfo } from '@react-native-community/netinfo';
import axios from "axios";
import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from "react";
import { config } from '../constants/config';
import { getDeviceId } from '../utils/deviceUtils';
import { generatePassword } from '../utils/passwordUtils';

const TOKEN_KEY = config.TOKEN_KEY
const AuthContext = createContext({});

function replaceSpecialChars(str) {
    return str.replace(/[^a-zA-Z0-9]/g, "-");
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (process.env.NODE_ENV !== 'production') {
        if (!value) {
            throw new Error('useAuth must be wrapped in a <SessionProvider />');
        }
    }
    return value;
}

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = useState(null);
    const netInfo = useNetInfo();
    axios.defaults.baseURL = config.BASE_URL;
    

    useEffect(() => {
        const getToken = async () => {
            const token = await SecureStore.getItemAsync(TOKEN_KEY);
            if (token) {
                const json_token = JSON.parse(token);
                setAuthState({
                    access: json_token.access,
                    refresh: json_token.refresh,
                    user: json_token.user,
                    // profile: json_token.profile,
                    // groups: json_token.groups
                });
                axios.defaults.headers.common['Authorization'] = `Bearer ${json_token.access}`;
                
            } else {

                await attemptAutoLogin();
                
            }
        };

        getToken();
    }, []);

    async function attemptAutoLogin() {
        try {
          const username = getDeviceId();
          const password = await generatePassword(username);
  
          const response = await axios.post('/api/v1/token/', {
            username,
            password,
          });
  
          const { access, refresh, user: userData } = response.data;
  
          await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify({
            access,
            refresh,
            user: userData,
          }));
          setAuthState({
            access,
            refresh,
            user: userData,
          });
  
          axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          axios.defaults.baseURL = config.BASE_URL;
          return true;

        } catch (error) {
          console.error('Auto-login failed:', error);
          
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          axios.defaults.headers.common['Authorization'] = '';
          setAuthState(null);
        }
      }

    const refreshAccessToken = async () => {
        try {
            const result = await axios.post(`${config.BASE_URL}auth/token/refresh/`, {
                refresh: authState.refresh,
            });
            const newAuthState = {
                access: result.data.access,
                refresh: result.data.refresh,
                user: authState.user,
                //profile: authState.profile,
                //groups: authState.groups
            };
            await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(newAuthState));
            setAuthState(newAuthState);
            axios.defaults.headers.common['Authorization'] = `Bearer ${result.data.access}`;
        } catch (error) {

            // auto login

            console.log('Error refreshing token:', error);
            logout();
        }
    };

    const signup = async (username, password) => {
        try {
            return await axios.post(`${config.BASE_URL}signup/`, { username, password });
        } catch (e) {
            return { error: true, msg: e.response?.data?.msg || 'Signup failed' };
        }
    };

    const login = async (username, password) => {
        const user_key = replaceSpecialChars(username);
        const payload = {
            username_or_email: username,
            password: password,
        };

        // Check if offline
        if (!netInfo.isConnected) {
            const userInfo = await SecureStore.getItemAsync(user_key);
            if (userInfo) {
                const { result, passwd } = JSON.parse(userInfo);
                if (password === passwd) {
                    const json_token = result;
                    const newAuthState = {
                        access: json_token.access,
                        refresh: json_token.refresh,
                        user: json_token.user,
                        profile: json_token.profile,
                        groups: json_token.groups
                    };
                    setAuthState(newAuthState);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${json_token.access}`;
                    return { error: false };
                }
            }
            return { error: true, error_msg: 'Offline login failed: Invalid credentials' };
        }

        try {
            //('login', `${config.BASE_URL}auth/login/`, payload)
            const result = await axios.post(`${config.BASE_URL}auth/login/`, payload);
            //console.log(result.data)
            if (result.data.error) {
                return result.data;
            }
            const newAuthState = {
                access: result.data.access,
                refresh: result.data.refresh,
                user: result.data.user,
                profile: result.data.profile,
                groups: result.data.groups
            };
            setAuthState(newAuthState);
            axios.defaults.headers.common['Authorization'] = `Bearer ${result.data.access}`;
            await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(newAuthState));

            // For offline storage
            const userInfo = {
                result: newAuthState,
                passwd: password,
                username: username
            };
            await SecureStore.setItemAsync(user_key, JSON.stringify(userInfo));

            return { error: false };
        } catch (e) {
            console.log('Error logging in:', e);
            return { error: true, error_msg: 'Invalid username or password' };
        }
    };

    const logout = async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        axios.defaults.headers.common['Authorization'] = '';
        setAuthState(null);
    };

    const removeToken = async () => {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    };

    // const checkPerm = (groupInput) => {
    //     if (!authState || !authState.groups) {
    //         return false;
    //     }

    //     // Convert input to array if it's a string
    //     const groupsToCheck = Array.isArray(groupInput) ? groupInput : [groupInput];

    //     // Check if any group in authState.groups matches any group in groupsToCheck
    //     return authState.groups.some(group =>
    //         groupsToCheck.some(input =>
    //             group?.name?.toLowerCase().includes(input.toLowerCase())
    //         )
    //     );
    // };


    const value = {
        onSignup: signup,
        onLogin: login,
        onLogout: logout,
        //checkPerm,
        removeToken,
        authState,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};