import { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from './_layout';

export default function AddTransaction() {
  const router = useRouter();
  const { userId } = useContext(AuthContext);

  const [ticker, setTicker] = useState('');
  const [txType, setTxType] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  const handleAddTransaction = async () => {
    if (!ticker || !quantity || !price) {
      setTxMessage("Please fill out all fields."); return;
    }
    setTxLoading(true); setTxMessage(null);

    try {
      const response = await fetch('http://localhost:3000/api/portfolio/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ticker, type: txType, quantity, price }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTxMessage(`✅ Successfully added ${quantity} shares of ${ticker.toUpperCase()}`);
        setTicker(''); setQuantity(''); setPrice('');
      } else {
        setTxMessage(`❌ ${data.error}`);
      }
    } catch (err) {
      setTxMessage("❌ Failed to reach database.");
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blueHeader}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>{"< Back"}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Entry</Text>
        <View style={{width: 50}} /> {/* Spacer for centering */}
      </View>

      <View style={styles.formContainer}>
        <View style={styles.typeToggleRow}>
          <Text style={styles.label}>Buy / Sell</Text>
          <View style={{flexDirection: 'row'}}>
             <TouchableOpacity style={[styles.toggleBtn, txType === 'BUY' ? styles.buyActive : styles.inactive]} onPress={() => setTxType('BUY')}><Text style={txType === 'BUY' ? styles.activeText : styles.inactiveText}>BUY</Text></TouchableOpacity>
             <TouchableOpacity style={[styles.toggleBtn, txType === 'SELL' ? styles.sellActive : styles.inactive]} onPress={() => setTxType('SELL')}><Text style={txType === 'SELL' ? styles.activeText : styles.inactiveText}>SELL</Text></TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Asset Ticker</Text>
        <TextInput style={styles.input} placeholder="e.g. AAPL" value={ticker} onChangeText={setTicker} autoCapitalize="characters" />
        
        <Text style={styles.label}>Quantity</Text>
        <TextInput style={styles.input} placeholder="0" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
        
        <Text style={styles.label}>Price per Unit</Text>
        <TextInput style={styles.input} placeholder="$0.00" value={price} onChangeText={setPrice} keyboardType="numeric" />

        {txMessage && <Text style={styles.message}>{txMessage}</Text>}

        {txLoading ? <ActivityIndicator size="large" color="#4a76a8" style={{ marginTop: 20 }} /> : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddTransaction}>
              <Text style={styles.submitBtnText}>Save Transaction</Text>
            </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  blueHeader: { backgroundColor: '#4a76a8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, paddingBottom: 20 },
  backBtn: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  formContainer: { padding: 20, backgroundColor: 'white', flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e1e4e8', padding: 15, borderRadius: 10, fontSize: 16 },
  typeToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#eee' },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10, borderWidth: 1 },
  inactive: { backgroundColor: 'transparent', borderColor: '#ddd' },
  buyActive: { backgroundColor: '#e8f5e9', borderColor: '#2ecc71' },
  sellActive: { backgroundColor: '#ffebee', borderColor: '#e74c3c' },
  activeText: { fontWeight: 'bold', color: '#333' },
  inactiveText: { color: '#888' },
  submitBtn: { backgroundColor: '#4a76a8', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  message: { textAlign: 'center', marginTop: 20, fontSize: 16, fontWeight: '600', color: '#4a76a8' }
});