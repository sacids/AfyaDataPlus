import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ScreenWrapper } from '../../components/layout/ScreenWrapper';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { evaluateCustomFunctions, replaceVariables } from '../../lib/form/validation';
import { useAuthStore } from '../../store/authStore';
import { useFormStore } from '../../store/FormStore';
import { insert } from '../../utils/database';

const SavePage = () => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { t } = useTranslation();

    const [title, setTitle] = useState('');
    const [gpsLocation, setGpsLocation] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const { user } = useAuthStore();

    const {
        schema,
        formData,
        formUUID,
        parentUUID,
    } = useFormStore();

    // Get current GPS location
    const getCurrentLocation1 = async () => {
        setIsGettingLocation(true);
        try {
            // Request permission
            let { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    t('savePage:permissionDenied'),
                    t('savePage:locationPermissionDenied'),
                    [{ text: t('common.ok') }]
                );
                setIsGettingLocation(false);
                return;
            }

            // Get current position
            let location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 3000, // 10 seconds timeout
            });

            const { latitude, longitude, altitude, accuracy } = location.coords;

            setGpsLocation({
                latitude,
                longitude,
                altitude: altitude || null,
                accuracy,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            console.error('Error getting location:', error);
            Alert.alert(
                t('savePage:locationError'),
                t('savePage:locationErrorDescription'),
                [{ text: t('common.ok') }]
            );
        } finally {
            setIsGettingLocation(false);
        }
    };


    const getCurrentLocation = async (forceHighAccuracy = false) => {
        setIsGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setIsGettingLocation(false);
                return;
            }

            // A. TRY LAST KNOWN LOCATION FIRST (Instant)
            const lastKnown = await Location.getLastKnownPositionAsync();
            
            // If we have a recent last known location (within 5 minutes), use it!
            if (lastKnown && (Date.now() - lastKnown.timestamp < 300000)) {
                setGpsLocation({
                    latitude: lastKnown.coords.latitude,
                    longitude: lastKnown.coords.longitude,
                    altitude: lastKnown.coords.altitude,
                    accuracy: lastKnown.coords.accuracy,
                    timestamp: new Date(lastKnown.timestamp).toISOString(),
                });
                setIsGettingLocation(false);
                return;
            }

            // B. FAST CURRENT POSITION FETCH
            // Using 'Balanced' with a shorter timeout or 'Low' accuracy
            const location = await Location.getCurrentPositionAsync({
                accuracy: forceHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
                // If it takes more than 4 seconds, the user is likely indoors; 
                timeout: 4000, 
            });

            setGpsLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                altitude: location.coords.altitude,
                accuracy: location.coords.accuracy,
                timestamp: new Date().toISOString(),
            });

        } catch (error) {
            console.warn('Fast location failed, trying low accuracy...', error);
            // C. FINAL FAILSAFE: Lowest accuracy (Wifi/Cell only - very fast)
            try {
                const coarseLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Low,
                    timeout: 3000
                });
                setGpsLocation({
                    latitude: coarseLocation.coords.latitude,
                    longitude: coarseLocation.coords.longitude,
                    accuracy: coarseLocation.coords.accuracy,
                    timestamp: new Date().toISOString(),
                });
            } catch (innerError) {
                console.error('All location attempts failed');
            }
        } finally {
            setIsGettingLocation(false);
        }
    };

    const saveForm = async (status) => {
        try {
            // Try to get location if not already obtained
            if (!gpsLocation && status === 'finalized') {
                await getCurrentLocation();
            }

            const main_formData = { ...formData }
            main_formData['app_version'] = Constants.expoConfig?.version;
            main_formData['form_version'] = schema.version;


            await insert("form_data", {
                form: schema.form,
                project: schema.project,
                uuid: formUUID,
                parent_uuid: parentUUID,
                original_uuid: formUUID,
                title: title || t('savePage:untitledRecord'),
                created_by: user?.id,
                created_by_name: user?.fullName ?? user?.id,
                created_on: new Date().toISOString(),
                status: status,
                status_date: new Date().toISOString(),
                deleted: 0,
                synced: 0,
                form_data: JSON.stringify(main_formData),
                gps: gpsLocation ? JSON.stringify(gpsLocation) : null,
            });
            router.dismissTo('/Main');
        } catch (e) {
            console.error(e);
            Alert.alert(t('common.error'), t('savePage:saveFailed'));
        }
    };

    useEffect(() => {
        const instance_name = schema?.meta?.instance_name;
        if (instance_name) {
            const tt1 = replaceVariables(instance_name, formData);
            const tt = evaluateCustomFunctions(tt1, formData);
            setTitle(tt);
        }
        getCurrentLocation();
    }, []);

    return (
        <ScreenWrapper withStepPadding={false}>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* Header Icon Section */}
                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                        <View style={{
                            backgroundColor: theme.colors.primary + '15',
                            padding: 20,
                            borderRadius: 50
                        }}>
                            <MaterialCommunityIcons
                                name="content-save-check-outline"
                                size={50}
                                color={theme.colors.primary}
                            />
                        </View>
                        <Text style={[styles.pageTitle, { marginTop: 15, fontSize: 22 }]}>
                            {t('savePage:finishRecord')}
                        </Text>
                        <Text style={styles.hint}>{t('savePage:recordNameHint')}</Text>
                    </View>

                    {/* Title Input Card */}
                    <View style={styles.container}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>{t('savePage:recordTitle')}</Text>
                        <TextInput
                            placeholder={t('savePage:enterRecordTitle')}
                            style={[styles.inputBase, { fontSize: 18, fontWeight: '600', color: theme.colors.text }]}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* GPS Location Section - Commented out as in original */}
                    {/* <View style={styles.container}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>{t('savePage:gpsLocation')}</Text>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <View style={{ flex: 1 }}>
                                {gpsLocation ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <MaterialIcons name="location-on" size={20} color={theme.colors.primary} />
                                        <Text style={{ marginLeft: 8, color: theme.colors.text }}>
                                            {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                                            {gpsLocation.accuracy && ` (±${gpsLocation.accuracy.toFixed(1)}m)`}
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={{ color: theme.colors.placeholder }}>
                                        {isGettingLocation ? t('savePage:gettingLocation') : t('savePage:noGpsData')}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={getCurrentLocation}
                                disabled={isGettingLocation}
                                style={{
                                    padding: 8,
                                    backgroundColor: theme.colors.primary + '20',
                                    borderRadius: 8,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                <MaterialIcons 
                                    name="gps-fixed" 
                                    size={18} 
                                    color={theme.colors.primary} 
                                />
                                <Text style={{ marginLeft: 4, color: theme.colors.primary, fontSize: 12 }}>
                                    {isGettingLocation ? t('savePage:getting') : t('savePage:getLocation')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[styles.hint, { marginTop: 4 }]}>
                            {t('savePage:gpsHint')}
                        </Text>
                    </View> */}

                    {/* Informational Alert Box */}
                    <View style={{
                        flexDirection: 'row',
                        backgroundColor: '#e3f2fd',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#bbdefb'
                    }}>
                        <MaterialIcons name="info" size={24} color="#1976d2" />
                        <Text style={{
                            flex: 1,
                            marginLeft: 12,
                            color: '#1976d2',
                            fontSize: 13,
                            lineHeight: 18,
                            fontWeight: '500'
                        }}>
                            {t('savePage:finalizationInfo')}
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ marginTop: 40, gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => saveForm('finalized')}
                            style={[styles.button, { backgroundColor: isGettingLocation ? theme.colors.inputBorder : theme.colors.primary , height: 55 }]}
                            disabled={isGettingLocation}
                        >
                            {
                                isGettingLocation ?
                                    (<ActivityIndicator size={20} color="white" />)
                                    :
                                    (<MaterialIcons name="assignment-turned-in" size={20} color="white" />)
                            }
                            <Text style={styles.buttonText}>
                                {isGettingLocation ? t('savePage:gettingLocation') : t('savePage:finalizeRecord')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => saveForm('draft')}
                            style={[
                                styles.button,
                                {
                                    backgroundColor: 'transparent',
                                    borderWidth: 1.5,
                                    borderColor: theme.colors.inputBorder,
                                    height: 55
                                }
                            ]}
                            disabled={isGettingLocation}
                        >
                            <MaterialIcons name="edit-note" size={20} color={theme.colors.text} />
                            <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                                {t('savePage:saveAsDraft')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

export default SavePage;