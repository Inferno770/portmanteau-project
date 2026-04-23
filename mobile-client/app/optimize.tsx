import { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';
import { AuthContext } from './_layout';
import SideMenu from '../components/SideMenu';

export default function OptimizeScreen() {
  const router = useRouter();
  const { userId } = useContext(AuthContext);
  const screenWidth = Dimensions.get("window").width;

  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

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

  // ==========================================
  // --- DATA PROCESSING FOR THE CHART ---
  // ==========================================
  let chartData = [0]; 
  let chartLabels = [""];

  if (optimizationData) {
    const rawData = optimizationData.original_math.efficient_frontier_data;
    
    // 1. Find the point with the absolute minimum risk (volatility)
    let minVolIndex = 0;
    let minVol = Infinity;
    rawData.forEach((pt: any, i: number) => {
        if (pt.x < minVol) {
            minVol = pt.x;
            minVolIndex = i;
        }
    });

    // 2. The "Efficient" frontier only consists of the points ABOVE the minimum risk point.
    const efficientPart = rawData.slice(minVolIndex);

    // 3. Map the Y-axis (Returns) and X-axis (Risk labels)
    chartData = efficientPart.map((pt: any) => pt.y * 100);
    chartLabels = efficientPart.map((pt: any, index: number) => {
        // Only show 5 or 6 labels on the X-axis so it doesn't get cluttered
        if (index % Math.ceil(efficientPart.length / 5) === 0 || index === efficientPart.length - 1) {
            return (pt.x * 100).toFixed(1) + "%";
        }
        return "";
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.blueHeader}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 5 }}>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>≡</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Optimization View</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={{marginTop: 50}}><ActivityIndicator size="large" color="#4a76a8" /><Text style={{textAlign: 'center', marginTop: 10}}>Running Python SciPy Engine...</Text></View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : optimizationData ? (
          <>
            {/* --- CHART SECTION --- */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>The Efficient Frontier</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Y-Axis Label */}
                <Text style={{ transform: [{ rotate: '-90deg' }], width: 100, textAlign: 'center', marginLeft: -40, marginRight: -30, fontSize: 12, color: '#666', fontWeight: 'bold' }}>
                  Expected Return
                </Text>
                
                <LineChart
                  data={{
                    labels: chartLabels, // NEW: Injected Risk Labels
                    datasets: [{ data: chartData }] // NEW: Filtered Curve Data
                  }}
                  width={screenWidth > 600 ? 460 : screenWidth - 80} 
                  height={220} 
                  yAxisSuffix="%"
                  withInnerLines={true} 
                  withOuterLines={false}
                  chartConfig={{
                    backgroundColor: "#ffffff", backgroundGradientFrom: "#ffffff", backgroundGradientTo: "#ffffff",
                    color: (opacity = 1) => `rgba(74, 118, 168, ${opacity})`, 
                    labelColor: () => `#888`,
                    propsForDots: { r: "4", strokeWidth: "2", stroke: "#4a76a8" },
                    decimalPlaces: 1
                  }}
                  bezier 
                  style={{ marginVertical: 10, borderRadius: 16 }}
                />
              </View>
              {/* X-Axis Label */}
              <Text style={{ textAlign: 'center', color: '#666', fontSize: 12, fontWeight: 'bold', marginTop: -5 }}>
                Risk (Volatility)
              </Text>
            </View>

            {/* --- METRICS SECTION --- */}
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

            {/* --- ADVICE SECTION --- */}
            <Text style={styles.sectionHeader}>Suggested Rebalancing</Text>
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
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa', width: '100%', maxWidth: 600, alignSelf: 'center' },
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
  errorText: { color: '#e74c3c', textAlign: 'center', marginTop: 20, fontWeight: 'bold' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricBox: { backgroundColor: '#fff', padding: 15, borderRadius: 10, width: '31%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  metricLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: '600' },
  metricValue: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginTop: 5 }
});