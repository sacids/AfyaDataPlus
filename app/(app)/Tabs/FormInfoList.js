import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';

const FormInfoList = () => {

    const router = useRouter();
    const [data, setData] = useState([]);
    const [showSearchBar, setShowSearchBar] = useState(false);

    const theme = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();



    return (
        <View style={[styles.pageContainer, {paddingTop: insets.top, paddingBottom: insets.bottom}]}>

            <Text style={styles.pageTitle}>FormInfoList</Text>
        </View>
    )
}

export default FormInfoList

