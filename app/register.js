// components/RegisterScreen.js
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../api/axiosInstance';
import { useTheme } from '../context/ThemeContext';
import { useAuthStore } from '../store/authStore';
import { getDeviceId } from '../utils/deviceUtils';
import { generatePassword } from '../utils/passwordUtils';

const logo = require('../assets/images/AfyaDataLogo.png');

const RegisterScreen = () => {
    const { colors } = useTheme();
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isFormValid, setIsFormValid] = useState(false);
    const insets = useSafeAreaInsets();

    const { user, setUser } = useAuthStore();

    //const setUser = useAuthStore((state) => state.setUser); // Correctly access setUser

    useEffect(() => {
        const isValid = fullName.trim().length > 0 && phoneNumber.trim().length >= 10;
        setIsFormValid(isValid);
    }, [fullName, phoneNumber]);

    const handleRegister = async () => {
        try {

            const username = getDeviceId()
            //const password = generateRandomPassword();
            const password = await generatePassword(username);

            console.log('fullName', phoneNumber, username, password)
            const response = await api.post('/api/v1/register', {
                fullName,
                phoneNumber,
                username,
                password,
                passwordConfirm: password,
            });



            console.log('response', response.data);

            const { access, refresh, user } = response.data;


            // Extract token strings from arrays
            const accessToken = Array.isArray(access) ? access[0] : access;
            const refreshToken = Array.isArray(refresh) ? refresh[0] : refresh;

            console.log('accessToken', accessToken);
            console.log('refreshToken', refreshToken);

            // Store tokens as strings
            await SecureStore.setItemAsync('accessToken', accessToken);
            await SecureStore.setItemAsync('refreshToken', refreshToken);
            await SecureStore.setItemAsync('username', username);
            await SecureStore.setItemAsync('password', password);

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
        <View style={[styles.container, { paddingBottom: insets.bottom }]}>
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
        </View>
    );
};

export default RegisterScreen;