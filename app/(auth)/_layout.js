
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>

      <Stack.Screen
        name="start"
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true, // Swipe to dismiss
          headerShown: false, // No header
        }}
      />

      <Stack.Screen
        name="register"
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true, // Swipe to dismiss
          headerShown: false, // No header
        }}
      />
    </Stack>
  );
}