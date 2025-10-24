import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  Share,
  Image,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface FeeCollection {
  id: string;
  user_id: string;
  amount: number;
  payment_type: string;
  payment_date: string;
  valid_until: string;
  receipt_image?: string;
}

interface User {
  id: string;
  name: string;
  whatsapp_number: string;
  phone_number: string;
}

interface FeeSummary {
  monthly_total: number;
  quarterly_total: number;
  yearly_total: number;
  total_collections: number;
  total_active_members: number;
}

export default function FeesScreen() {
  const [fees, setFees] = useState<FeeCollection[]>([]);
  const [users, setUsers] = useState<{ [key: string]: User }>({});
  const [feeSummary, setFeeSummary] = useState<FeeSummary>({
    monthly_total: 0,
    quarterly_total: 0,
    yearly_total: 0,
    total_collections: 0,
    total_active_members: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const router = useRouter();

  const loadFeesAndUsers = async () => {
    try {
      const credentials = await AsyncStorage.getItem('authCredentials');
      if (!credentials) {
        router.replace('/auth/login');
        return;
      }

      // Load fees and users in parallel
      const [feesResponse, usersResponse] = await Promise.all([
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/fee-collections`, {
          headers: { 'Authorization': `Basic ${credentials}` },
        }),
        axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/users`, {
          headers: { 'Authorization': `Basic ${credentials}` },
        }),
      ]);

      setFees(feesResponse.data);
      
      // Create user map for quick lookup
      const userMap: { [key: string]: User } = {};
      usersResponse.data.forEach((user: User) => {
        userMap[user.id] = user;
      });
      setUsers(userMap);
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.clear();
        router.replace('/auth/login');
      } else {
        Alert.alert('Error', 'Failed to load fee collections');
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFeesAndUsers();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadFeesAndUsers();
  };

  const handleAddFee = () => {
    router.push('/fees/add');
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getPaymentTypeColor = (type: string) => {
    return type.toLowerCase() === 'monthly' ? '#27AE60' : '#4A90E2';
  };

  const shareReceipt = async (fee: FeeCollection) => {
    try {
      const user = users[fee.user_id];
      if (!user) return;

      if (fee.receipt_image) {
        // Share receipt image via WhatsApp
        const whatsappNumber = user.whatsapp_number || user.phone_number;
        const message = `Hi ${user.name}, here's your fee payment receipt for ₹${fee.amount} (${fee.payment_type}) dated ${fee.payment_date}. Thank you!`;
        
        const whatsappUrl = `whatsapp://send?phone=91${whatsappNumber}&text=${encodeURIComponent(message)}`;
        
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          // Fallback to regular share
          await Share.share({
            message: message,
            title: 'Fee Payment Receipt',
          });
        }
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const viewReceipt = (receiptImage: string) => {
    setSelectedReceipt(receiptImage);
  };

  const renderFeeItem = ({ item }: { item: FeeCollection }) => {
    const user = users[item.user_id];
    if (!user) return null;

    return (
      <View style={styles.feeCard}>
        <View style={styles.feeHeader}>
          <View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.feeDate}>{item.payment_date}</Text>
          </View>
          <View style={styles.feeAmount}>
            <Text style={styles.amountText}>{formatCurrency(item.amount)}</Text>
            <View style={[styles.typeBadge, { backgroundColor: getPaymentTypeColor(item.payment_type) }]}>
              <Text style={styles.typeText}>{item.payment_type}</Text>
            </View>
          </View>
        </View>

        <View style={styles.feeDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#B0B0B0" />
            <Text style={styles.detailText}>Valid until: {item.valid_until}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={14} color="#B0B0B0" />
            <Text style={styles.detailText}>{user.whatsapp_number || user.phone_number}</Text>
          </View>
        </View>

        <View style={styles.feeActions}>
          {item.receipt_image && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => viewReceipt(item.receipt_image!)}
            >
              <Ionicons name="document-text-outline" size={16} color="#4A90E2" />
              <Text style={styles.actionText}>View Receipt</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => shareReceipt(item)}
          >
            <Ionicons name="share-outline" size={16} color="#27AE60" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="wallet-outline" size={64} color="#B0B0B0" />
      <Text style={styles.emptyTitle}>No fee collections yet</Text>
      <Text style={styles.emptySubtitle}>Start collecting fees to see them here</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddFee}>
        <Text style={styles.emptyButtonText}>Collect Fee</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading fee collections...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fee Collections</Text>
        <Text style={styles.headerSubtitle}>
          Total: {fees.length} collections
        </Text>
      </View>

      {/* Fee Collections List */}
      <FlatList
        data={fees}
        keyExtractor={(item) => item.id}
        renderItem={renderFeeItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          styles.listContainer,
          fees.length === 0 && styles.emptyContainer
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Receipt Modal */}
      <Modal
        visible={selectedReceipt !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedReceipt(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setSelectedReceipt(null)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            
            {selectedReceipt && (
              <Image 
                source={{ uri: selectedReceipt }} 
                style={styles.receiptImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddFee}>
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3B5C',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  listContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  feeCard: {
    backgroundColor: '#16213E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  feeDate: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  feeAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  feeDetails: {
    gap: 4,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  feeActions: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A3B5C',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: '#B0B0B0',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },
});