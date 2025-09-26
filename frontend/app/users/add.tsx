import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface UserFormData {
  name: string;
  dob: string;
  age: string;
  weight: string;
  height: string;
  aadhar: string;
  address: string;
  phone_number: string;
  whatsapp_number: string;
  joining_date: string;
}

export default function AddUserScreen() {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    dob: '',
    age: '',
    weight: '',
    height: '',
    aadhar: '',
    address: '',
    phone_number: '',
    whatsapp_number: '',
    joining_date: new Date().toISOString().split('T')[0],
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showJoiningDatePicker, setShowJoiningDatePicker] = useState(false);
  const [dobDate, setDobDate] = useState(new Date());
  const [joiningDate, setJoiningDate] = useState(new Date());
  
  const router = useRouter();

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleDobChange = (event: any, selectedDate?: Date) => {
    setShowDobPicker(false);
    if (selectedDate) {
      setDobDate(selectedDate);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const age = calculateAge(selectedDate);
      setFormData({
        ...formData,
        dob: dateStr,
        age: age.toString(),
      });
    }
  };

  const handleJoiningDateChange = (event: any, selectedDate?: Date) => {
    setShowJoiningDatePicker(false);
    if (selectedDate) {
      setJoiningDate(selectedDate);
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData({
        ...formData,
        joining_date: dateStr,
      });
    }
  };

  const validateForm = () => {
    const required = ['name', 'dob', 'age', 'weight', 'height', 'aadhar', 'address', 'phone_number'];
    
    for (const field of required) {
      if (!formData[field as keyof UserFormData].trim()) {
        Alert.alert('Error', `Please fill in the ${field.replace('_', ' ')} field`);
        return false;
      }
    }

    if (formData.aadhar.length !== 12) {
      Alert.alert('Error', 'Aadhar number must be 12 digits');
      return false;
    }

    if (formData.phone_number.length !== 10) {
      Alert.alert('Error', 'Phone number must be 10 digits');
      return false;
    }

    if (formData.whatsapp_number && formData.whatsapp_number.length !== 10) {
      Alert.alert('Error', 'WhatsApp number must be 10 digits');
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

      const userData = {
        ...formData,
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        whatsapp_number: formData.whatsapp_number || formData.phone_number,
      };

      await axios.post(`${EXPO_PUBLIC_BACKEND_URL}/api/users`, userData, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      Alert.alert('Success', 'User added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Error adding user:', error);
      Alert.alert('Error', 'Failed to add user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel? All data will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New User</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter full name"
                placeholderTextColor="#B0B0B0"
              />
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDobPicker(true)}
              >
                <Text style={[styles.dateText, !formData.dob && styles.placeholder]}>
                  {formData.dob || 'Select date of birth'}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#B0B0B0" />
              </TouchableOpacity>
              {showDobPicker && (
                <DateTimePicker
                  value={dobDate}
                  mode="date"
                  display="default"
                  onChange={handleDobChange}
                  maximumDate={new Date()}
                />
              )}
            </View>

            {/* Age */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Age *</Text>
              <TextInput
                style={[styles.input, styles.readOnlyInput]}
                value={formData.age}
                placeholder="Auto-calculated from DOB"
                placeholderTextColor="#B0B0B0"
                editable={false}
              />
            </View>

            {/* Weight & Height */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Weight (kg) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.weight}
                  onChangeText={(text) => setFormData({ ...formData, weight: text })}
                  placeholder="70.5"
                  placeholderTextColor="#B0B0B0"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Height (cm) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.height}
                  onChangeText={(text) => setFormData({ ...formData, height: text })}
                  placeholder="175.5"
                  placeholderTextColor="#B0B0B0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Aadhar Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Aadhar Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.aadhar}
                onChangeText={(text) => setFormData({ ...formData, aadhar: text.replace(/\D/g, '') })}
                placeholder="123456789012"
                placeholderTextColor="#B0B0B0"
                keyboardType="numeric"
                maxLength={12}
              />
            </View>

            {/* Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={formData.address}
                onChangeText={(text) => setFormData({ ...formData, address: text })}
                placeholder="Enter complete address"
                placeholderTextColor="#B0B0B0"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone_number}
                onChangeText={(text) => setFormData({ ...formData, phone_number: text.replace(/\D/g, '') })}
                placeholder="9876543210"
                placeholderTextColor="#B0B0B0"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {/* WhatsApp Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>WhatsApp Number</Text>
              <TextInput
                style={styles.input}
                value={formData.whatsapp_number}
                onChangeText={(text) => setFormData({ ...formData, whatsapp_number: text.replace(/\D/g, '') })}
                placeholder="Same as phone number if empty"
                placeholderTextColor="#B0B0B0"
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {/* Joining Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Joining Date *</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowJoiningDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {formData.joining_date}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#B0B0B0" />
              </TouchableOpacity>
              {showJoiningDatePicker && (
                <DateTimePicker
                  value={joiningDate}
                  mode="date"
                  display="default"
                  onChange={handleJoiningDateChange}
                />
              )}
            </View>
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
              <Text style={styles.submitButtonText}>Add User</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 8,
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
  readOnlyInput: {
    backgroundColor: '#0F1724',
    color: '#B0B0B0',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
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
  placeholder: {
    color: '#B0B0B0',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
});