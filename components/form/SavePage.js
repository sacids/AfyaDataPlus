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
import { evaluateODKExpression } from '../../lib/form/odkEngine';
import { processFormRules } from '../../lib/form/ruleProcessor';
import { useAuthStore } from '../../store/authStore';
import { useFormStore } from '../../store/useFormStore';
import { insert, select } from '../../utils/database';

const SavePage = () => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { t } = useTranslation();

    const [title, setTitle] = useState('');
    const [gpsLocation, setGpsLocation] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const { user } = useAuthStore();

    const formData = useFormStore(state => state.formData);
    const schema = useFormStore(state => state.schema);
    const formUUID = useFormStore(state => state.formUUID);
    const parentUUID = useFormStore(state => state.parentUUID);

    // Improved: Now returns the location so we can use it immediately
    const getCurrentLocation = async (forceHighAccuracy = false) => {
        setIsGettingLocation(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('common.error'), t('savePage:locationPermissionDenied') || 'Location permission denied');
                return null;
            }

            let location = null;

            // A. Try last known location first (very fast)
            const lastKnown = await Location.getLastKnownPositionAsync();
            if (lastKnown && (Date.now() - lastKnown.timestamp < 300000)) { // within 5 minutes
                location = {
                    latitude: lastKnown.coords.latitude,
                    longitude: lastKnown.coords.longitude,
                    altitude: lastKnown.coords.altitude,
                    accuracy: lastKnown.coords.accuracy,
                    timestamp: new Date(lastKnown.timestamp).toISOString(),
                };
            } else {
                // B. Get current position
                const current = await Location.getCurrentPositionAsync({
                    accuracy: forceHighAccuracy ? Location.Accuracy.High : Location.Accuracy.Balanced,
                    timeout: 8000,        // increased slightly for reliability
                });

                location = {
                    latitude: current.coords.latitude,
                    longitude: current.coords.longitude,
                    altitude: current.coords.altitude,
                    accuracy: current.coords.accuracy,
                    timestamp: new Date().toISOString(),
                };
            }

            setGpsLocation(location);
            return location;   // ← Important: return the value

        } catch (error) {
            console.warn('Primary location failed, trying low accuracy...', error);

            // C. Failsafe: Low accuracy (WiFi/Cell)
            try {
                const coarse = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Low,
                    timeout: 5000,
                });

                const location = {
                    latitude: coarse.coords.latitude,
                    longitude: coarse.coords.longitude,
                    accuracy: coarse.coords.accuracy,
                    timestamp: new Date().toISOString(),
                };

                setGpsLocation(location);
                return location;
            } catch (innerError) {
                console.error('All location attempts failed:', innerError);
                Alert.alert(t('common.error'), t('savePage:locationFailed') || 'Could not get location');
                return null;
            }
        } finally {
            setIsGettingLocation(false);
        }
    };

    useEffect(() => {
        if (schema?.form_defn?.meta?.instance_name) {
            try {
                const generatedTitle = evaluateODKExpression(schema.form_defn.meta.instance_name, formData);
                setTitle(generatedTitle || schema.title);
            } catch (e) {
                setTitle(schema.title);
            }
        } else {
            setTitle(schema?.title || 'Untitled Record');
        }


        return () => {
            // Optional cleanup when the screen loses focus
        };
    }, [schema, formData]);

    const saveForm = async (status) => {
        try {
            let finalGps = gpsLocation;

            // Get fresh location for finalized records if we don't have one yet
            if (!finalGps && status === 'finalized') {
                finalGps = await getCurrentLocation();
            }

            //console.log('Final GPS before save:', finalGps);

            const main_formData = {
                ...formData,
                app_version: Constants.expoConfig?.version,
                form_version: schema.version,
            };

            await insert("form_data", {
                form: schema.form_id,
                project: schema.project,
                uuid: formUUID,
                parent_uuid: parentUUID,
                original_uuid: formUUID,
                title: title || t('savePage:untitledRecord'),
                created_by: user?.globalUsername,
                created_by_name: user?.fullName ?? user?.globalUsername,
                created_on: new Date().toISOString(),
                status: status,
                status_date: new Date().toISOString(),
                seen_by: user?.globalUsername,
                deleted: 0,
                synced: 0,
                form_data: JSON.stringify(main_formData),
                gps: finalGps ? JSON.stringify(finalGps) : null,
            });



            if (status === 'finalized') {
                // Fetch rules for this specific ODK form_id
                const rules = await select('form_reactions', 'form = ?', [schema.form_id]);

                if (rules && rules.length > 0) {
                    const actions = processFormRules(main_formData, rules);
                    //console.log('actions', actions)

                    // Collect all chat responses
                    const chatResponses = [];

                    for (const action of actions) {
                        if (action.action_type === 'chat_response') {
                            chatResponses.push(action.message);
                        }

                        // Handle other types like 'navigation' if necessary
                        if (action.action_type === 'navigation') {
                            console.log("Rule triggered navigation to:", action.metadata.screen);
                        }
                    }

                    // If there are chat responses, combine them into one message
                    if (chatResponses.length > 0) {
                        let combinedMessage = '';
                        if (chatResponses.length === 1) {
                            combinedMessage = chatResponses[0];
                        } else {
                            const numberedSteps = chatResponses.map((msg, index) => `${index + 1}. ${msg}`);
                            combinedMessage = numberedSteps.join('\n\n');
                        }

                        // Insert single combined message into messages table
                        await insert('messages', {
                            local_id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            formDataUUID: formUUID,
                            text: combinedMessage,
                            sender_id: '1000000000', // System sender ID (can be any fixed value since it's not a real user)
                            sender_name: 'afyadata_system',
                            sync_status: 'pending' // System messages can be marked as pending or local
                        });
                    }
                }
            }


            router.replace('/Main');
        } catch (e) {
            console.error(e);
            Alert.alert(t('common.error'), t('savePage:saveFailed'));
        }
    };

    return (
        <ScreenWrapper withStepPadding={false} style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Header */}
                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                        <View style={{ backgroundColor: theme.colors.primary + '15', padding: 20, borderRadius: 50 }}>
                            <MaterialCommunityIcons name="content-save-check-outline" size={50} color={theme.colors.primary} />
                        </View>
                        <Text style={[styles.pageTitle, { marginTop: 15, fontSize: 22 }]}>
                            {t('savePage:finishRecord')}
                        </Text>
                        <Text style={styles.hint}>{t('savePage:recordNameHint')}</Text>
                    </View>

                    {/* Title Input */}
                    <View style={styles.container}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>{t('savePage:recordTitle')}</Text>
                        <TextInput
                            placeholder={t('savePage:enterRecordTitle')}
                            style={[styles.inputBase, { fontSize: 18, fontWeight: '600', color: theme.colors.text }]}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* GPS Section (Uncomment if you want to show it to user) */}
                    {/* ... your GPS UI here if needed ... */}

                    {/* Info Box */}
                    <View style={{
                        flexDirection: 'row',
                        backgroundColor: '#e3f2fd',
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: '#bbdefb'
                    }}>
                        <MaterialIcons name="info" size={24} color="#1976d2" />
                        <Text style={{ flex: 1, marginLeft: 12, color: '#1976d2', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                            {t('savePage:finalizationInfo')}
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ marginTop: 40, gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => saveForm('finalized')}
                            style={[styles.button, {
                                backgroundColor: isGettingLocation ? theme.colors.inputBorder : theme.colors.primary,
                                height: 55
                            }]}
                            disabled={isGettingLocation}
                        >
                            {isGettingLocation ? (
                                <ActivityIndicator size={20} color="white" />
                            ) : (
                                <MaterialIcons name="assignment-turned-in" size={20} color="white" />
                            )}
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