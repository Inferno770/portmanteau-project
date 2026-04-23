import { Stack } from 'expo-router';
import { createContext, useState } from 'react';

// Create a global state to hold our user data
export const AuthContext = createContext<any>(null);

export default function Layout() {
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  // settings state
  const [currency, setCurrency] = useState<string>('$');
  const [theme, setTheme] = useState<string>('light');
  const [customName, setCustomName] = useState<string | null>(null);

  return (
    <AuthContext.Provider value={{ 
      userId, setUserId, token, setToken, userEmail, setUserEmail,
      currency, setCurrency, theme, setTheme, customName, setCustomName
    }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="add-transaction" />
        <Stack.Screen name="optimize" />
        <Stack.Screen name="settings" />
      </Stack>
    </AuthContext.Provider>
  );
}