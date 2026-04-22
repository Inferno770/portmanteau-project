import { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';
import { AuthContext } from './_layout';

export default function OptimizeScreen() {
  const router = useRouter();
  const { userId } = useContext(AuthContext);
  const screenWidth = Dimensions.get("window").width;

  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOptimization();
  }, []);

  const fetchOptimization = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/portfolio/optimize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId }), 
      });
      const data = await response.json();
      if (data.status === 'success') {
        setOptimizationData(data);
      } else {
        setError(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blueHeader}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backBtn}>{"< Back"}</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Optimization View</Text>
        <View style={{width: 50}} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={{marginTop: 50}}><ActivityIndicator size="large" color="#4a76a8" /><Text style={{textAlign: 'center', marginTop: 10}}>Running Python SciPy Engine...</Text></View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : optimizationData ? (
          <>
            {/* Chart Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Efficient Frontier</Text>
              <LineChart
                data={{
                  labels: [],
                  datasets: [{ data: optimizationData.original_math.efficient_frontier_data.map((point: any) => point.y * 100) }]
                }}
                width={screenWidth - 60} height={200} yAxisSuffix="%"
                withInnerLines={false} withOuterLines={false}
                chartConfig={{
                  backgroundColor: "#ffffff", backgroundGradientFrom: "#ffffff", backgroundGradientTo: "#ffffff",
                  color: (opacity = 1) => `rgba(74, 118, 168, ${opacity})`, labelColor: () => `#888`,
                  propsForDots: { r: "3", strokeWidth: "1", stroke: "#2c3e50" }
                }}
                bezier style={{ marginVertical: 10, borderRadius: 16 }}
              />
            </View>

            <Text style={styles.sectionHeader}>Suggested Rebalancing</Text>
            
            {/* Rebalancing Advice Cards */}
            {optimizationData.rebalancing_actions.map((action: any, index: number) => {
                const isBuy = action.action === 'BUY';
                return (
                    <View key={index} style={styles.actionCard}>
                        <View style={[styles.iconCircle, isBuy ? styles.buyBg : styles.sellBg]}>
                            <Text style={isBuy ? styles.buyText : styles.sellText}>{isBuy ? '↗' : '↘'}</Text>
                        </View>
                        <View style={{flex: 1, marginLeft: 15}}>
                            <Text style={styles.actionText}>{action.instruction}</Text>
                        </View>
                    </View>
                );
            })}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  blueHeader: { backgroundColor: '#4a76a8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, paddingBottom: 20 },
  backBtn: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 15 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, alignSelf: 'flex-start' },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, marginLeft: 5 },
  actionCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  buyBg: { backgroundColor: '#e8f5e9' }, sellBg: { backgroundColor: '#ffebee' },
  buyText: { color: '#2ecc71', fontWeight: 'bold', fontSize: 18 }, sellText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 18 },
  actionText: { fontSize: 16, fontWeight: '500', color: '#333' },
  errorText: { color: '#e74c3c', textAlign: 'center', marginTop: 20, fontWeight: 'bold' }
});