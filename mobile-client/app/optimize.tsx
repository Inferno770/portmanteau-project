import { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useRouter } from 'expo-router';
import { AuthContext } from './_layout';
import SideMenu from '../components/SideMenu';

export default function OptimizeScreen() {
  const router = useRouter();
  // Extracted theme!
  const { userId, theme } = useContext(AuthContext);
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
      const response = await fetch('http://192.168.1.217:3000/api/portfolio/optimize', {
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

  let chartData = [0]; 
  let chartLabels = [""];

  if (optimizationData) {
    const rawData = optimizationData.original_math.efficient_frontier_data;
    let minVolIndex = 0;
    let minVol = Infinity;
    rawData.forEach((pt: any, i: number) => {
        if (pt.x < minVol) {
            minVol = pt.x;
            minVolIndex = i;
        }
    });

    const efficientPart = rawData.slice(minVolIndex);
    chartData = efficientPart.map((pt: any) => pt.y * 100);
    chartLabels = efficientPart.map((pt: any, index: number) => {
        if (index % Math.ceil(efficientPart.length / 5) === 0 || index === efficientPart.length - 1) {
            return (pt.x * 100).toFixed(1) + "%";
        }
        return "";
    });
  }

  const isDark = theme === 'dark';

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={[styles.blueHeader, isDark && styles.darkHeader]}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 5 }}>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>≡</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Optimization View</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={{marginTop: 50}}><ActivityIndicator size="large" color="#4a76a8" /><Text style={{textAlign: 'center', marginTop: 10, color: isDark ? '#ccc' : '#333'}}>Running Python SciPy Engine...</Text></View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : optimizationData ? (
          <>
            <View style={[styles.card, isDark && styles.darkCard]}>
              <Text style={[styles.cardTitle, isDark && styles.darkText]}>The Efficient Frontier</Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ transform: [{ rotate: '-90deg' }], width: 100, textAlign: 'center', marginLeft: -40, marginRight: -30, fontSize: 12, color: isDark ? '#aaa' : '#666', fontWeight: 'bold' }}>
                  Expected Return
                </Text>
                
                <LineChart
                  data={{
                    labels: chartLabels, 
                    datasets: [{ data: chartData }] 
                  }}
                  width={screenWidth - 80}
                  height={220} 
                  yAxisSuffix="%"
                  withInnerLines={true} 
                  withOuterLines={false}
                  chartConfig={{
                    backgroundColor: isDark ? "#1e1e1e" : "#ffffff", 
                    backgroundGradientFrom: isDark ? "#1e1e1e" : "#ffffff", 
                    backgroundGradientTo: isDark ? "#1e1e1e" : "#ffffff",
                    color: (opacity = 1) => `rgba(74, 118, 168, ${opacity})`, 
                    labelColor: () => isDark ? `#ccc` : `#888`, // Adjusts axis text
                    propsForDots: { r: "4", strokeWidth: "2", stroke: "#4a76a8" },
                    decimalPlaces: 1
                  }}
                  bezier 
                  style={{ marginVertical: 10, borderRadius: 16 }}
                />
              </View>
              <Text style={{ textAlign: 'center', color: isDark ? '#aaa' : '#666', fontSize: 12, fontWeight: 'bold', marginTop: -5 }}>
                Risk (Volatility)
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricBox, isDark && styles.darkCard]}>
                <Text style={styles.metricLabel}>Sharpe</Text>
                <Text style={[styles.metricValue, isDark && styles.darkText]}>
                  {optimizationData.original_math.metrics.optimized_portfolio.sharpe_ratio}
                </Text>
              </View>
              <View style={[styles.metricBox, isDark && styles.darkCard]}>
                <Text style={styles.metricLabel}>Risk</Text>
                <Text style={[styles.metricValue, isDark && styles.darkText]}>
                  {(optimizationData.original_math.metrics.optimized_portfolio.volatility_risk * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={[styles.metricBox, isDark && styles.darkCard]}>
                <Text style={styles.metricLabel}>Beta</Text>
                <Text style={[styles.metricValue, isDark && styles.darkText]}>
                  {optimizationData.original_math.metrics.optimized_portfolio.portfolio_beta}
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionHeader, isDark && styles.darkText]}>Suggested Rebalancing</Text>
            {optimizationData.rebalancing_actions.map((action: any, index: number) => {
                const isBuy = action.action === 'BUY';
                return (
                    <View key={index} style={[styles.actionCard, isDark && styles.darkActionCard]}>
                        <View style={[styles.iconCircle, isBuy ? styles.buyBg : styles.sellBg]}>
                            <Text style={isBuy ? styles.buyText : styles.sellText}>{isBuy ? '↗' : '↘'}</Text>
                        </View>
                        <View style={{flex: 1, marginLeft: 15}}>
                            <Text style={[styles.actionText, isDark && styles.darkText]}>{action.instruction}</Text>
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
  container: { flex: 1 },
  lightBg: { backgroundColor: '#f5f7fa' },
  darkBg: { backgroundColor: '#121212' },
  blueHeader: { backgroundColor: '#4a76a8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, paddingBottom: 20 },
  darkHeader: { backgroundColor: '#2c3e50' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 15 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: 20 },
  darkCard: { backgroundColor: '#1e1e1e', shadowOpacity: 0.3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, alignSelf: 'flex-start' },
  darkText: { color: '#f5f5f5' },
  sectionHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15, marginLeft: 5 },
  actionCard: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  darkActionCard: { backgroundColor: '#1e1e1e', borderColor: '#333' },
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