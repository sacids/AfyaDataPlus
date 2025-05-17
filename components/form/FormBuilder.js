import React, { useEffect } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { getStyles } from '../../constants/styles';
import { useTheme } from '../../context/ThemeContext';
import { useFormStore } from '../../store/FormStore';
import FormPage from './FormPage';
import NavigationButtons from './NavigationButtons';

const FormBuilder = ({ schema, config = { useSwipe: true, useButtons: true } }) => {
  const { setSchema, currentPage, validateAndNavigate } = useFormStore();

  const colors = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    setSchema(schema);
  }, [schema]);

  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX < -50) {
        Animated.runOnJS(validateAndNavigate)('next');
      } else if (event.translationX > 50) {
        Animated.runOnJS(validateAndNavigate)('prev');
      }
    })
    .enabled(config.useSwipe ?? true);

  return (
    //<GestureDetector gesture={swipeGesture}>
    <Animated.View style={styles.pageContainer}>
      <FormPage pageIndex={currentPage} />
      {config.useButtons && <NavigationButtons />}
    </Animated.View>
    //</GestureDetector>
  );
};


export default FormBuilder;