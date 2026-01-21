import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';

export default function TabLayout() {
    const { colors } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.background,
                    borderTopColor: colors.border,
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
            <Tabs.Screen
                name="FormDataList"
                options={{
                    title: 'Data',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="list" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="DiseaseKonwlegeScreen"
                options={{
                    title: 'Message',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="library-outline" size={size} color={color} />
                    ),
                }}
            />
            {/* Add more tabs as needed */}
        </Tabs>
    );
}