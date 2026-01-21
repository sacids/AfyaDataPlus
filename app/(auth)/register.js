import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/axiosInstance';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useAuth } from '../../context/AuthContext'; // 1. Import useAuth
import { config } from '../../constants/config';     // 2. Import config
import { getDeviceId } from '../../utils/deviceUtils';
import { generatePassword } from '../../utils/passwordUtils';

const logo = require('../../assets/images/AfyaDataLogo.png');

const RegisterScreen = () => {
  const { colors } = useTheme();
  const { setAuthState } = useAuth(); // 3. Use setAuthState to update UI context
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const isValid = fullName.trim().length > 0 && phoneNumber.trim().length >= 10;
    setIsFormValid(isValid);
  }, [fullName, phoneNumber]);

  const handleRegister = async () => {
    try {
      const username = getDeviceId();
      const password = await generatePassword(username);

      // Uses the centralized axiosInstance
      const response = await api.post('/api/v1/register', {
        fullName,
        phoneNumber,
        username,
        password,
        passwordConfirm: password,
      });

      const { access, refresh, user } = response.data;

      // 4. Create the unified auth object
      const authData = {
        access,
        refresh,
        user,
      };

      // 5. Store using the unified TOKEN_KEY [Matches AuthContext]
      await SecureStore.setItemAsync(config.TOKEN_KEY, JSON.stringify(authData));
      
      // 6. Optional: Store credentials for offline login logic
      const userKey = username.replace(/[^a-zA-Z0-9]/g, "-");
      await SecureStore.setItemAsync(userKey, JSON.stringify({
          result: authData,
          passwd: password,
          username: username
      }));

      // 7. Update all state managers
      setUser(user); // Zustand
      if (setAuthState) setAuthState(authData); // AuthContext
      
      router.replace('/(app)/Main');
    } catch (error) {
      console.error('Registration error:', error);
      setError('Registration failed. Please try again.');
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
    errorText: {
      color: 'red',
      marginBottom: 16,
      textAlign: 'center',
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
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={!isFormValid}>
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
};

export default RegisterScreen;