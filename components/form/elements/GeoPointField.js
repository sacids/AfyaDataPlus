import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { useFormStore } from '../../../store/FormStore';

const GeoPoint = ({ element, value }) => {
  const { updateFormData, errors, language } = useFormStore();
  const [locationPermission, setLocationPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const theme = useTheme();
  const styles = getStyles(theme);

  // Ensure value is an object { latitude, longitude } or null
  const geoValue = value && typeof value === 'object' && value.latitude && value.longitude ? value : null;

  // Request location permissions on mount
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    })();
  }, []);

  const setCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert('Permission Denied', 'Location permission is required to set a geopoint.');
      return;
    }

    setIsLoading(true);
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newGeoPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
      updateFormData(element.name, newGeoPoint);
    } catch (error) {
      Alert.alert('Error', 'Failed to get location: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearGeoPoint = () => {
    Alert.alert(
      'Remove Geopoint',
      'Are you sure you want to remove this location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => updateFormData(element.name, null),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{element['label' + language]}</Text>
      <View
        style={[
          styles.mapContainer,
          errors[element.name] ? styles.inputError : null,
        ]}
      > 
        {geoValue ? (
          <>
            <MapView
              style={styles.map}
              liteMode={true}
              region={{
                latitude: geoValue.latitude,
                longitude: geoValue.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              <Marker
                coordinate={geoValue}
                title={element['label' + language]}
                onLongPress={clearGeoPoint}
              />
            </MapView>
            <Text style={styles.locationText}>{geoValue.latitude}, {geoValue.longitude}, {geoValue.accuracy}</Text>
          </>
        ) : (
          <View style={[styles.map, styles.noLocation]}>
            <Text style={styles.placeholderText}>No location selected</Text>
          </View>
        )}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={styles.button.backgroundColor} />
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[styles.geoButton, styles.button]}
        onPress={setCurrentLocation}
        onLongPress={clearGeoPoint}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {geoValue ? 'Refresh Location' : 'Add Geopoint'}
        </Text>
      </TouchableOpacity>
      {errors[element.name] && (
        <Text style={styles.errorText}>{errors[element.name]}</Text>
      )}
    </View>
  );
};

export default GeoPoint;