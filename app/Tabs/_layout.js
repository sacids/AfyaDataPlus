import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Platform } from "react-native";

import { useTheme } from '../../context/ThemeContext';



export default function TabsLayout() {


    const theme = useTheme();

    useEffect(() => {
        if (Platform.OS === 'android') {
            const setNavBarColor = async () => {
                try {
                    await NavigationBar.setBackgroundColorAsync(theme.colors.background);
                    await NavigationBar.setButtonStyleAsync('light'); // Use 'light' for dark backgrounds
                } catch (error) {
                    console.error('Failed to set navigation bar color:', error);
                }
            };
            setNavBarColor();
        }
    }, []);


    return (
        <Tabs
            screenOptions={{
                headerShown: false,

                tabBarStyle: {
                    borderColor: theme.colors.background,
                    borderTopColor: theme.colors.background,
                    backgroundColor: theme.colors.background,
                    height: 65,
                    paddingTop: 10,

                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    marginBottom: 8,
                },
                padding: 15,

                tabBarActiveTintColor: theme.colors.tabBarActiveTintColor,
                tabBarInactiveTintColor: theme.colors.tabBarInactiveTintColor,
            }}
        >
            <Tabs.Screen
                name="FormDataList"
                options={{
                    title: 'Data',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="dots-grid" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="FormInfoList"
                options={{
                    title: 'Knowledge',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="library-outline" color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="Messages"
                options={{
                    title: 'Messages',
                    href: null,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="chatbox-ellipses-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="Settings"
                options={{
                    title: 'Settings',
                    href: null,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}