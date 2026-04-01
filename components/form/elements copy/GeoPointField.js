import * as Location from 'expo-location';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { getStyles } from '../../../constants/styles';
import { useTheme } from '../../../context/ThemeContext';
import { getLabel } from '../../../lib/form/utils';
import { useFormStore } from '../../../store/useFormStore';

const GeoPoint = ({ element }) => {
  // Store selectors
  const formData = useFormStore(state => state.formData);
  const updateField = useFormStore(state => state.updateField);
  const language = useFormStore(state => state.language);
  const fieldError = useFormStore(state => state.errors[element.name]);
  const schemaLanguage = useFormStore(state => state.schema?.form_defn?.languages);

  const globalValue = formData[element.name];

  const [locationPermission, setLocationPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState(false);

  const theme = useTheme();
  const styles = getStyles(theme);

  // Refs for cleanup
  const isMounted = useRef(true);
  const locationRequest = useRef(null);
  const mapRef = useRef(null);

  // Parse geo value safely
  const geoValue = useCallback(() => {
    if (!globalValue) return null;

    try {
      // Handle if it's a string (from storage)
      if (typeof globalValue === 'string') {
        const parsed = JSON.parse(globalValue);
        if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          return parsed;
        }
        return null;
      }

      // Handle if it's an object
      if (typeof globalValue === 'object' &&
        globalValue.latitude != null &&
        globalValue.longitude != null &&
        !isNaN(globalValue.latitude) &&
        !isNaN(globalValue.longitude)) {
        return globalValue;
      }

      return null;
    } catch (error) {
      console.error('Error parsing geo value:', error);
      return null;
    }
  }, [globalValue]);

  const currentGeo = geoValue();

  const label = getLabel(element, 'label', language, schemaLanguage);
  const hint = getLabel(element, 'hint', language, schemaLanguage);

  // Request permissions on mount
  useEffect(() => {
    isMounted.current = true;

    const requestPermissions = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (isMounted.current) {
          setLocationPermission(status === 'granted');
        }
      } catch (error) {
        console.error("Permission request failed:", error);
        if (isMounted.current) {
          setLocationPermission(false);
        }
      }
    };

    requestPermissions();

    return () => {
      isMounted.current = false;
      // Cancel any ongoing location request
      if (locationRequest.current) {
        locationRequest.current = null;
      }
    };
  }, []);

  const setCurrentLocation = useCallback(async () => {
    if (!isMounted.current) return;

    setIsLoading(true);

    try {
      // Check permissions again if needed
      let hasPermission = locationPermission;
      if (!hasPermission) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        hasPermission = status === 'granted';
        if (isMounted.current) {
          setLocationPermission(hasPermission);
        }

        if (!hasPermission) {
          Alert.alert(
            'Permission Denied',
            'Please enable location permissions in settings to use this feature.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Get current position with better error handling
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 15000, // 15 seconds timeout
        maximumAge: 10000 // Accept location up to 10 seconds old
      });

      if (!isMounted.current) return;

      const newGeoPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        timestamp: new Date().toISOString()
      };

      // Validate coordinates
      if (isNaN(newGeoPoint.latitude) || isNaN(newGeoPoint.longitude)) {
        throw new Error('Invalid coordinates received');
      }

      // Update store with new location
      updateField(element.name, newGeoPoint);

    } catch (error) {
      console.error("Location error:", error);

      if (!isMounted.current) return;

      let errorMessage = 'Could not fetch coordinates. ';

      Alert.alert('Location Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [locationPermission, element.name, updateField]);

  const clearGeoPoint = useCallback(() => {
    Alert.alert(
      'Remove Location',
      'Are you sure you want to clear this location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => updateField(element.name, null)
        },
      ]
    );
  }, [element.name, updateField]);

  // Handle map errors gracefully
  const handleMapError = useCallback((error) => {
    console.error('Map error:', error);
    setMapError(true);
  }, []);

  // Safely render MapView only on supported platforms
  const renderMap = () => {
    if (!currentGeo) {
      return (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
          <Text style={{ color: '#999' }}>No location selected</Text>
        </View>
      );
    }

    if (mapError) {
      return (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
          <Text style={{ color: '#999' }}>Map failed to load</Text>
          <TouchableOpacity
            onPress={() => setMapError(false)}
            style={{ marginTop: 10, padding: 5 }}
          >
            <Text style={{ color: theme.colors.primary }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Ensure coordinates are valid numbers
    const latitude = Number(currentGeo.latitude);
    const longitude = Number(currentGeo.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      return (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
          <Text style={{ color: '#999' }}>Invalid coordinates</Text>
        </View>
      );
    }

    // For web or unsupported platforms, show text instead
    if (Platform.OS === 'web') {
      return (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
          <Text style={{ color: '#666' }}>
            Location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </Text>
        </View>
      );
    }

    try {
      return (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          liteMode={true}
          initialRegion={{
            latitude: latitude,
            longitude: longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onError={handleMapError}
          onMapReady={() => console.log('Map ready')}
          onPanDrag={() => { }}
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title={label || 'Location'}
            description={`Accuracy: ${currentGeo.accuracy || 'N/A'}m`}
          />
        </MapView>
      );
    } catch (error) {
      console.error('MapView render error:', error);
      return (
        <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' }]}>
          <Text style={{ color: '#999' }}>Map unavailable</Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {element.required === 'yes' && <Text style={styles.required}>*</Text>}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}

      {hint && <Text style={styles.hint}>{hint}</Text>}

      <View style={[
        styles.mapContainer,
        fieldError ? styles.inputError : null,
        { height: 200, overflow: 'hidden', borderRadius: 8, marginVertical: 8 }
      ]}>
        {renderMap()}

        {currentGeo && !mapError && Platform.OS !== 'web' && (
          <View style={{
            position: 'absolute',
            bottom: 5,
            left: 5,
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4
          }}>
            <Text style={{ fontSize: 10, color: '#fff' }}>
              {currentGeo.latitude.toFixed(5)}, {currentGeo.longitude.toFixed(5)}
            </Text>
            {currentGeo.accuracy && (
              <Text style={{ fontSize: 8, color: '#ddd' }}>
                ±{Math.round(currentGeo.accuracy)}m
              </Text>
            )}
          </View>
        )}

        {isLoading && (
          <View style={[{
            position: 'absolute',
            backgroundColor: 'rgba(255,255,255,0.8)',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 8
          }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={{ marginTop: 8, color: '#666' }}>Getting location...</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, {
          marginTop: 5,
          backgroundColor: theme.colors.primary,
          padding: 12,
          borderRadius: 8,
          opacity: isLoading ? 0.6 : 1
        }]}
        onPress={setCurrentLocation}
        onLongPress={currentGeo ? clearGeoPoint : null}
        disabled={isLoading}
      >
        <Text style={[styles.buttonText, { textAlign: 'center', color: '#fff', fontWeight: 'bold' }]}>
          {currentGeo ? 'Update Location' : 'Get Current Location'}
        </Text>
      </TouchableOpacity>

      {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
    </View>
  );
};

// Custom comparison for memo
const areEqual = (prevProps, nextProps) => {
  return prevProps.element.name === nextProps.element.name;
};

export default memo(GeoPoint, areEqual);