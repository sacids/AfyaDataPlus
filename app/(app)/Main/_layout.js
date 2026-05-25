import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';

export default function TabLayout() {
    const { colors } = useTheme();
    const { currentData, getCurrentFormDef, hasChildren, currentFormChildren } = useProjectStore();
    const [workflowEnabled, setWorkflowEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFormDef = async () => {
            setLoading(true);
            try {
                const formDef = await getCurrentFormDef();

                // 1. Identify which column holds your JSON payload string
                // Based on common database setups and your logs, check these candidates:
                const rawJsonString = formDef?.form_data || formDef?.form || formDef?.form_defn;

                if (!rawJsonString) {
                    console.warn('Could not find a valid JSON string column on formDef:', formDef);
                    setWorkflowEnabled(false);
                    return;
                }

                // 2. Parse the target JSON payload string safely
                const parsedForm = JSON.parse(rawJsonString);
                const workflow = parsedForm?.workflow || null;

                setWorkflowEnabled(!!workflow?.enabled);
                console.log('Workflow status updated successfully. Enabled:', !!workflow?.enabled);

            } catch (error) {
                console.error('Error fetching form definition:', error);
                setWorkflowEnabled(false);
            } finally {
                setLoading(false);
            }
        };

        fetchFormDef();
    }, [currentData]);



    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.background
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.secText,
            }}
        >
            <Tabs.Screen
                name="Index"
                options={{
                    title: 'Info',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="view-dashboard-outline" size={size} color={color} />
                    ),
                }}
            />

            {(!currentData || (currentData && currentFormChildren !== null && currentFormChildren !== '') || hasChildren) ? (
                <Tabs.Screen
                    name="FormDataList"
                    options={{
                        title: 'Data',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="list" size={size} color={color} />
                        ),
                    }}
                />
            ) : (
                <Tabs.Screen
                    name="FormDataList"
                    options={{
                        title: 'Data',
                        href: null,
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons name="list" size={size} color={color} />
                        ),
                    }}
                />
            )}

            {workflowEnabled ? (
                <Tabs.Screen
                    name="workflow"
                    options={{
                        title: 'Workflow',
                        tabBarIcon: ({ color, size }) => (
                            <MaterialCommunityIcons
                                name="source-branch"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
            ) : (
                <Tabs.Screen
                    name="workflow"
                    options={{
                        title: 'Workflow',
                        href: null,
                        tabBarIcon: ({ color, size }) => (
                            <MaterialCommunityIcons
                                name="source-branch"
                                size={size}
                                color={color}
                            />

                        ),
                    }}
                />
            )}


            {currentData ? (
                <Tabs.Screen
                    name="MessagesScreen"
                    options={{
                        title: 'Message',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons
                                name="chatbubble-outline"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
            ) : (
                <Tabs.Screen
                    name="MessagesScreen"
                    options={{
                        title: 'Message',
                        href: null,
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons
                                name="chatbubble-outline"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
            )}







            {!currentData ? (
                <Tabs.Screen
                    name="DiseaseKnowledgeScreen"
                    options={{
                        title: 'Knowledge',
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons
                                name="library-outline"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
            ) : (
                <Tabs.Screen
                    name="DiseaseKnowledgeScreen"
                    options={{
                        title: 'Knowledge',
                        href: null,
                        tabBarIcon: ({ color, size }) => (
                            <Ionicons
                                name="library-outline"
                                size={size}
                                color={color}
                            />
                        ),
                    }}
                />
            )}

        </Tabs>
    );
}