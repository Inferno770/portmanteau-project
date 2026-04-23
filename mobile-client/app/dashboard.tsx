import { useState, useCallback, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useRouter, useFocusEffect } from 'expo-router';
import { AuthContext } from './_layout';
import SideMenu from '../components/SideMenu';

export default function Dashboard() {
  const router = useRouter();
  
  // Bring in theme and currency!
  const { userId, theme, currency } = useContext(AuthContext);
  const screenWidth = Dimensions.get("window").width;

  const [holdings, setHoldings] = useState<any[]>([]);
  const [totalLiveValue, setTotalLiveValue] = useState(0);
  const [totalReturn, setTotalReturn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardSummary();
    }, [userId])
  );

  const fetchDashboardSummary = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/portfolio/summary', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setHoldings(data.holdings);
        setTotalLiveValue(data.totalLiveValue);
        setTotalReturn(data.totalPercentReturn);
      }
    } catch (err) {
      console.error("Failed to load summary.");
    } finally {
      setLoading(false);
    }
  };

  const chartColors = ['#4a76a8', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#34495e'];
  const isDark = theme === 'dark';
  const isPositive = totalReturn >= 0;

  const pieData = holdings.map((h, index) => ({
    name: h.ticker,
    value: h.live_value,
    color: chartColors[index % chartColors.length],
    legendFontColor: isDark ? "#ccc" : "#7F7F7F", // Changes legend color in dark mode!
    legendFontSize: 13
  }));


  return (
    <SafeAreaView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={[styles.blueHeader, isDark && styles.darkHeader]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 5 }}>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>≡</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Portmanteau</Text>
          <View style={{ width: 28 }} />
        </View>
        
        <View style={[styles.valueCard, isDark && styles.darkCard]}>
          <Text style={styles.label}>Total Account Value</Text>
          <View style={styles.valueRow}>
            {loading ? (
                <ActivityIndicator size="small" color="#4a76a8" />
            ) : (
                // DYNAMIC CURRENCY SYMBOL HERE!
                <Text style={[styles.amount, isDark && styles.darkText]}>{currency}{totalLiveValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
            )}
            <View style={[styles.tag, isPositive ? styles.tagGreen : styles.tagRed]}>
              <Text style={[styles.tagText, isPositive ? styles.textGreen : styles.textRed]}>
                {isPositive ? '+' : ''}{totalReturn.toFixed(2)}%
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        
        {holdings.length > 0 && !loading && (
          <View style={[styles.chartContainer, isDark && styles.darkCard]}>
            <Text style={[styles.chartTitle, isDark && styles.darkText]}>Asset Allocation</Text>
            <PieChart
              data={pieData}
              width={screenWidth - 40}
              height={180}
              chartConfig={{ color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})` }}
              accessor={"value"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10, 0]}
              absolute
            />
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <Text style={[styles.chartTitle, isDark && styles.darkText]}>Your Assets</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#4a76a8" style={{marginTop: 20}}/>
            ) : holdings.length === 0 ? (
                <Text style={{textAlign: 'center', color: '#888', marginTop: 20}}>No assets found. Add a transaction!</Text>
            ) : (
                holdings.map((item, i) => {
                  const itemPositive = item.percent_return >= 0;
                  return (
                    <View key={i} style={[styles.holdingCard, isDark && styles.darkCard]}>
                        <View style={styles.iconPlaceholder}><Text style={styles.iconText}>{item.ticker[0]}</Text></View>
                        <View style={{flex: 1, marginLeft: 15}}>
                            <Text style={[styles.tickerText, isDark && styles.darkText]}>{item.ticker}</Text>
                            {/* DYNAMIC CURRENCY SYMBOL HERE! */}
                            <Text style={styles.subText}>{item.shares} Shares @ {currency}{item.live_price.toFixed(2)}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            {/* DYNAMIC CURRENCY SYMBOL HERE! */}
                            <Text style={[styles.tickerText, isDark && styles.darkText]}>{currency}{item.live_value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                            <Text style={{color: itemPositive ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', fontSize: 13}}>
                              {itemPositive ? '+' : ''}{item.percent_return.toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                  )
                })
            )}
        </View>
      </ScrollView>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f5f7fa' },
  darkBg: { backgroundColor: '#121212' },
  blueHeader: { backgroundColor: '#4a76a8', height: 180, padding: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 10 },
  darkHeader: { backgroundColor: '#2c3e50' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  valueCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginTop: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  darkCard: { backgroundColor: '#1e1e1e', shadowOpacity: 0.3 },
  label: { color: '#888', fontSize: 14 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  amount: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  darkText: { color: '#f5f5f5' },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagGreen: { backgroundColor: '#e8f5e9' }, tagRed: { backgroundColor: '#ffebee' },
  tagText: { fontWeight: 'bold', fontSize: 14 },
  textGreen: { color: '#2ecc71' }, textRed: { color: '#e74c3c' },
  content: { flex: 1, marginTop: -10 },
  chartContainer: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 45, paddingVertical: 15, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 20, marginBottom: 5 },
  holdingCard: { flexDirection: 'row', padding: 15, marginVertical: 6, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, alignItems: 'center' },
  iconPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4a76a8', justifyContent: 'center', alignItems: 'center' },
  iconText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  tickerText: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  subText: { color: '#888', fontSize: 12, marginTop: 2 }
});