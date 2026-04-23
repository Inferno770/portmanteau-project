import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useContext } from 'react';
import { AuthContext } from '../app/_layout';

export default function SideMenu({ visible, onClose }: { visible: boolean, onClose: () => void }) {
  const router = useRouter();
  
  // Combined all the variables into a single context call!
  const { setToken, setUserId, userEmail, setUserEmail, customName } = useContext(AuthContext);

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

  // Format the username: Use customName if it exists, otherwise fallback to the email trick
  const formattedName = customName ? customName : (userEmail ? userEmail.split('@')[0] : 'Investor');
  // Capitalize the first letter for a nice touch
  const displayName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
  const firstInitial = displayName.charAt(0);

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        
        <View style={styles.drawer}>
          <SafeAreaView style={{ flex: 1, justifyContent: 'space-between' }}>
            
            <View>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Portmanteau</Text>
              </View>

              <TouchableOpacity style={styles.navItem} onPress={() => navigate('/dashboard')}>
                <Text style={styles.navIcon}>📊</Text>
                <Text style={styles.navText}>Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navItem} onPress={() => navigate('/optimize')}>
                <Text style={styles.navIcon}>📈</Text>
                <Text style={styles.navText}>Optimization View</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navItem} onPress={() => navigate('/add-transaction')}>
                <Text style={styles.navIcon}>➕</Text>
                <Text style={styles.navText}>Add Transaction</Text>
              </TouchableOpacity>

              {/* Added the Settings button here! */}
              <TouchableOpacity style={styles.navItem} onPress={() => navigate('/settings')}>
                <Text style={styles.navIcon}>⚙️</Text>
                <Text style={styles.navText}>Settings</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.profileBar}>
              <View style={styles.profileInfo}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{firstInitial}</Text></View>
                <View>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Text style={styles.profileRole}>Portfolio Manager</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
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
  header: { backgroundColor: '#4a76a8', padding: 25, paddingTop: 50, borderBottomRightRadius: 20 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  navIcon: { fontSize: 20, marginRight: 15 },
  navText: { fontSize: 16, fontWeight: '600', color: '#333' },
  profileBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#f8f9fa' },
  profileInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4a76a8', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  profileName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  profileRole: { fontSize: 12, color: '#888' },
  logoutBtn: { backgroundColor: '#ffebee', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  logoutText: { color: '#e74c3c', fontWeight: 'bold', fontSize: 12 }
});