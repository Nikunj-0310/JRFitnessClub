import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Share,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  name: string;
  dob: string;
  age: number;
  weight: number;
  height: number;
  aadhar: string;
  address: string;
  phone_number: string;
  whatsapp_number: string;
  joining_date: string;
  status: 'Active' | 'Inactive' | 'Deactivated';
  created_at: string;
}

interface FeeCollection {
  id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  valid_until: string;
}

interface UserStatus {
  status: string;
  last_payment_date?: string;
  next_due_date?: string;
  days_overdue: number;
}

export default function UserDetailScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);
  const [recentFees, setRecentFees] = useState<FeeCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const loadUserData = async () => {
    try {
      const credentials = await AsyncStorage.getItem('authCredentials');
      if (!credentials) {
        router.replace('/auth/login');
        return;
      }

      // Load user details, status, and recent fees in parallel
      const [userResponse, statusResponse, feesResponse] = await Promise.all([
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/users/${id}`, {
          headers: { 'Authorization': `Basic ${credentials}` },
        }),
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/users/${id}/status`, {
          headers: { 'Authorization': `Basic ${credentials}` },
        }),
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/fee-collections?user_id=${id}`, {
          headers: { 'Authorization': `Basic ${credentials}` },
        }),
      ]);

      setUser(userResponse.data);
      setUserStatus(statusResponse.data);
      setRecentFees(feesResponse.data.slice(0, 5)); // Show last 5 payments
    } catch (error: any) {
      console.error('Error loading user data:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.clear();
        router.replace('/auth/login');
      } else if (error.response?.status === 404) {
        Alert.alert('Error', 'User not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to load user data');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadUserData();
    }
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return '#27AE60';
      case 'Inactive': return '#F39C12';
      case 'Deactivated': return '#E74C3C';
      default: return '#B0B0B0';
    }
  };

  const handleCall = async (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    if (canOpen) {
      await Linking.openURL(phoneUrl);
    } else {
      Alert.alert('Error', 'Cannot make phone calls on this device');
    }
  };

  const handleWhatsApp = async (phoneNumber: string, name: string) => {
    const message = `Hi ${name}, this is regarding your fitness membership.`;
    const whatsappUrl = `whatsapp://send?phone=91${phoneNumber}&text=${encodeURIComponent(message)}`;
    
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      Alert.alert('Error', 'WhatsApp is not installed on this device');
    }
  };

  const handleCollectFee = () => {
    router.push(`/fees/add?userId=${id}&userName=${user?.name}`);
  };

  const handleEditUser = () => {
    router.push(`/users/${id}/edit`);
  };

  const handleDeleteUser = () => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const credentials = await AsyncStorage.getItem('authCredentials');
              await axios.delete(`${EXPO_PUBLIC_BACKEND_URL}/api/users/${id}`, {
                headers: { 'Authorization': `Basic ${credentials}` },
              });
              
              Alert.alert('Success', 'User deleted successfully', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error deleting user:', error);
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading user details...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <Text style={styles.errorText}>User not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleEditUser}>
          <Ionicons name="create-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.status) }]}>
                <Text style={styles.statusText}>{user.status}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCall(user.phone_number)}
            >
              <Ionicons name="call" size={20} color="white" />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleWhatsApp(user.whatsapp_number || user.phone_number, user.name)}
            >
              <Ionicons name="logo-whatsapp" size={20} color="white" />
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={handleCollectFee}
            >
              <Ionicons name="wallet" size={20} color="white" />
              <Text style={styles.actionText}>Collect Fee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Card */}
        {userStatus && (
          <View style={styles.statusCard}>
            <Text style={styles.cardTitle}>Membership Status</Text>
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>Current Status</Text>
                <Text style={[styles.statusValue, { color: getStatusColor(userStatus.status) }]}>
                  {userStatus.status}
                </Text>
              </View>
              
              {userStatus.last_payment_date && (
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Last Payment</Text>
                  <Text style={styles.statusValue}>{userStatus.last_payment_date}</Text>
                </View>
              )}
              
              {userStatus.next_due_date && (
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Next Due Date</Text>
                  <Text style={styles.statusValue}>{userStatus.next_due_date}</Text>
                </View>
              )}
              
              {userStatus.days_overdue > 0 && (
                <View style={styles.statusItem}>
                  <Text style={styles.statusLabel}>Days Overdue</Text>
                  <Text style={[styles.statusValue, { color: '#E74C3C' }]}>
                    {userStatus.days_overdue}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Personal Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Date of Birth</Text>
              <Text style={styles.infoValue}>{user.dob}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Age</Text>
              <Text style={styles.infoValue}>{user.age} years</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Weight</Text>
              <Text style={styles.infoValue}>{user.weight} kg</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Height</Text>
              <Text style={styles.infoValue}>{user.height} cm</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={16} color="#B0B0B0" />
              <Text style={styles.contactText}>{user.phone_number}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="logo-whatsapp" size={16} color="#B0B0B0" />
              <Text style={styles.contactText}>{user.whatsapp_number || user.phone_number}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={16} color="#B0B0B0" />
              <Text style={styles.contactText}>{user.address}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="card-outline" size={16} color="#B0B0B0" />
              <Text style={styles.contactText}>Aadhar: {user.aadhar}</Text>
            </View>
          </View>
        </View>

        {/* Recent Payments */}
        {recentFees.length > 0 && (
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Recent Payments</Text>
            {recentFees.map((fee) => (
              <View key={fee.id} style={styles.paymentItem}>
                <View>
                  <Text style={styles.paymentAmount}>₹{fee.amount}</Text>
                  <Text style={styles.paymentDate}>{fee.payment_date}</Text>
                </View>
                <View style={[
                  styles.paymentType,
                  { backgroundColor: fee.payment_type === 'Monthly' ? '#27AE60' : '#4A90E2' }
                ]}>
                  <Text style={styles.paymentTypeText}>{fee.payment_type}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Danger Zone */}
        <View style={[styles.infoCard, styles.dangerCard]}>
          <Text style={styles.cardTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteUser}>
            <Ionicons name="trash-outline" size={20} color="#E74C3C" />
            <Text style={styles.deleteButtonText}>Delete User</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3B5C',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    backgroundColor: '#16213E',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A3B5C',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  primaryAction: {
    backgroundColor: '#4A90E2',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  statusCard: {
    backgroundColor: '#16213E',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  statusGrid: {
    gap: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  infoCard: {
    backgroundColor: '#16213E',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactText: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3B5C',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  paymentType: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  dangerCard: {
    borderColor: '#E74C3C',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E74C3C',
  },
  loadingText: {
    fontSize: 16,
    color: '#B0B0B0',
    marginTop: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#E74C3C',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});