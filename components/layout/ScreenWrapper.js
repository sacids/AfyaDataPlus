// components/layout/ScreenWrapper.js
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme }  from '../../context/ThemeContext';
import { getStyles } from '../../constants/styles';

export const ScreenWrapper = ({ children, style, withStepPadding = true }) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();
    const globalStyles = getStyles(theme);

    return (
        <View style={[
            globalStyles.pageContainer, 
            { paddingTop: withStepPadding ? insets.top : 0 }, 
            style
        ]}>
            {children}
        </View>
    );
};