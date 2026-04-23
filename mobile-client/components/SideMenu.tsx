import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '../app/_layout';
import { Ionicons } from '@expo/vector-icons';

export default function SideMenu({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const router = useRouter();
  
  const { setToken, setUserId, userEmail, setUserEmail, customName, theme } = useContext(AuthContext);

  const handleLogout = () => {
    setToken(null);
    setUserId(null);
    setUserEmail(null);
    onClose();
    router.replace('/');
  };

  const navigate = (path: any) => {
    onClose(); 
    router.push(path); 
  };

  const formattedName = customName ? customName : (userEmail ? userEmail.split('@')[0] : 'Investor');
  const displayName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
  const firstInitial = displayName.charAt(0);

  const isDark = theme === 'dark';

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        
        <View style={[styles.drawer, isDark && styles.darkDrawer]}>
          <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
            
            <View>
              <View style={[styles.header, isDark && styles.darkHeader]}>
                <Text style={styles.headerTitle}>Portmanteau</Text>
              </View>

              <TouchableOpacity style={[styles.navItem, isDark && styles.darkNavItem]} onPress={() => navigate('/dashboard')}>
                <Ionicons name="pie-chart-outline" size={22} color={isDark ? '#f5f5f5' : '#333'} style={styles.navIcon} />
                <Text style={[styles.navText, isDark && styles.darkText]}>Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.navItem, isDark && styles.darkNavItem]} onPress={() => navigate('/add-transaction')}>
                <Ionicons name="add-circle-outline" size={24} color={isDark ? '#f5f5f5' : '#333'} style={styles.navIcon} />
                <Text style={[styles.navText, isDark && styles.darkText]}>Add Transaction</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.navItem, isDark && styles.darkNavItem]} onPress={() => navigate('/optimize')}>
                <Ionicons name="trending-up-outline" size={22} color={isDark ? '#f5f5f5' : '#333'} style={styles.navIcon} />
                <Text style={[styles.navText, isDark && styles.darkText]}>Optimization View</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.navItem, isDark && styles.darkNavItem]} onPress={() => navigate('/settings')}>
                <Ionicons name="settings-outline" size={22} color={isDark ? '#f5f5f5' : '#333'} style={styles.navIcon} />
                <Text style={[styles.navText, isDark && styles.darkText]}>Settings</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.profileBar, isDark && styles.darkProfileBar]}>
              <View style={styles.profileInfo}>
                <View style={[styles.avatar, isDark && styles.darkAvatar]}><Text style={styles.avatarText}>{firstInitial}</Text></View>
                <View>
                    <Text style={[styles.profileName, isDark && styles.darkText]}>{displayName}</Text>
                    <Text style={styles.profileRole}>Portfolio Manager</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.logoutBtn, isDark && styles.darkLogoutBtn]} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </View>

        <TouchableOpacity style={styles.closeArea} onPress={onClose} activeOpacity={1} />
        
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  closeArea: { flex: 1 },
  drawer: { width: 280, backgroundColor: '#ffffff', height: '100%', shadowColor: '#000', shadowOffset: { width: 5, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 },
  darkDrawer: { backgroundColor: '#121212' },
  header: { backgroundColor: '#4a76a8', padding: 25, paddingTop: 50, borderBottomRightRadius: 20 },
  darkHeader: { backgroundColor: '#2c3e50' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  darkNavItem: { borderBottomColor: '#333' },
  navIcon: { marginRight: 15 },
  navText: { fontSize: 16, fontWeight: '600', color: '#333' },
  darkText: { color: '#f5f5f5' },
  profileBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#f8f9fa' },
  darkProfileBar: { backgroundColor: '#1e1e1e', borderTopColor: '#333' },
  profileInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4a76a8', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  darkAvatar: { backgroundColor: '#2c3e50' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  profileName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  profileRole: { fontSize: 12, color: '#888' },
  logoutBtn: { backgroundColor: '#ffebee', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  darkLogoutBtn: { backgroundColor: '#3a1c1c' },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 12 }
});