import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { getStyles } from '../constants/styles';
import { useTheme } from '../context/ThemeContext';
import { useFormStore } from '../store/useFormStore';

import { useCallback, useMemo } from 'react';
import RelevanceWrapper from './RelevanceWrapper'; // New component below
import SavePage from './form/SavePage';


import { FlashList } from "@shopify/flash-list";




const FormPage = ({ pageIndex }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const schema = useFormStore(state => state.schema);
  const page = schema?.form_defn?.pages[pageIndex];
  const currentPage = useFormStore(state => state.currentPage);


  const isLastPage = schema ? pageIndex === schema.form_defn.pages.length : false;

  // Simply flatten the fields. Do NOT filter them here.
  const allFieldsOnPage = useMemo(() => {
    if (!page?.fields) return [];
    return page.fields.flatMap((fieldGroup) => Object.values(fieldGroup));
  }, [page]);


  const renderItem = useCallback(({ item }) => {
    return <RelevanceWrapper field={item} />;
  }, []);


  if (isLastPage) {
    return (
      <View style={styles.pageContainer}>
        <SavePage />
      </View>
    );
  }

  if (!page) {
    return (
      <View style={styles.pageContainer}>
        <Text style={styles.errorText}>Invalid page</Text>
      </View>
    );
  }


  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

      <FlashList
        data={allFieldsOnPage}
        renderItem={renderItem}
        contentContainerStyle={styles.scrollContent}
        estimatedItemSize={120} 
        keyExtractor={(item) => item.name}
        removeClippedSubviews={true}
      />
    </KeyboardAvoidingView>
  );
};

export default FormPage;