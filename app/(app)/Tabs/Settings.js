import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';


import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';

const SettingsScreen = () => {

    const router = useRouter();
    const [data, setData] = useState([]);
    const [showSearchBar, setShowSearchBar] = useState(false);

    const theme = useTheme();
    const styles = getStyles(theme);


    return (
        <View style={styles.pageContainer}>

            <Text style={styles.pageTitle}>SettingsScreen</Text>
        </View>
    )
}

export default SettingsScreen

