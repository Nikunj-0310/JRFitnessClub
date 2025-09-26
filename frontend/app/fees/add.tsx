import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  name: string;
  phone_number: string;
  whatsapp_number: string;
}

interface FeeFormData {
  user_id: string;
  amount: string;
  payment_type: 'Monthly' | 'Yearly';
  payment_date: string;
}

export default function AddFeeScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [formData, setFormData] = useState<FeeFormData>({
    user_id: '',
    amount: '',
    payment_type: 'Monthly',
    payment_date: new Date().toISOString().split('T')[0],
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date());
  
  const router = useRouter();
  const { userId, userName } = useLocalSearchParams<{ userId?: string; userName?: string }>();

  useEffect(() => {
    loadUsers();
    
    // Pre-select user if provided in params
    if (userId && userName) {
      setSelectedUser({ id: userId, name: userName, phone_number: '', whatsapp_number: '' });
      setFormData(prev => ({ ...prev, user_id: userId }));
    }
  }, [userId, userName]);

  const loadUsers = async () => {
    try {
      const credentials = await AsyncStorage.getItem('authCredentials');
      if (!credentials) {
        router.replace('/auth/login');
        return;
      }

      const response = await axios.get(`${EXPO_PUBLIC_BACKEND_URL}/api/users`, {
        headers: { 'Authorization': `Basic ${credentials}` },
      });

      setUsers(response.data);
    } catch (error: any) {
      console.error('Error loading users:', error);
      if (error.response?.status === 401) {
        await AsyncStorage.clear();
        router.replace('/auth/login');
      }
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPaymentDate(selectedDate);
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, payment_date: dateStr }));
    }
  };

  const selectUser = (user: User) => {
    setSelectedUser(user);
    setFormData(prev => ({ ...prev, user_id: user.id }));
    setShowUserPicker(false);
  };

  const validateForm = () => {
    if (!formData.user_id) {
      Alert.alert('Error', 'Please select a user');
      return false;
    }

    if (!formData.amount.trim()) {
      Alert.alert('Error', 'Please enter the fee amount');
      return false;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const credentials = await AsyncStorage.getItem('authCredentials');
      if (!credentials) {
        router.replace('/auth/login');
        return;
      }

      const feeData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      const response = await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/fee-collections`, feeData, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      Alert.alert(
        'Success', 
        `Fee collected successfully! Receipt generated for ${selectedUser?.name}.`,
        [
          {
            text: 'Share Receipt',
            onPress: () => {
              // Navigate back and potentially share receipt
              router.back();
            }
          },
          {
            text: 'Done',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error: any) {
      console.error('Error collecting fee:', error);
      Alert.alert('Error', 'Failed to collect fee. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? All data will be lost.',
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const getSuggestedAmounts = () => {
    if (formData.payment_type === 'Monthly') {
      return ['500', '750', '1000', '1500', '2000'];
    } else {
      return ['6000', '9000', '12000', '15000', '20000'];
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collect Fee</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* User Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Select User *</Text>
              <TouchableOpacity
                style={styles.userSelector}
                onPress={() => setShowUserPicker(true)}
              >
                <Text style={[styles.userSelectorText, !selectedUser && styles.placeholder]}>
                  {selectedUser ? selectedUser.name : 'Choose a user to collect fee from'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#B0B0B0" />
              </TouchableOpacity>
            </View>

            {/* Payment Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Type *</Text>
              <View style={styles.paymentTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    formData.payment_type === 'Monthly' && styles.paymentTypeActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, payment_type: 'Monthly' }))}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color={formData.payment_type === 'Monthly' ? 'white' : '#B0B0B0'} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    formData.payment_type === 'Monthly' && styles.paymentTypeActiveText
                  ]}>
                    Monthly
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    formData.payment_type === 'Yearly' && styles.paymentTypeActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, payment_type: 'Yearly' }))}
                >
                  <Ionicons 
                    name="calendar" 
                    size={20} 
                    color={formData.payment_type === 'Yearly' ? 'white' : '#B0B0B0'} 
                  />
                  <Text style={[
                    styles.paymentTypeText,
                    formData.payment_type === 'Yearly' && styles.paymentTypeActiveText
                  ]}>
                    Yearly
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fee Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(text) => setFormData(prev => ({ ...prev, amount: text }))}
                placeholder="Enter amount"
                placeholderTextColor="#B0B0B0"
                keyboardType="numeric"
              />
              
              {/* Suggested Amounts */}
              <View style={styles.suggestedAmounts}>
                <Text style={styles.suggestedLabel}>Suggested amounts:</Text>
                <View style={styles.suggestedButtonsContainer}>
                  {getSuggestedAmounts().map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={styles.suggestedButton}
                      onPress={() => setFormData(prev => ({ ...prev, amount }))}
                    >
                      <Text style={styles.suggestedButtonText}>₹{amount}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Payment Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Date *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>{formData.payment_date}</Text>
                <Ionicons name="calendar-outline" size={20} color="#B0B0B0" />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={paymentDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Fee Summary */}
            {selectedUser && formData.amount && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Fee Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>User:</Text>
                  <Text style={styles.summaryValue}>{selectedUser.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount:</Text>
                  <Text style={styles.summaryValue}>₹{formData.amount}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Type:</Text>
                  <Text style={styles.summaryValue}>{formData.payment_type}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Date:</Text>
                  <Text style={styles.summaryValue}>{formData.payment_date}</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Collect Fee</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* User Picker Modal */}
      {showUserPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select User</Text>
              <TouchableOpacity onPress={() => setShowUserPicker(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.userList}>
              {users.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userItem}
                  onPress={() => selectUser(user)}
                >
                  <Text style={styles.userItemName}>{user.name}</Text>
                  <Text style={styles.userItemPhone}>{user.phone_number}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 8,
  },
  userSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  userSelectorText: {
    fontSize: 16,
    color: 'white',
    flex: 1,
  },
  placeholder: {
    color: '#B0B0B0',
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3B5C',
    gap: 8,
  },
  paymentTypeActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  paymentTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#B0B0B0',
  },
  paymentTypeActiveText: {
    color: 'white',
  },
  input: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  suggestedAmounts: {
    marginTop: 12,
  },
  suggestedLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 8,
  },
  suggestedButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestedButton: {
    backgroundColor: '#2A3B5C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  suggestedButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  dateText: {
    fontSize: 16,
    color: 'white',
  },
  summaryCard: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A3B5C',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#B0B0B0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B0B0B0',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#2A3B5C',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#16213E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3B5C',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  userList: {
    maxHeight: 400,
  },
  userItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3B5C',
  },
  userItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 4,
  },
  userItemPhone: {
    fontSize: 14,
    color: '#B0B0B0',
  },
});