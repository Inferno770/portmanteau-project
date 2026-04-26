import { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, SafeAreaView, ScrollView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthContext } from './_layout';
import SideMenu from '../components/SideMenu'; 

export default function AddTransaction() {
  const router = useRouter();
  const { userId, theme } = useContext(AuthContext);

  const [ticker, setTicker] = useState('');
  const [txType, setTxType] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  // State for custom price override
  const [customPrice, setCustomPrice] = useState(''); 
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txLoading, setTxLoading] = useState(false);
  
  const [currentHoldings, setCurrentHoldings] = useState<any[]>([]);
  const [menuVisible, setMenuVisible] = useState(false); 

  useEffect(() => {
    fetchCurrentHoldings();
  }, []);

  const fetchCurrentHoldings = async () => {
    try {
      const response = await fetch('https://portmanteau-project.onrender.com/api/portfolio/summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      if (data.status === 'success') setCurrentHoldings(data.holdings);
    } catch (err) {
      console.log("Could not fetch holdings for validation.");
    }
  };

  const handleAddTransaction = async () => {
    if (!ticker || !quantity) {
      setTxMessage("Please enter a Ticker and Quantity."); return;
    }

    const qtyNumber = parseFloat(quantity);
    const tickerUpper = ticker.toUpperCase();

    if (txType === 'SELL') {
      const ownedAsset = currentHoldings.find(h => h.ticker === tickerUpper);
      if (!ownedAsset) {
        setTxMessage(`You do not own any shares of ${tickerUpper} to sell.`);
        return;
      }
      if (qtyNumber > ownedAsset.shares) {
        setTxMessage(`You only own ${ownedAsset.shares} shares of ${tickerUpper}. You cannot sell ${qtyNumber}.`);
        return;
      }
    }

    setTxLoading(true); setTxMessage(null);

    // Parse custom price, or send null if they left it blank
    const parsedCustomPrice = customPrice.trim() !== '' ? parseFloat(customPrice) : null;

    try {
      const response = await fetch('https://portmanteau-project.onrender.com/api/portfolio/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            user_id: userId, 
            ticker: tickerUpper, 
            type: txType, 
            quantity: quantity,
            custom_price: parsedCustomPrice // Send the override to Node.js!
        }),
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        const priceMsg = parsedCustomPrice ? `your custom price ($${data.executed_price})` : `live market price ($${data.executed_price})`;
        setTxMessage(`Successfully executed ${txType} for ${quantity} shares of ${tickerUpper} at ${priceMsg}`);
        setTicker(''); setQuantity(''); setCustomPrice('');
        fetchCurrentHoldings(); 
      } else {
        setTxMessage(`${data.error}`);
      }
    } catch (err) {
      setTxMessage("Failed to reach database.");
    } finally {
      setTxLoading(false);
    }
  };

  const popularTickers = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'VOO', 'BTC-USD'];
  const suggestedTickers = Array.from(new Set([
    ...currentHoldings.map(h => h.ticker), 
    ...popularTickers
  ]));

  const isDark = theme === 'dark';

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={[styles.blueHeader, isDark && styles.darkHeader]}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 5 }}>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>≡</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Market Order</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={[styles.formContainer, isDark && styles.darkBg]}>
        <View style={[styles.typeToggleRow, isDark && styles.darkBorder]}>
          <Text style={[styles.label, isDark && styles.darkText]}>Action</Text>
          <View style={{flexDirection: 'row'}}>
             <TouchableOpacity style={[styles.toggleBtn, txType === 'BUY' ? styles.buyActive : (isDark ? styles.darkInactive : styles.inactive)]} onPress={() => setTxType('BUY')}><Text style={txType === 'BUY' ? styles.activeText : (isDark ? styles.darkInactiveText : styles.inactiveText)}>BUY</Text></TouchableOpacity>
             <TouchableOpacity style={[styles.toggleBtn, txType === 'SELL' ? styles.sellActive : (isDark ? styles.darkInactive : styles.inactive)]} onPress={() => setTxType('SELL')}><Text style={txType === 'SELL' ? styles.activeText : (isDark ? styles.darkInactiveText : styles.inactiveText)}>SELL</Text></TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.label, isDark && styles.darkText]}>Asset Ticker</Text>
        <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder="e.g. AAPL" placeholderTextColor={isDark ? '#888' : '#aaa'} value={ticker} onChangeText={setTicker} autoCapitalize="characters" />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
            {suggestedTickers.map(t => (
                <TouchableOpacity key={t} style={[styles.chip, isDark && styles.darkChip]} onPress={() => setTicker(t)}>
                    <Text style={[styles.chipText, isDark && styles.darkChipText]}>{t}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
        
        <View style={styles.row}>
            <View style={{flex: 1, marginRight: 10}}>
                <Text style={[styles.label, isDark && styles.darkText]}>Quantity</Text>
                <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder="0" placeholderTextColor={isDark ? '#888' : '#aaa'} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            </View>
            
            <View style={{flex: 1}}>
                {/* NEW: Custom Price Input */}
                <Text style={[styles.label, isDark && styles.darkText]}>Price Paid ($)</Text>
                <TextInput style={[styles.input, isDark && styles.darkInput]} placeholder="Optional" placeholderTextColor={isDark ? '#888' : '#aaa'} value={customPrice} onChangeText={setCustomPrice} keyboardType="numeric" />
            </View>
        </View>

        <Text style={styles.helperText}>* Leave "Price Paid" blank to automatically execute at the live market price.</Text>

        {txMessage && <Text style={[styles.message, txMessage.includes('❌') || txMessage.includes('do not own') ? {color: '#e74c3c'} : {color: '#2ecc71'}]}>{txMessage}</Text>}

        {txLoading ? <ActivityIndicator size="large" color="#4a76a8" style={{ marginTop: 20 }} /> : (
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddTransaction}>
              <Text style={styles.submitBtnText}>Execute Order</Text>
            </TouchableOpacity>
        )}
      </ScrollView>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  lightBg: { backgroundColor: '#f5f7fa' },
  darkBg: { backgroundColor: '#121212' },
  blueHeader: { backgroundColor: '#4a76a8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, paddingBottom: 20 },
  darkHeader: { backgroundColor: '#2c3e50' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  formContainer: { padding: 20, backgroundColor: 'white', flex: 1 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
  darkText: { color: '#f5f5f5' },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e1e4e8', padding: 15, borderRadius: 10, fontSize: 16 },
  darkInput: { backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff' },
  helperText: { color: '#888', fontSize: 13, marginTop: 15, fontStyle: 'italic' },
  chipContainer: { flexDirection: 'row', marginTop: 10, marginBottom: 5, maxHeight: 40 },
  chip: { backgroundColor: '#eef2f5', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#dcdfe3' },
  darkChip: { backgroundColor: '#2c3e50', borderColor: '#1a252f' },
  chipText: { color: '#4a76a8', fontWeight: 'bold' },
  darkChipText: { color: '#fff' },
  typeToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10, paddingBottom: 15, borderBottomWidth: 1, borderColor: '#eee' },
  darkBorder: { borderBottomColor: '#333' },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10, borderWidth: 1 },
  inactive: { backgroundColor: 'transparent', borderColor: '#ddd' },
  darkInactive: { backgroundColor: 'transparent', borderColor: '#444' },
  buyActive: { backgroundColor: '#e8f5e9', borderColor: '#2ecc71' },
  sellActive: { backgroundColor: '#ffebee', borderColor: '#e74c3c' },
  activeText: { fontWeight: 'bold', color: '#333' },
  inactiveText: { color: '#888' },
  darkInactiveText: { color: '#aaa' },
  submitBtn: { backgroundColor: '#4a76a8', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  message: { textAlign: 'center', marginTop: 20, fontSize: 15, fontWeight: '600' }
});