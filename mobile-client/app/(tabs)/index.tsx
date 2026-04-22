import { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Dimensions, TextInput, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function HomeScreen() {
  // --- AUTHENTICATION STATE (FR1) ---
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // --- TRANSACTION STATE (FR2) ---
  const [ticker, setTicker] = useState('');
  const [txType, setTxType] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  // --- OPTIMIZATION STATE (FR4 & FR5) ---
  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // --- AUTHENTICATION LOGIC ---
  // ==========================================
  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(`http://localhost:3000${endpoint}`, {
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

  const handleLogout = () => {
    setToken(null);
    setUserId(null);
    setOptimizationData(null);
    setTxMessage(null);
  };

  // ==========================================
  // --- ADD TRANSACTION LOGIC ---
  // ==========================================
  const handleAddTransaction = async () => {
    if (!ticker || !quantity || !price) {
      setTxMessage("Please fill out all fields.");
      return;
    }
    setTxLoading(true);
    setTxMessage(null);

    try {
      const response = await fetch('http://localhost:3000/api/portfolio/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ticker: ticker,
          type: txType,
          quantity: quantity,
          price: price
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setTxMessage(`✅ Successfully added ${quantity} shares of ${ticker.toUpperCase()}`);
        setTicker('');
        setQuantity('');
        setPrice('');
        // Clear old optimization data so user is prompted to run it again
        setOptimizationData(null);
      } else {
        setTxMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setTxMessage("❌ Failed to reach database.");
    } finally {
      setTxLoading(false);
    }
  };

  // ==========================================
  // --- OPTIMIZATION LOGIC ---
  // ==========================================
  const fetchOptimization = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3000/api/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }), 
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setOptimizationData(data);
      } else {
        setError(data.error || data.details || 'Unknown error occurred');
      }
    } catch (err) {
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // --- RENDER: LOGIN SCREEN ---
  // ==========================================
  if (!token) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.title}>Portmanteau AI</Text>
          <Text style={styles.subtitle}>{isLoginMode ? 'Sign in to your account' : 'Create a new account'}</Text>
          
          <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

          {authError && <Text style={styles.errorText}>{authError}</Text>}

          {authLoading ? (
            <ActivityIndicator size="large" color="#2ecc71" style={{ marginVertical: 15 }} />
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

  // ==========================================
  // --- RENDER: MAIN DASHBOARD ---
  // ==========================================
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Portmanteau AI</Text>
          <Text style={styles.subtitle}>Portfolio Optimization Engine</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* --- TRANSACTION FORM --- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Manual Transaction Entry</Text>
        <Text style={{color: '#666', marginBottom: 15}}>Log your trades to update your portfolio.</Text>

        <View style={styles.typeToggleRow}>
          <TouchableOpacity 
            style={[styles.toggleBtn, txType === 'BUY' ? styles.buyActive : styles.inactive]}
            onPress={() => setTxType('BUY')}
          ><Text style={txType === 'BUY' ? styles.btnTextActive : styles.btnTextInactive}>BUY</Text></TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleBtn, txType === 'SELL' ? styles.sellActive : styles.inactive]}
            onPress={() => setTxType('SELL')}
          ><Text style={txType === 'SELL' ? styles.btnTextActive : styles.btnTextInactive}>SELL</Text></TouchableOpacity>
        </View>

        <TextInput style={styles.input} placeholder="Ticker (e.g., AAPL)" value={ticker} onChangeText={setTicker} autoCapitalize="characters" />
        <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
          <TextInput style={[styles.input, {width: '48%'}]} placeholder="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
          <TextInput style={[styles.input, {width: '48%'}]} placeholder="Price per unit ($)" value={price} onChangeText={setPrice} keyboardType="numeric" />
        </View>

        {txMessage && <Text style={styles.successMessage}>{txMessage}</Text>}

        {txLoading ? (
            <ActivityIndicator size="small" color="#3498db" style={{ marginTop: 15 }} />
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleAddTransaction}>
              <Text style={styles.buttonText}>Save Transaction</Text>
            </TouchableOpacity>
        )}
      </View>

      {/* --- OPTIMIZATION SECTION --- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Analyze Holding</Text>
        <Text style={styles.cardText}>
          Generate mathematical rebalancing advice based on the Efficient Frontier.
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#2ecc71" style={{ marginTop: 20 }} />
        ) : (
          <TouchableOpacity style={[styles.primaryButton, {marginTop: 20}]} onPress={fetchOptimization}>
            <Text style={styles.buttonText}>Optimize Portfolio</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={[styles.card, { backgroundColor: '#ffebee' }]}>
          <Text style={{ color: '#c62828' }}>{error}</Text>
        </View>
      )}

      {/* --- RESULTS SECTION --- */}
      {optimizationData && (
        <View style={styles.resultsContainer}>
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>The Efficient Frontier</Text>
          <Text style={{ color: '#666', marginBottom: 10 }}>Expected Return vs. Volatility Risk</Text>
          
          <LineChart
            data={{
              labels: [],
              datasets: [{
                  data: optimizationData.original_math.efficient_frontier_data.map((point: any) => point.y * 100) 
              }]
            }}
            width={Dimensions.get("window").width - 40}
            height={220}
            yAxisSuffix="%"
            withInnerLines={false}
            withOuterLines={false}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#f5f7fa",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
              propsForDots: { r: "1", strokeWidth: "1", stroke: "#2ecc71" }
            }}
            bezier
            style={{ marginVertical: 8, borderRadius: 16, alignItems: 'center' }}
          />

          <Text style={[styles.sectionTitle, {marginTop: 20}]}>Rebalancing Advice</Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Sharpe</Text>
              <Text style={styles.metricValue}>
                {optimizationData.original_math.metrics.optimized_portfolio.sharpe_ratio}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Risk</Text>
              <Text style={styles.metricValue}>
                {(optimizationData.original_math.metrics.optimized_portfolio.volatility_risk * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Beta</Text>
              <Text style={styles.metricValue}>
                {optimizationData.original_math.metrics.optimized_portfolio.portfolio_beta}
              </Text>
            </View>
          </View>

          {optimizationData.rebalancing_actions.map((action: any, index: number) => (
            <View key={index} style={[styles.actionCard, action.action === 'BUY' ? styles.buyCard : styles.sellCard]}>
              <Text style={styles.actionTicker}>{action.ticker}</Text>
              <Text style={styles.actionInstruction}>{action.instruction}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  content: { padding: 20, paddingTop: 60 },
  authContainer: { flex: 1, backgroundColor: '#f5f7fa', justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  header: { marginBottom: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 5 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, marginBottom: 20 },
  authCard: { backgroundColor: 'white', padding: 30, borderRadius: 16, width: '100%', maxWidth: 400, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  cardText: { fontSize: 16, color: '#444', lineHeight: 24 },
  resultsContainer: { marginTop: 10 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5, color: '#1a1a1a' },
  
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e1e4e8', padding: 15, borderRadius: 8, fontSize: 16, marginTop: 15 },
  primaryButton: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  secondaryButton: { backgroundColor: '#3498db', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 15 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  switchText: { textAlign: 'center', color: '#3498db', marginTop: 20, fontSize: 14, fontWeight: '600' },
  errorText: { color: '#e74c3c', marginTop: 10, textAlign: 'center', fontWeight: '600' },
  successMessage: { color: '#2ecc71', marginTop: 15, textAlign: 'center', fontWeight: '600', fontSize: 15 },
  logoutButton: { padding: 8, backgroundColor: '#ffebee', borderRadius: 6 },
  logoutText: { color: '#c62828', fontWeight: '600' },

  typeToggleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  toggleBtn: { width: '48%', padding: 12, borderRadius: 8, alignItems: 'center', borderWidth: 2 },
  inactive: { borderColor: '#e1e4e8', backgroundColor: 'transparent' },
  buyActive: { borderColor: '#2ecc71', backgroundColor: '#e8f5e9' },
  sellActive: { borderColor: '#e74c3c', backgroundColor: '#ffebee' },
  btnTextActive: { fontWeight: 'bold', color: '#1a1a1a' },
  btnTextInactive: { fontWeight: 'bold', color: '#888' },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricBox: { backgroundColor: '#fff', padding: 15, borderRadius: 10, width: '31%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  metricLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: '600' },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginTop: 5 },
  
  actionCard: { padding: 15, borderRadius: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buyCard: { backgroundColor: '#e8f5e9', borderLeftWidth: 4, borderLeftColor: '#4caf50' },
  sellCard: { backgroundColor: '#ffebee', borderLeftWidth: 4, borderLeftColor: '#f44336' },
  actionTicker: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  actionInstruction: { fontSize: 16, color: '#555' }
});