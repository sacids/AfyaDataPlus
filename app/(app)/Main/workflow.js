
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import { getFormData } from '../../../utils/database';

// Import components and styles from List.js
import { FlashList } from '@shopify/flash-list';
import { replace } from 'expo-router/build/global-state/routing';
import CurrentDataView from '../../../components/form/CurrentDataView';
import { AppHeader } from '../../../components/layout/AppHeader';
import { FormIcons } from '../../../components/layout/FormIcons';
import { ScreenWrapper } from '../../../components/layout/ScreenWrapper';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { useAuthStore } from '../../../store/authStore';
import useProjectStore from '../../../store/projectStore';
import { router } from 'expo-router';



export default function WorkFlowScreen() {
    
    const { currentData, currentProject, setCurrentData } = useProjectStore();
    const [workflowData, setWorkflowData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentFormDataId, setCurrentFormDataId] = useState(null);
    const theme = useTheme();
    const styles = getStyles(theme);

    const { user } = useAuthStore()

    const fetchWorkflowData = useCallback(async () => {
        if (currentData) {
            try {
                const workflowdata = await getFormData(
                    user?.globalUsername,
                    currentProject?.project,
                    currentData.original_uuid,
                    true // Pass true to include workflow forms
                );
                setWorkflowData(workflowdata);
                setLoading(false);
                //console.log('Workflow data fetched successfully:', workflowdata);
            } catch (error) {
                console.error('Error fetching workflow data:', error);
            }
        }
    }, [currentData, currentProject]);

    useEffect(() => {
        setLoading(true);
        try {
            fetchWorkflowData();
        } catch (error) {
            console.error('Error in useEffect fetching workflow data:', error);
        } finally {
            console.log('Finished fetching workflow data, setting loading to false');
            setLoading(false);
        }
    }, [currentData, fetchWorkflowData]);

    const renderWorkflowItem = ({ item, index }) => {

        //console.log('rendring workflow item', item);
        return (

            <View key={index}>
                <TouchableOpacity onPress={() => currentFormDataId === item.id ? setCurrentFormDataId(null) : setCurrentFormDataId(item.id)}>
                    <View style={[styles.inputBase, { flexDirection: 'row', alignContent: 'center', alignItems: 'center' }]}>

                        <FormIcons
                            iconName={item.icon}
                            size={30}
                            color={theme.colors.primary}
                        />

                        <View style={{ flex: 1, marginHorizontal: 10 }}>
                            <Text style={styles.label}>{item.form_title}</Text>

                            <Text style={styles.tiny}>
                                {item.title}
                            </Text>
                        </View>

                    </View>
                </TouchableOpacity>

                {currentFormDataId === item.id && (
                    <View style={{ borderLeftWidth: 1, borderLeftColor: theme.colors.inputBorder, borderStyle: 'dashed', marginLeft: 10, paddingTop: 15, paddingLeft: 15 }}>
                        <CurrentDataView formData={item} />
                    </View>
                )}
            </View>
        );
    }

    if (loading) {
        return (
            <ScreenWrapper>
                <ActivityIndicator size="large" />
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>

            <AppHeader
                title='Workflow'
                backLink={
                    () => {
                        setCurrentData(null);
                        router.replace('/(app)/Main/');
                    }
                }
                searchEnabled={false}
            />

            {workflowData.length > 0 ? (
                <FlashList
                    data={workflowData}
                    renderItem={renderWorkflowItem}
                    keyExtractor={(item) => item.uuid}
                    contentContainerStyle={{ padding: 10 }}
                    estimatedItemSize={100} // FlashList requires an estimated size for performance
                />
            ) : (
                // 2. Fallback if loading is done but no data was found
                <View style={{}}>
                    <Text>No workflow data found.</Text>
                </View>
            )}
        </ScreenWrapper>
    );
}