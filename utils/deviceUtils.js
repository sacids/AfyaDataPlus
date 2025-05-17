// utils/deviceUtils.js
import * as Device from 'expo-device';

export const getDeviceId = () => {
  return Device.osBuildId || Device.modelId || 'unknown-device';
};
