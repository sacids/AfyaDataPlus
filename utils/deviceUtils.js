// utils/deviceUtils.js
import * as Device from 'expo-device';

export const getDeviceId = () => {
  return Device.osBuildId || Device.modelId || 'unknown-device';
};

export const getGlobalUsername = (chosenName) => {
  // Format: chosenname_deviceid (cleaned for URL safety)
  const deviceId = Device.osBuildId || Device.modelId || 'unknown';
  const cleanName = chosenName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${deviceId.substring(0, 20)}`;
};
