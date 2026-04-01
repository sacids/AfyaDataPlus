import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import LanguageManager from '../../i18n/languageManager';

const logo = require('../../assets/images/AfyaDataLogo.png');

// FIX: Move styles outside to prevent the re-render loop seen in logs
const createStyles = (colors, insets) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: insets.top,
    paddingHorizontal: 20
  },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: colors.secText, textAlign: 'center', paddingHorizontal: 20 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.inputBackground,
    marginBottom: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  // Flattened footer styles to reduce ShadowNode depth
  footerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: '100%',
    gap: 12
  },
  primaryButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  secondaryButton: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  buttonText: { color: colors.buttonText, fontSize: 16, fontWeight: 'bold' },
  secButtonText: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  dot: { width: 8, height: 8, marginHorizontal: 3, borderRadius: 4 }
});

const OnboardingScreen = () => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [step, setStep] = useState('language');
  const mounted = useRef(true);

  // Memoize styles to ensure object identity stays the same between renders
  const themedStyles = useMemo(() => createStyles(colors, insets), [colors, insets]);

  useEffect(() => {
    const fetchLanguages = async () => {
      const languages = await LanguageManager.fetchDownloadedLanguages();
      if (mounted.current) {
        setAvailableLanguages(languages);
      }
    };
    fetchLanguages();
    return () => { mounted.current = false; };
  }, []);

  const handleLanguageSelect = async (code) => {
    await i18n.changeLanguage(code);
    await SecureStore.setItemAsync('onboarding_completed', 'true');
    if (mounted.current) setStep('walkthrough');
  };

  // Simplified navigation handlers to avoid deep nesting
  const navigateToAuth = (path) => {
    router.push(path);
  };

  if (step === 'language') {
    return (
      <View style={themedStyles.container}>
        <Image source={logo} style={{ width: 120, height: 120, alignSelf: 'center', marginTop: 60, marginBottom: 30, resizeMode: 'contain' }} />
        <Text style={themedStyles.title}>{t('common:selectLanguage') || "Select Language"}</Text>
        <Text style={[themedStyles.subtitle, { marginBottom: 30 }]}>Please choose your preferred language to proceed.</Text>

        <FlatList
          data={availableLanguages}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity style={themedStyles.langCard} onPress={() => handleLanguageSelect(item.code)}>
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

  // Extracted sub-components to keep the main tree shallow
  const DotComponent = ({ selected }) => (
    <View style={[themedStyles.dot, { backgroundColor: selected ? colors.primary : colors.secText }]} />
  );

  const SkipButton = (props) => (
    <TouchableOpacity {...props} style={{ marginHorizontal: 20 }}>
      <Text style={{ color: colors.primary, fontSize: 16 }}>{t('common:skip')}</Text>
    </TouchableOpacity>
  );

  const DoneButton = () => (
    <TouchableOpacity onPress={() => navigateToAuth('/(auth)/login')} style={{ marginHorizontal: 20 }}>
      <Text style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>{t('common:done') || "Done"}</Text>
    </TouchableOpacity>
  );

  return (
    <Onboarding
      DotComponent={DotComponent}
      SkipButtonComponent={SkipButton}
      DoneButtonComponent={DoneButton}
      // Fixed: Pass insets to bottomBarHeight to avoid internal SafeAreaView issues
      bottomBarHeight={60 + insets.bottom}
      onSkip={() => setStep('walkthrough')}
      onDone={() => navigateToAuth('/(auth)/login')}
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
          image: <MaterialCommunityIcons name="sync" size={100} color={colors.primary} />,
          title: t('onBoarding:step2Title'),
          subtitle: t('onBoarding:step2Subtitle'),
          titleStyles: themedStyles.title,
          subTitleStyles: themedStyles.subtitle,
        },
        {
          backgroundColor: colors.background,
          // FIX: Flattened this page. Removing the complex Footer from the 'image' prop
          image: <Image source={logo} style={{ width: 100, height: 100, resizeMode: 'contain' }} />,
          title: t('onBoarding:finalTitle'),
          subtitle: (
            <View style={themedStyles.footerContainer}>
              <Text style={themedStyles.subtitle}>{t('onBoarding:finalSubtitle')}</Text>
              <TouchableOpacity style={themedStyles.primaryButton} onPress={() => navigateToAuth('/(auth)/register')}>
                <Text style={themedStyles.buttonText}>{t('onBoarding:registerAction')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={themedStyles.secondaryButton} onPress={() => navigateToAuth('/(auth)/login')}>
                <Text style={themedStyles.secButtonText}>{t('onBoarding:loginAction')}</Text>
              </TouchableOpacity>
            </View>
          ),
          titleStyles: themedStyles.title,
        },
      ]}
      containerStyles={{ paddingBottom: insets.bottom }}
    />
  );
};

export default OnboardingScreen;