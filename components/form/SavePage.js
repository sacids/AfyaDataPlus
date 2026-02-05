import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

    const [title, setTitle] = useState('');
    const { user } = useAuthStore();

    const {
        schema,
        formData,
        formUUID,
        parentUUID,
    } = useFormStore();

    const saveForm = async (status) => {
        try {
            await insert("form_data", {
                form: schema.form,
                project: schema.project,
                uuid: formUUID,
                parent_uuid: parentUUID,
                original_uuid: formUUID,
                title: title || "Untitled Record",
                created_by: user?.id,
                created_by_name: user?.fullName ?? user?.id,
                created_on: new Date().toISOString(),
                status: status,
                status_date: new Date().toISOString(),
                deleted: 0,
                synced: 0,
                form_data: JSON.stringify(formData),
            });
            router.dismissTo('/Main');
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const instance_name = schema?.meta?.instance_name;
        if (instance_name) {
            const tt1 = replaceVariables(instance_name, formData);
            const tt = evaluateCustomFunctions(tt1, formData);
            setTitle(tt);
        }
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
                            Finish Record
                        </Text>
                        <Text style={styles.hint}>Give your record a recognizable name</Text>
                    </View>

                    {/* Title Input Card */}
                    <View style={styles.container}>
                        <Text style={[styles.label, { marginBottom: 8 }]}>Record Title</Text>
                        <TextInput
                            placeholder="Enter record title..."
                            style={[styles.inputBase, { fontSize: 18, fontWeight: '600', color: theme.colors.text }]}
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

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
                            Finalizing marks this record as complete. You can `Save as Draft` if you plan to edit this information later.
                        </Text>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ marginTop: 40, gap: 12 }}>
                        <TouchableOpacity
                            onPress={() => saveForm('finalized')}
                            style={[styles.button, { backgroundColor: theme.colors.primary, height: 55 }]}
                        >
                            <MaterialIcons name="assignment-turned-in" size={20} color="white" />
                            <Text style={styles.buttonText}>Finalize Record</Text>
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
                        >
                            <MaterialIcons name="edit-note" size={20} color={theme.colors.text} />
                            <Text style={[styles.buttonText, { color: theme.colors.text }]}>Save as Draft</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
};

export default SavePage;