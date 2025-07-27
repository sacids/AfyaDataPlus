import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { useFormStore } from '../../../store/FormStore';


const ImagePickerField = ({ element, value }) => {
  const { updateFormData, errors, formUUID } = useFormStore();
  const theme = useTheme();
  const styles = getStyles(theme);

  const folderPath = `${FileSystem.documentDirectory}${formUUID}/`;

  const pickImage = async (fromCamera = false) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Permission is required to select an image.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, base64: false })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.5, base64: false });

    if (!result.canceled) {
      const originalUri = result.assets[0].uri;
      const filename = originalUri.split('/').pop();
      const folderPath = `${FileSystem.documentDirectory}${formUUID}/`;

      try {
        // Ensure folder exists
        const folderInfo = await FileSystem.getInfoAsync(folderPath);
        if (!folderInfo.exists) {
          await FileSystem.makeDirectoryAsync(folderPath, { intermediates: true });
        }

        const newFileName = `${element.name}__${filename}`
        const destPath = `${folderPath}${newFileName}`;
        await FileSystem.copyAsync({ from: originalUri, to: destPath });

        updateFormData(element.name, newFileName); // Save full persistent path
        //console.log(destPath, newFileName)

      } catch (err) {
        console.error('Image saving failed', err);
        Alert.alert('Error', 'Failed to save the image.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{element.label}</Text>

      <View
        style={[
          styles.mapContainer,
          errors[element.name] ? styles.inputError : null,
          {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.inputBackground,
          },
        ]}
      >
        {value ? (
          <Image
            source={{ uri: folderPath + value }}
            style={[{ width: 165, height: 165, borderRadius: 4 }, styles.noLocation]}
          />
        ) : (

          <View style={[styles.map, styles.noLocation]}>
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', flex: 1, gap: 10 }}>
        <TouchableOpacity onPress={() => pickImage(false)} style={[{ flex: 1 }, styles.button]}>
          <Text style={styles.buttonText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pickImage(true)} style={[{ flex: 1 }, styles.button]}>
          <Text style={styles.buttonText}>Camera</Text>
        </TouchableOpacity>
      </View>

      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default ImagePickerField;
