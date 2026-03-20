import { router } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

const OnboardingScreen = () => {
  const { colors } = useTheme();
  const logo = require('../../assets/images/AfyaDataLogo.png');
  const insets = useSafeAreaInsets();

  const themedStyles = StyleSheet.create({
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: colors.secText,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    logo: {
      width: 120,
      height: 120,
      resizeMode: 'contain',
    },
    image: {
      width: 200,
      height: 200,
      resizeMode: 'contain',
    },
    // New multi-button container for the last screen
    buttonContainer: {
      width: '100%',
      paddingHorizontal: 40,
      gap: 12,
      marginTop: 20,
    },
    primaryButton: {
      backgroundColor: colors.buttonBackground,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.buttonBackground,
    },
    primaryButtonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },
    secondaryButtonText: {
      color: colors.buttonBackground,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  const Footer = () => (
    <View style={themedStyles.buttonContainer}>
      <TouchableOpacity
        style={themedStyles.primaryButton}
        onPress={() => router.push('/(auth)/register')}
      >
        <Text style={themedStyles.primaryButtonText}>Im New Here</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={themedStyles.secondaryButton}
        onPress={() => router.push('/(auth)/login')}
      >
        <Text style={themedStyles.secondaryButtonText}>I Have an Account</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Onboarding
      showNext={true}
      showSkip={true}
      pages={[
        {
          backgroundColor: colors.background,
          image: <Image source={logo} style={themedStyles.logo} />,
          title: 'Welcome to AfyaData',
          subtitle: 'Empowering communities through participatory health surveillance.',
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
        },
        {
          backgroundColor: colors.background,
          image: <Image source={{ uri: 'https://via.placeholder.com/150' }} style={themedStyles.image} />,
          title: 'Real-Time Data Collection',
          subtitle: 'Report health events promptly to enhance early warning systems.',
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
        },
        {
          backgroundColor: colors.background,
          //image: <Image source={{ uri: 'https://via.placeholder.com/150' }} style={themedStyles.image} />,
          title: 'Get Started',
          subtitle: 'Choose how you would like to proceed.',
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
          image: (
            <View style={{ alignItems: 'center', width: '100%' }}>
              <Image source={logo} style={themedStyles.logo} />
              <Text style={themedStyles.title}>Join AfyaData</Text>
              <Text style={themedStyles.subtitle}>Sign in to your account or create a new one to start reporting.</Text>
              <Footer />
            </View>
          ),
        },
      ]}
      // Disable default buttons on the last page so our custom ones take over
      showPagination={true}
      bottomBarHeight={80}
      onDone={() => { }}
    />
  );
};

export default OnboardingScreen;