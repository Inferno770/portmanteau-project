import { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from './_layout';

export default function LoginScreen() {
  const router = useRouter();
  // We grab our new setUserEmail function from the context!
  const { setUserId, setToken, setUserEmail } = useContext(AuthContext);
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);

    // --- CLIENT-SIDE VALIDATION ---
    if (!email || !password) {
      setAuthError("❌ Email and password are required.");
      setAuthLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthError("❌ Please enter a valid email address (e.g., name@domain.com).");
      setAuthLoading(false);
      return;
    }
    
    if (!isLoginMode && password.length < 6) {
      setAuthError("❌ Password must be at least 6 characters long.");
      setAuthLoading(false);
      return;
    }
    // ==========================================

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(`http://192.168.1.217:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        if (!isLoginMode) {
          setIsLoginMode(true);
          setAuthError("Registration successful! Please sign in.");
        } else {
          setToken(data.token);
          setUserId(data.user_id);
          setUserEmail(email); // <-- WE SAVE THEIR EMAIL HERE!
          router.replace('/dashboard');
        }
      } else {
        setAuthError(data.error || "Authentication failed.");
      }
    } catch (err) {
      setAuthError("Failed to connect to backend server.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <View style={styles.authCard}>
        <Text style={styles.title}>Portmanteau</Text>
        <Text style={styles.subtitle}>{isLoginMode ? 'Sign in to your account' : 'Create a new account'}</Text>
        
        <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

        {authError && <Text style={styles.errorText}>{authError}</Text>}

        {authLoading ? (
          <ActivityIndicator size="large" color="#4a76a8" style={{ marginVertical: 15 }} />
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={handleAuth}>
            <Text style={styles.buttonText}>{isLoginMode ? 'Sign In' : 'Register'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
          <Text style={styles.switchText}>
            {isLoginMode ? "Don't have an account? Register here." : "Already have an account? Sign in here."}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  authContainer: { flex: 1, backgroundColor: '#f5f7fa', justifyContent: 'center', alignItems: 'center', padding: 20 }, // <-- Fixed UI!
  authCard: { backgroundColor: 'white', padding: 30, borderRadius: 16, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4a76a8', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e1e4e8', padding: 15, borderRadius: 8, fontSize: 16, marginBottom: 15 },
  primaryButton: { backgroundColor: '#4a76a8', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  switchText: { textAlign: 'center', color: '#4a76a8', marginTop: 20, fontSize: 14, fontWeight: '600' },
  errorText: { color: '#e74c3c', marginBottom: 15, textAlign: 'center', fontWeight: '600' }
});