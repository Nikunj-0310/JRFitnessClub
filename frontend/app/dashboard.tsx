import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface DashboardStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  deactivated_users: number;
  recent_collections: number;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [username, setUsername] = useState('');
  const router = useRouter();

  const loadDashboardStats = async () => {
    try {
      const credentials = await AsyncStorage.getItem('authCredentials');
      const storedUsername = await AsyncStorage.getItem('username');
      
      if (!credentials) {
        router.replace('/auth/login');
        return;
      }

      setUsername(storedUsername || 'User');

      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/dashboard/stats`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });

      setStats(response.data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.clear();
        router.replace('/auth/login');
      } else {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardStats();
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const navigateToUsers = () => {
    router.push('/(tabs)/users');
  };

  const navigateToFees = () => {
    router.push('/(tabs)/fees');
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Welcome back,</Text>
          <Text style={styles.headerName}>{username}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#4A90E2' }]}>
              <Ionicons name="people" size={32} color="white" />
              <Text style={styles.statNumber}>{stats?.total_users || 0}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#27AE60' }]}>
              <Ionicons name="checkmark-circle" size={32} color="white" />
              <Text style={styles.statNumber}>{stats?.active_users || 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#F39C12' }]}>
              <Ionicons name="pause-circle" size={32} color="white" />
              <Text style={styles.statNumber}>{stats?.inactive_users || 0}</Text>
              <Text style={styles.statLabel}>Inactive</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#E74C3C' }]}>
              <Ionicons name="close-circle" size={32} color="white" />
              <Text style={styles.statNumber}>{stats?.deactivated_users || 0}</Text>
              <Text style={styles.statLabel}>Deactivated</Text>
            </View>
          </View>

          <View style={[styles.statCard, styles.fullWidthCard, { backgroundColor: '#9B59B6' }]}>
            <Ionicons name="wallet" size={32} color="white" />
            <Text style={styles.statNumber}>{stats?.recent_collections || 0}</Text>
            <Text style={styles.statLabel}>Recent Collections (30 days)</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionCard} onPress={navigateToUsers}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#4A90E2' }]}>
                <Ionicons name="people-outline" size={24} color="white" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Manage Users</Text>
                <Text style={styles.actionSubtitle}>View, add, and edit user profiles</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={navigateToFees}>
            <View style={styles.actionLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#27AE60' }]}>
                <Ionicons name="wallet-outline" size={24} color="white" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Fee Collection</Text>
                <Text style={styles.actionSubtitle}>Collect fees and generate receipts</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3B5C',
  },
  headerGreeting: {
    fontSize: 16,
    color: '#B0B0B0',
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#B0B0B0',
    marginTop: 16,
  },
  statsContainer: {
    padding: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  fullWidthCard: {
    width: '100%',
    marginHorizontal: 0,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  quickActions: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
  },
});