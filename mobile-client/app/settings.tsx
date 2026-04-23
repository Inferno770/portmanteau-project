import { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { AuthContext } from './_layout';
import SideMenu from '../components/SideMenu';

export default function SettingsScreen() {
  const router = useRouter();
  const { userId, userEmail, currency, setCurrency, theme, setTheme, customName, setCustomName } = useContext(AuthContext);
  const [menuVisible, setMenuVisible] = useState(false);

  // Local state for inputs
  const [nameInput, setNameInput] = useState(customName || '');
  const [newPassword, setNewPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // --- SAVE PROFILE ---
  const handleSaveProfile = async () => {
    setCustomName(nameInput);
    setStatusMsg('Display Name Updated');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  // --- CHANGE PASSWORD ---
  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setStatusMsg('Password must be at least 6 characters');
      return;
    }
    try {
      const res = await fetch(`https://portmanteau-project.onrender.com/api/auth/password`, { 
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, new_password: newPassword })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatusMsg('✅ Password Changed Securely');
        setNewPassword('');
      } else {
        setStatusMsg(`${data.error}`);
      }
    } catch (e) {
      setStatusMsg('Server Error');
    }
  };

  // --- EXPORT CSV ---
  const handleExportCSV = async () => {
    try {
      // 1. Fetch current portfolio
      const res = await fetch(`https://portmanteau-project.onrender.com/api/portfolio/summary`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId })
      });
      const data = await res.json();
      
      // 2. Format to CSV
      let csvString = "Ticker,Shares,Total Invested,Live Value,Return %\n";
      data.holdings.forEach((h: any) => {
        csvString += `${h.ticker},${h.shares},${h.invested_value},${h.live_value},${h.percent_return.toFixed(2)}\n`;
      });

      // 3. Brute force the FileSystem write
      const dir = (FileSystem as any).documentDirectory;
      const fileUri = dir + "Portmanteau_Export.csv";
      
      await (FileSystem as any).writeAsStringAsync(fileUri, csvString);
      await (Sharing as any).shareAsync(fileUri);
      
    } catch (e: any) {
      console.error("CSV Crash Log:", e);
      Alert.alert("Export Error", String(e.message || e));
    }
  };

  // --- WIPE PORTFOLIO ---
  const handleWipeData = () => {
    
    // 1. The actual database deletion logic
    const executeWipe = async () => {
      try {
        console.log("Sending Wipe Request to Database...");
        const response = await fetch(`https://portmanteau-project.onrender.com/api/portfolio/reset`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId })
        });
        
        const data = await response.json();
        console.log("Supabase Response:", data);

        if (data.status === 'success') {
          Platform.OS === 'web' 
            ? window.alert("Success: Portfolio wiped clean. Go check your dashboard!")
            : Alert.alert("Success", "Portfolio wiped clean. Go check your dashboard!");
        } else {
          Platform.OS === 'web'
            ? window.alert("Backend Error: " + (data.error || "Unknown error"))
            : Alert.alert("Backend Error", data.error || "Unknown error occurred");
        }
      } catch (e: any) {
        console.error("Network Error:", e);
        Platform.OS === 'web'
            ? window.alert("Network Crash: Could not reach Node.js. Is your IP correct?")
            : Alert.alert("Network Crash", "Could not reach Node.js. Is your IP correct?");
      }
    };

    // 2. The Platform Check for the Popup!
    if (Platform.OS === 'web') {
      // Use the browser's native confirm box
      const confirmWipe = window.confirm("DANGER ZONE\n\nAre you sure you want to permanently delete all transactions? This cannot be undone.");
      if (confirmWipe) {
        executeWipe();
      }
    } else {
      // Use the Mobile App's native alert box
      Alert.alert("DANGER ZONE", "Are you sure you want to permanently delete all transactions? This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Wipe It", style: "destructive", onPress: executeWipe }
      ]);
    }
  };

  const isDark = theme === 'dark';

  return (
    <SafeAreaView style={[styles.container, isDark ? styles.darkBg : styles.lightBg]}>
      <View style={styles.blueHeader}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 5 }}>
          <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>≡</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content}>
        {statusMsg !== '' && <Text style={styles.statusMsg}>{statusMsg}</Text>}

        {/* --- APPEARANCE --- */}
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Appearance</Text>
        <View style={[styles.card, isDark && styles.darkCard]}>
          <View style={styles.row}>
            <Text style={[styles.label, isDark && styles.darkText]}>Theme</Text>
            <View style={styles.btnGroup}>
              <TouchableOpacity style={[styles.toggleBtn, theme === 'light' && styles.activeBtn]} onPress={() => setTheme('light')}><Text style={[styles.toggleText, theme === 'light' && styles.activeText]}>Light</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.toggleBtn, theme === 'dark' && styles.activeBtn]} onPress={() => setTheme('dark')}><Text style={[styles.toggleText, theme === 'dark' && styles.activeText]}>Dark</Text></TouchableOpacity>
            </View>
          </View>
          <View style={[styles.row, {marginTop: 15}]}>
            <Text style={[styles.label, isDark && styles.darkText]}>Currency</Text>
            <View style={styles.btnGroup}>
              {['$', '€', '£'].map(sym => (
                <TouchableOpacity key={sym} style={[styles.toggleBtn, currency === sym && styles.activeBtn]} onPress={() => setCurrency(sym)}>
                  <Text style={[styles.toggleText, currency === sym && styles.activeText]}>{sym}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* --- ACCOUNT --- */}
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Account & Security</Text>
        <View style={[styles.card, isDark && styles.darkCard]}>
          <Text style={[styles.label, isDark && styles.darkText]}>Display Name</Text>
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, isDark && styles.darkInput, {flex: 1}]} placeholder="e.g. John Doe" placeholderTextColor={isDark ? '#888' : '#aaa'} value={nameInput} onChangeText={setNameInput} />
            <TouchableOpacity style={styles.actionBtn} onPress={handleSaveProfile}><Text style={styles.actionBtnText}>Save</Text></TouchableOpacity>
          </View>

          <Text style={[styles.label, isDark && styles.darkText, {marginTop: 15}]}>Change Password</Text>
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, isDark && styles.darkInput, {flex: 1}]} placeholder="New Password" placeholderTextColor={isDark ? '#888' : '#aaa'} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
            <TouchableOpacity style={styles.actionBtn} onPress={handleChangePassword}><Text style={styles.actionBtnText}>Update</Text></TouchableOpacity>
          </View>
        </View>

        {/* --- DATA --- */}
        <Text style={[styles.sectionTitle, isDark && styles.darkText]}>Data Management</Text>
        <View style={[styles.card, isDark && styles.darkCard]}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
            <Text style={styles.exportBtnText}>Export Portfolio (CSV)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dangerBtn} onPress={handleWipeData}>
            <Text style={styles.dangerBtnText}>Clear All Transactions</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  lightBg: { backgroundColor: '#f5f7fa' }, darkBg: { backgroundColor: '#121212' },
  blueHeader: { backgroundColor: '#4a76a8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, paddingBottom: 20 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 15 },
  statusMsg: { textAlign: 'center', color: '#2ecc71', fontWeight: 'bold', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 5, marginTop: 10, marginBottom: 5 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  darkCard: { backgroundColor: '#1e1e1e' },
  darkText: { color: '#f0f0f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 8 },
  btnGroup: { flexDirection: 'row', gap: 8 },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 18, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f8f9fa', borderRadius: 20 },
  activeBtn: { backgroundColor: '#4a76a8', borderColor: '#4a76a8' },
  toggleText: { color: '#666', fontWeight: '600' },
  activeText: { color: 'white' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e1e4e8', padding: 12, borderRadius: 8, fontSize: 16, color: '#333', marginRight: 10 },
  darkInput: { backgroundColor: '#2c2c2c', borderColor: '#444', color: 'white' },
  actionBtn: { backgroundColor: '#4a76a8', padding: 12, borderRadius: 8 },
  actionBtnText: { color: 'white', fontWeight: 'bold' },
  exportBtn: { backgroundColor: '#e8f5e9', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#2ecc71' },
  exportBtnText: { color: '#2ecc71', fontWeight: 'bold', fontSize: 16 },
  dangerBtn: { backgroundColor: '#ffebee', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e74c3c' },
  dangerBtnText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 16 }
});