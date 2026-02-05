// components/layout/AppHeader.js
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';

export const AppHeader = ({
    title,
    subTitle = false,
    rightActions = [],
    searchEnabled = false, // New prop to toggle search capability
    showSearch,
    setShowSearch,
    searchQuery,
    setSearchQuery
}) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    // Only show the search input if search is enabled AND currently active
    if (searchEnabled && showSearch) {
        return (
            <View style={[styles.headerSearchActive, { paddingTop: insets.top }]}>
                <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search..."
                    placeholderTextColor={theme.colors.hint}
                    style={styles.textInput}
                    autoFocus
                />
                <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearch(false); }}>
                    <Ionicons name="close-circle" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.headerContainer]}>
            <TouchableOpacity style={[{ flexDirection: 'row' }]} onPress={() => router.back()}>
                <MaterialIcons name="keyboard-arrow-left" size={24} color={theme.colors.pageTitle} />
                <Text style={styles.pageTitle} numberOfLines={1}>{title}</Text>
            </TouchableOpacity>
            <View style={styles.headerActions}>
                {/* Only render search icon if searchEnabled is true */}
                {searchEnabled && (
                    <TouchableOpacity onPress={() => setShowSearch(true)}>
                        <MaterialIcons name="search" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                )}

                {rightActions.map((action, i) => (
                    <TouchableOpacity key={i} onPress={action.onPress}>
                        <MaterialIcons name={action.icon} size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};