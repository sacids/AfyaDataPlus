import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import LanguageManager from '../../i18n/languageManager';

const logo = require('../../assets/images/AfyaDataLogo.png');

const OnboardingScreen = () => {
  console.log('in onboarding screen');
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [step, setStep] = useState('language'); // 'language' or 'walkthrough'
  const mounted = useRef(true);

  useEffect(() => {
    console.log('fetch languages');
    const fetchLanguages = async () => {
      const languages = await LanguageManager.fetchDownloadedLanguages();
      if (mounted.current) {
        setAvailableLanguages(languages);
      }
    };
    fetchLanguages();

    return () => {
      mounted.current = false;
    };
  }, []);

  const handleLanguageSelect = async (code) => {
    await i18n.changeLanguage(code);
    console.log('setting onboarding completed')
    await SecureStore.setItemAsync('onboarding_completed', 'true');
    if (mounted.current) {
      setStep('walkthrough');
    }
  };

  const handleSkip = () => {
    // Handle skip - go directly to login/register
    console.log('Skip pressed');
    // You can either go to login or show the final screen
    // For now, let's go to the final screen
    if (mounted.current) {
      setStep('walkthrough');
    }
  };

  const handleDone = () => {
    // This is called when user goes through all pages
    console.log('Done pressed');
    // Navigate to register or show options
  };

  const themedStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 10 },
    subtitle: { fontSize: 16, color: colors.secText, textAlign: 'center', paddingHorizontal: 20 },
    langCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
      marginBottom: 8,
      width: '100%',
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    buttonContainer: { width: '100%', paddingHorizontal: 40, gap: 12, marginTop: 20 },
    primaryButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
    secondaryButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
    buttonText: { color: colors.buttonText, fontSize: 16, fontWeight: 'bold' },
    secButtonText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' }
  });

  if (step === 'language') {
    return (
      <View style={[themedStyles.container, { paddingTop: insets.top, paddingHorizontal: 20 }]}>
        <Image source={logo} style={{ width: 120, height: 120, alignSelf: 'center', marginTop: 60, marginBottom: 30, resizeMode: 'contain' }} />
        <Text style={themedStyles.title}>Select Language</Text>
        <Text style={[themedStyles.subtitle, { marginBottom: 30 }]}>Please choose your preferred language to proceed with the setup.</Text>

        <FlatList
          data={availableLanguages}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={themedStyles.langCard}
              onPress={() => handleLanguageSelect(item.code)}
            >
              <View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{item.nativeName}</Text>
                <Text style={{ color: colors.hint, fontSize: 12 }}>{item.name}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  const Footer = () => (
    <View style={themedStyles.buttonContainer}>
      <TouchableOpacity style={themedStyles.primaryButton} onPress={() => router.push('/(auth)/register')}>
        <Text style={themedStyles.buttonText}>{t('onBoarding:registerAction')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={themedStyles.secondaryButton} onPress={() => router.push('/(auth)/login')}>
        <Text style={themedStyles.secButtonText}>{t('onBoarding:loginAction')}</Text>
      </TouchableOpacity>
    </View>
  );

  const DotComponent = ({ selected }) => (
    <View
      style={{
        width: 8,
        height: 8,
        marginHorizontal: 3,
        backgroundColor: selected ? colors.primary : colors.secText,
        borderRadius: 4,
      }}
    />
  );

  // Custom Skip Button
  const SkipButton = ({ ...props }) => (
    <TouchableOpacity {...props} style={{ marginHorizontal: 20 }}>
      <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common:skip') || "Skip"}</Text>
    </TouchableOpacity>
  );

  // Custom Next Button
  const NextButton = ({ ...props }) => (
    <TouchableOpacity {...props} style={{ marginHorizontal: 20 }}>
      <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common:next') || "Next"}</Text>
    </TouchableOpacity>
  );

  // Custom Done Button
  const DoneButton = ({ ...props }) => (
    <TouchableOpacity {...props} style={{ marginHorizontal: 20 }}>
      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Get Started</Text>
    </TouchableOpacity>
  );

  return (
    <Onboarding
      DotComponent={DotComponent}
      SkipButtonComponent={SkipButton}
      NextButtonComponent={NextButton}
      DoneButtonComponent={DoneButton}
      bottomBarHeight={60 + insets.bottom}
      showPagination={true}
      bottomBarHighlight={false}
      showSkip={true}
      showNext={true}
      showDone={true}
      skipLabel={t('common:skip') || "Skip"}
      nextLabel={t('common:next') || "Next"}
      onSkip={handleSkip}
      onDone={handleDone}
      pages={[
        {
          backgroundColor: colors.background,
          image: <Image source={logo} style={{ width: 120, height: 120, resizeMode: 'contain' }} />,
          title: t('onBoarding:welcomeTitle'),
          subtitle: t('onBoarding:welcomeSubtitle'),
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
        },
        {
          backgroundColor: colors.background,
          image: <MaterialCommunityIcons name="shield-check" size={100} color={colors.primary} />,
          title: 'Real-Time Data Collection',
          subtitle: 'Report health events promptly to enhance early warning systems.',
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
        },
        {
          backgroundColor: colors.background,
          image: <MaterialCommunityIcons name="shield-check" size={100} color={colors.primary} />,
          title: t('onBoarding:step2Title'),
          subtitle: t('onBoarding:step2Subtitle'),
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
        },
        {
          backgroundColor: colors.background,
          image: (
            <View style={{ alignItems: 'center', width: '100%' }}>
              <Image source={logo} style={{ width: 120, height: 120, resizeMode: 'contain', marginBottom: 20 }} />
              <Text style={themedStyles.title}>{t('onBoarding:finalTitle')}</Text>
              <Text style={themedStyles.subtitle}>{t('onBoarding:finalSubtitle')}</Text>
              <Footer />
            </View>
          ),
          title: '',
          subtitle: '',
        },
      ]}
      containerStyles={{ paddingBottom: insets.bottom }}
    />
  );
};

export default OnboardingScreen;