import { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';
import { AuthContext } from './_layout';

export default function Dashboard() {
  const router = useRouter();
  const { userId } = useContext(AuthContext);
  const screenWidth = Dimensions.get("window").width;

  // State to hold our real database data
  const [holdings, setHoldings] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch data as soon as the screen loads
  useEffect(() => {
    fetchDashboardSummary();
  }, []);

  const fetchDashboardSummary = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/portfolio/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const data = await response.json();
      
      if (data.status === 'success') {
        setHoldings(data.holdings);
        setTotalValue(data.totalValue);
      }
    } catch (err) {
      console.error("Failed to load summary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Blue Header & Floating Card */}
      <View style={styles.blueHeader}>
        <Text style={styles.headerTitle}>Portmanteau</Text>
        <View style={styles.valueCard}>
          <Text style={styles.label}>Total Invested Value</Text>
          <View style={styles.valueRow}>
            {loading ? (
                <ActivityIndicator size="small" color="#4a76a8" />
            ) : (
                <Text style={styles.amount}>${totalValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
            )}
            <View style={styles.tag}><Text style={styles.tagText}>LIVE</Text></View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Decorative Chart */}
        <View style={{ marginTop: 40 }}>
            <LineChart
            data={{ labels: ["1m", "1d", "1m", "6m", "1y", "3y"], datasets: [{ data: [20, 45, 28, 80, 99, 140] }] }}
            width={screenWidth}
            height={180}
            withDots={false}
            withInnerLines={false}
            withOuterLines={false}
            chartConfig={{
                backgroundGradientFrom: "#f5f7fa", backgroundGradientTo: "#f5f7fa",
                color: (opacity = 1) => `rgba(74, 118, 168, ${opacity})`,
                strokeWidth: 3, decimalPlaces: 0,
            }}
            bezier
            style={{ paddingRight: 0, paddingLeft: 0 }}
            />
        </View>

        {/* Dynamic Holdings List */}
        <View style={{ paddingHorizontal: 20 }}>
            {loading ? (
                <ActivityIndicator size="large" color="#4a76a8" style={{marginTop: 20}}/>
            ) : holdings.length === 0 ? (
                <Text style={{textAlign: 'center', color: '#888', marginTop: 20}}>No assets found. Add a transaction!</Text>
            ) : (
                holdings.map((item, i) => (
                <View key={i} style={styles.holdingCard}>
                    <View style={styles.iconPlaceholder}><Text style={styles.iconText}>{item.ticker[0]}</Text></View>
                    <View style={{flex: 1, marginLeft: 15}}>
                        <Text style={styles.tickerText}>{item.ticker}</Text>
                        <Text style={styles.subText}>{item.shares} Shares</Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                        <Text style={styles.tickerText}>${item.value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Text>
                        <Text style={{color: '#4a76a8', fontWeight: 'bold', fontSize: 12}}>{item.change}</Text>
                    </View>
                </View>
                ))
            )}
        </View>

        {/* Navigation Buttons */}
        <TouchableOpacity style={styles.navButton} onPress={() => router.push('/add-transaction')}>
          <Text style={styles.navButtonText}>Add Transaction</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navButton, {backgroundColor: '#2ecc71', marginTop: 0, marginBottom: 40}]} onPress={() => router.push('/optimize')}>
          <Text style={styles.navButtonText}>Optimize Portfolio</Text>
        </TouchableOpacity>
      </ScrollView>
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
  tag: { backgroundColor: '#e8f5e9', padding: 6, borderRadius: 8 },
  tagText: { color: '#2ecc71', fontWeight: 'bold', fontSize: 12 },
  content: { flex: 1, marginTop: -20 },
  holdingCard: { flexDirection: 'row', padding: 15, marginVertical: 6, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, alignItems: 'center' },
  iconPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
  iconText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  tickerText: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  subText: { color: '#888', fontSize: 12, marginTop: 2 },
  navButton: { backgroundColor: '#4a76a8', margin: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
  navButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});