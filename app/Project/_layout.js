import { Stack } from 'expo-router';

export default function FormLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="List"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          gestureEnabled: true, // Swipe to dismiss
          headerShown: false, // No header
        }}
      />

      <Stack.Screen
        name="Join"
        options={{
          presentation: 'modal',
          animation: 'slide_from_right',
          gestureEnabled: true, // Swipe to dismiss
          headerShown: false, // No header
        }}
      />

      <Stack.Screen
        name="Settings"
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