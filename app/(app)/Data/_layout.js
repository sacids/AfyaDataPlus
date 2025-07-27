import { MaterialIcons } from '@expo/vector-icons';
import {
    createMaterialTopTabNavigator
} from '@react-navigation/material-top-tabs';
import { router, useLocalSearchParams, withLayoutContext } from 'expo-router';
import { createContext, useContext } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';


const { Navigator } = createMaterialTopTabNavigator();
const IdContext = createContext();

export const useId = () => useContext(IdContext);

export const MaterialTopTabs = withLayoutContext(Navigator);
const Layout = () => {

    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const { id } = useLocalSearchParams();

    return (

        <IdContext.Provider value={id}>
            <View style={{ paddingTop: insets.top, flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 15, backgroundColor: theme.colors.background }}>
                <MaterialIcons onPress={() => router.back()} name={'arrow-back'} size={24} color={theme.isDark ? 'white' : 'black'} />
                <Text style={{ color: theme.isDark ? 'white' : 'black', fontSize: 16 }}>Data</Text>
            </View>
            <MaterialTopTabs
                screenOptions={{
                    tabBarStyle: { backgroundColor: theme.colors.background },
                    tabBarActiveTintColor: theme.isDark ? 'white' : 'black',
                    tabBarInactiveTintColor: theme.isDark ? '#aaa' : '#444',
                    tabBarIndicatorStyle: {
                        backgroundColor: theme.colors.primary,
                        height: 3, // Thickness of the active indicator
                        borderRadius: 2,
                    },
                }}

            >
                <MaterialTopTabs.Screen name="index" options={{ title: 'Data' }} />
                <MaterialTopTabs.Screen name="messages" options={{ title: 'Messages' }} />
            </MaterialTopTabs>
        </IdContext.Provider>
    )
}

export default Layout;