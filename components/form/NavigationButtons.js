import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useFormStore } from '../../store/FormStore';

const NavigationButtons = () => {
    const { currentPage, schema, validateAndNavigate } = useFormStore();
    const isLastPage = schema ? currentPage === schema.pages.length : false;

    const colors = useTheme();


    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={[styles.container, { justifyContent: 'space-between', flexDirection: 'row', paddingVertical: 2, paddingHorizontal: 10 }]}>

            <TouchableOpacity
                style={[styles.navButton, { flex: 1, margin: 5 }, currentPage === 0 && { backgroundColor: theme.colors.inputBackground }]}
                onPress={() => validateAndNavigate('prev')}
                disabled={currentPage === 0}
            >
                <Text style={[styles.navButtonText]}>Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.navButton, { flex: 1, margin: 5 }, isLastPage && { backgroundColor: theme.colors.inputBackground }]}
                onPress={() =>
                    isLastPage ? alert('Submit Form') : validateAndNavigate('next')
                }
                disabled={isLastPage}
            >
                <Text style={[styles.navButtonText]}>Next</Text>
            </TouchableOpacity>
        </View>
    );
};


export default NavigationButtons;