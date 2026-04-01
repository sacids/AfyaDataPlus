import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import useProjectStore from '../../../store/projectStore';

export default function TabLayout() {
    const { colors } = useTheme();
    const { currentData, currentFormChildren } = useProjectStore();
    //console.log('current form', currentFormChildren)

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


            {(!currentData || (currentData && currentFormChildren !== null)) ? (
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