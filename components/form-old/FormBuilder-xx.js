import React, { useEffect, useRef, useMemo, memo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useFormStore } from '../../store/FormStore';
import FormPage from './FormPage';
import NavigationButtons from './NavigationButtons';

// FIX: Use React.memo to prevent parent re-renders from thrashing the FormBuilder
// eslint-disable-next-line react/display-name
const FormBuilder = memo(({ schema, formData, formUUID, parentUUID = null }) => {
  const setSchema = useFormStore(state => state.setSchema);
  const currentPage = useFormStore(state => state.currentPage);

  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const lastInitializedId = useRef(null);

  useEffect(() => {
    // FIX: Tighten initialization logic to ensure setSchema only runs once per unique form
    // This prevents the infinite loop of prop-updates -> store-updates -> re-renders
    const schemaId = schema?.id || schema?.form;
    
    if (schema && schemaId !== lastInitializedId.current) {
        lastInitializedId.current = schemaId;
        
        // Use requestAnimationFrame to move store updates out of the immediate render cycle
        // This gives the Fabric engine time to settle the initial layout
        requestAnimationFrame(() => {
            setSchema(schema, formData, formUUID, parentUUID);
        });
    }
  }, [schema, formUUID]); 

  // FIX: Use a flattened layout. Avoid nesting Animated.View if styles.pageContainer already has deep views.
  // We add a simple entering animation to smooth the transition between pages.
  return (
    <Animated.View 
      entering={FadeIn.duration(200)} 
      style={styles.pageContainer}
    >
      <FormPage pageIndex={currentPage} />
      
      {/* Ensure NavigationButtons are outside the FormPage tree to keep the stack shallow */}
      <NavigationButtons />
    </Animated.View>
  );
});

export default FormBuilder;