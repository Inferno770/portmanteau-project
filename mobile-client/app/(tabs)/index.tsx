import { useState } from 'react';
import { StyleSheet, Text, View, Button, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function HomeScreen() {
  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptimization = async () => {
    setLoading(true);
    setError(null);
    try {
      // Connect to your local Node.js API Gateway
      const response = await fetch('http://localhost:3000/api/portfolio/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Using the dummy user we injected into Supabase
        body: JSON.stringify({ user_id: '11111111-1111-1111-1111-111111111111' }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setOptimizationData(data);
      } else {
        setError(data.error || data.details || 'Unknown error occurred');
      }
    } catch (err) {
      setError("Failed to connect to backend. Is Node.js running on port 3000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Portmanteau AI</Text>
        <Text style={styles.subtitle}>Portfolio Optimization Engine</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardText}>
          Click below to analyze your current holdings and generate mathematical rebalancing advice based on the Efficient Frontier.
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" style={{ marginTop: 20 }} />
        ) : (
          <View style={{ marginTop: 20 }}>
            <Button title="Optimize Portfolio" onPress={fetchOptimization} />
          </View>
        )}
      </View>

      {error && (
        <View style={[styles.card, { backgroundColor: '#ffebee' }]}>
          <Text style={{ color: '#c62828' }}>{error}</Text>
        </View>
      )}

      {/* Render the Rebalancing Actions if we have data */}
      {optimizationData && (
        <View style={styles.resultsContainer}>
          {/* --- THE EFFICIENT FRONTIER CHART --- */}
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>The Efficient Frontier</Text>
          <Text style={{ color: '#666', marginBottom: 10 }}>Expected Return vs. Volatility Risk</Text>
          
          <LineChart
            data={{
              labels: [], // We leave labels empty so 50 numbers don't crowd the mobile screen
              datasets: [
                {
                  // We map through our Python array and pull out just the Y values (Returns)
                  data: optimizationData.original_math.efficient_frontier_data.map((point: any) => point.y * 100) 
                }
              ]
            }}
            width={Dimensions.get("window").width - 40} // Auto-sizes to the phone screen minus padding
            height={220}
            yAxisSuffix="%"
            withInnerLines={false}
            withOuterLines={false}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#f5f7fa",
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`, // A nice financial green curve
              labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "1", // Makes the 50 dots very small so it looks like a smooth curve
                strokeWidth: "1",
                stroke: "#2ecc71"
              }
            }}
            bezier // Adds a math curve smoothing effect!
            style={{
              marginVertical: 8,
              borderRadius: 16,
              alignItems: 'center'
            }}
          />
          <Text style={styles.sectionTitle}>Rebalancing Advice</Text>
          
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>New Sharpe Ratio</Text>
              <Text style={styles.metricValue}>
                {optimizationData.original_math.metrics.optimized_portfolio.sharpe_ratio}
              </Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>Risk (Volatility)</Text>
              <Text style={styles.metricValue}>
                {(optimizationData.original_math.metrics.optimized_portfolio.volatility_risk * 100).toFixed(2)}%
              </Text>
            </View>
          </View>

          {optimizationData.rebalancing_actions.map((action: any, index: number) => (
            <View 
              key={index} 
              style={[
                styles.actionCard, 
                action.action === 'BUY' ? styles.buyCard : styles.sellCard
              ]}
            >
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
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  cardText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  resultsContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 5,
  },
  actionCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buyCard: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  sellCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  actionTicker: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  actionInstruction: {
    fontSize: 16,
    color: '#555',
  }
});