import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../constants/styles';
import { useTheme } from '../context/ThemeContext';
import { useFormStore } from '../store/useFormStore';

const NavigationButtons = () => {

  const currentPage = useFormStore(state => state.currentPage);
  const schema = useFormStore(state => state.schema);
  const nextPage = useFormStore(state => state.nextPage);
  const prevPage = useFormStore(state => state.prevPage);

  const isLastPage = schema ? currentPage === (schema.form_defn.pages.length) : false;
  const isFirstPage = currentPage === 0;

  const { t } = useTranslation();

  const theme = useTheme();
  const styles = getStyles(theme);


  return (
    <View style={[styles.container, {
      justifyContent: 'space-between',
      flexDirection: 'row',
      paddingVertical: 2,
      paddingHorizontal: 10
    }]}>

      <TouchableOpacity
        style={[
          styles.navButton,
          { flex: 1, margin: 5 },
          isFirstPage && { backgroundColor: theme.colors.inputBackground }
        ]}
        onPress={() => prevPage()}
        disabled={isFirstPage}
      >
        <Text style={styles.navButtonText}>
          {t('navigation:prev')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.navButton,
          { flex: 1, margin: 5 },
          isLastPage && { backgroundColor: theme.colors.inputBackground }
        ]}
        onPress={() =>
          isLastPage ? alert(t('navigation:submitForm')) : nextPage()
        }
        disabled={isLastPage}
      >
        <Text style={styles.navButtonText}>
          {t('navigation:next')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};


export default NavigationButtons;