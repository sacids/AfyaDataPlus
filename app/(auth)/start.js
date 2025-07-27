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
    button: {
      backgroundColor: colors.buttonBackground,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignSelf: 'center',
      marginTop: 20,
    },
    buttonText: {
      color: colors.buttonText,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

  const handleDone = () => {
    router.replace('/register'); // Navigate to registration
  };

  const DotComponent = ({ selected }) => (
    <View
      style={{
        width: 8,
        height: 8,
        marginHorizontal: 3,
        backgroundColor: selected ? colors.primary : '#666',
        borderRadius: 4,
      }}
    />
  );

  return (
    <Onboarding
      DotComponent={DotComponent}
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
          image: (
            <Image
              source={{ uri: 'https://via.placeholder.com/150' }} // Replace with relevant image
              style={themedStyles.image}
            />
          ),
          title: 'Real-Time Data Collection',
          subtitle: 'Report health events promptly to enhance early warning systems.',
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
        },
        {
          backgroundColor: colors.background,
          image: (
            <Image
              source={{ uri: 'https://via.placeholder.com/150' }} // Replace with relevant image
              style={themedStyles.image}
            />
          ),
          title: 'Stay Informed',
          subtitle:
            'Receive timely feedback and health information to support your community.',
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
          renderNext: () => (
            <TouchableOpacity
              style={themedStyles.button}
              onPress={handleDone}
            //activeOpacity={0.8}
            >
              <Text style={themedStyles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          ),
          showSkip: true,
        },
      ]}

      onSkip={handleDone}
      onDone={handleDone}
      nextLabel="Next"
      skipLabel="Skip"
      bottomBarHighlight={false}
      containerStyles={{ paddingBottom: insets.bottom }}
    />
  );
};

export default OnboardingScreen;
