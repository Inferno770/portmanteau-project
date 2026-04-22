import { Stack } from 'expo-router';
import { createContext, useState } from 'react';

// Create a global state to hold our user data
export const AuthContext = createContext<any>(null);

export default function Layout() {
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  return (
    <AuthContext.Provider value={{ userId, setUserId, token, setToken }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* We define our screens here */}
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="add-transaction" />
        <Stack.Screen name="optimize" />
      </Stack>
    </AuthContext.Provider>
  );
}