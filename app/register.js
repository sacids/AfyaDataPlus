// components/RegisterScreen.js
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import api from '../api/axiosInstance';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore'; // Verify this path
import { getDeviceId } from '../utils/deviceUtils';
import { generateRandomPassword } from '../utils/passwordUtils';

const logo = require('../assets/images/AfyaDataLogo.png');

const RegisterScreen = () => {
    const { colors } = useTheme();
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);

    const { user, setUser } = useAuthStore();

    //const setUser = useAuthStore((state) => state.setUser); // Correctly access setUser

    useEffect(() => {
        const isValid = fullName.trim().length > 0 && phoneNumber.trim().length >= 10;
        setIsFormValid(isValid);
    }, [fullName, phoneNumber]);

    const handleRegister = async () => {
        try {

            const username = getDeviceId();
            const password = generateRandomPassword();
            const response = await api.post('/api/v1/register', {
                fullName,
                phoneNumber,
                username,
                password,
                passwordConfirm: password,
            });


            const { access, refresh, user } = response.data;



            // Extract token strings from arrays
            const accessToken = Array.isArray(access) ? access[0] : access;
            const refreshToken = Array.isArray(refresh) ? refresh[0] : refresh;

            // Store tokens as strings
            await SecureStore.setItemAsync('accessToken', accessToken);
            await SecureStore.setItemAsync('refreshToken', refreshToken);

            setUser(user); // Update user in Zustand store
            router.replace('/Tabs'); // Navigate to Tabs
        } catch (error) {
            console.error('Registration error:', error);
            // Handle error (e.g., show error message to user)
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
            padding: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        input: {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            color: colors.text,
            width: '100%',
        },
        button: {
            backgroundColor: isFormValid ? colors.buttonBackground : colors.inputBorder,
            padding: 16,
            borderRadius: 8,
            alignItems: 'center',
            width: '100%',
        },
        buttonText: {
            color: colors.buttonText,
            fontWeight: 'bold',
        },
    });

    return (
        <View style={styles.container}>
            <Image
                source={logo}
                style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 30 }}
            />
            <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={colors.secText}
                value={fullName}
                onChangeText={setFullName}
            />
            <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor={colors.secText}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
            />
            <TouchableOpacity
                style={styles.button}
                onPress={handleRegister}
                disabled={!isFormValid}
            >
                <Text style={styles.buttonText}>Register</Text>
            </TouchableOpacity>


            <View>
                <Text>User: {JSON.stringify(user)}</Text>
                <TouchableOpacity style={styles.button} onPress={() => setUser({ name: 'Test' })}>
                    <Text style={styles.buttonText}>Set User</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default RegisterScreen;