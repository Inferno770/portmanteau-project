import { useState, useCallback, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useRouter, useFocusEffect } from 'expo-router';
import { AuthContext } from './_layout';
import SideMenu from '../components/SideMenu';

export default function Dashboard() {
  const router = useRouter();
  const { userId } = useContext(AuthContext);
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

  // Generate colors dynamically for the Pie Chart
  const chartColors = ['#4a76a8', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#34495e'];
  const pieData = holdings.map((h, index) => ({
    name: h.ticker,
    value: h.live_value,
    color: chartColors[index % chartColors.length],
    legendFontColor: "#7F7F7F",
    legendFontSize: 13
  }));

  const isPositive = totalReturn >= 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blueHeader}>
        {/* Top row with Hamburger, Title, and a spacer to keep it centered */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 5 }}>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>≡</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Portmanteau</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.valueCard}>
          <Text style={styles.label}>Total Account Value</Text>
          <View style={styles.valueRow}>
            {loading ? (
                <ActivityIndicator size="small" color="#4a76a8" />
            ) : (
                <Text style={styles.amount}>${totalLiveValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
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
        
        {/* Dynamic Pie Chart */}
        {holdings.length > 0 && !loading && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Asset Allocation</Text>
            <PieChart
              data={pieData}
              width={screenWidth > 600 ? 560 : screenWidth - 40}
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

        {/* Dynamic Holdings List */}
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            <Text style={styles.chartTitle}>Your Assets</Text>
            {loading ? (
                <ActivityIndicator size="large" color="#4a76a8" style={{marginTop: 20}}/>
            ) : holdings.length === 0 ? (
                <Text style={{textAlign: 'center', color: '#888', marginTop: 20}}>No assets found. Add a transaction!</Text>
            ) : (
                holdings.map((item, i) => {
                  const itemPositive = item.percent_return >= 0;
                  return (
                    <View key={i} style={styles.holdingCard}>
                        <View style={styles.iconPlaceholder}><Text style={styles.iconText}>{item.ticker[0]}</Text></View>
                        <View style={{flex: 1, marginLeft: 15}}>
                            <Text style={styles.tickerText}>{item.ticker}</Text>
                            <Text style={styles.subText}>{item.shares} Shares @ ${item.live_price.toFixed(2)}</Text>
                        </View>
                        <View style={{alignItems: 'flex-end'}}>
                            <Text style={styles.tickerText}>${item.live_value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                            <Text style={{color: itemPositive ? '#2ecc71' : '#e74c3c', fontWeight: 'bold', fontSize: 13}}>
                              {itemPositive ? '+' : ''}{item.percent_return.toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                  )
                })
            )}
        </View>

        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/add-transaction')}>
          <Text style={styles.navButtonText}>Add Transaction</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navButton, {backgroundColor: '#2ecc71', marginTop: 0, marginBottom: 40}]} onPress={() => router.push('/optimize')}>
          <Text style={styles.navButtonText}>Optimize Portfolio</Text>
        </TouchableOpacity>
      </ScrollView>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', width: '100%', maxWidth: 600, alignSelf: 'center' },
  blueHeader: { backgroundColor: '#4a76a8', height: 180, padding: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, zIndex: 10 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 30 },
  valueCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, marginTop: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  label: { color: '#666', fontSize: 14 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  amount: { fontSize: 28, fontWeight: 'bold', color: '#1a1a1a' },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagGreen: { backgroundColor: '#e8f5e9' }, tagRed: { backgroundColor: '#ffebee' },
  tagText: { fontWeight: 'bold', fontSize: 14 },
  textGreen: { color: '#2ecc71' }, textRed: { color: '#e74c3c' },
  content: { flex: 1, marginTop: -10 },
  chartContainer: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 45, paddingVertical: 15, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 20, marginBottom: 5 },
  holdingCard: { flexDirection: 'row', padding: 15, marginVertical: 6, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, alignItems: 'center' },
  iconPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  iconText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  tickerText: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  subText: { color: '#888', fontSize: 12, marginTop: 2 },
  navButton: { backgroundColor: '#4a76a8', margin: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
  navButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});