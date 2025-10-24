import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const [username, setUsername] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedUsername = await AsyncStorage.getItem('username');
      const storedNotifications = await AsyncStorage.getItem('notificationsEnabled');
      const storedAutoBackup = await AsyncStorage.getItem('autoBackup');
      
      setUsername(storedUsername || 'Admin');
      setNotificationsEnabled(storedNotifications === 'true');
      setAutoBackup(storedAutoBackup === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
    }
  };

  const handleLogout = () => {
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

  const handleNotificationToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    saveSetting('notificationsEnabled', value.toString());
  };

  const handleAutoBackupToggle = (value: boolean) => {
    setAutoBackup(value);
    saveSetting('autoBackup', value.toString());
    
    if (value) {
      Alert.alert(
        'Auto Backup Enabled',
        'User data will be automatically backed up daily to local storage.'
      );
    }
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This feature will allow you to export all user data to a CSV file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // TODO: Implement data export functionality
            Alert.alert('Coming Soon', 'Data export feature will be available in the next update.');
          },
        },
      ]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About Fitness Manager',
      'Fitness Manager v1.0.0\n\nA comprehensive user and fee management system for fitness centers.\n\nFeatures:\n• User Management\n• Fee Collection\n• WhatsApp Integration\n• Offline Mode\n• Receipt Generation',
      [{ text: 'OK' }]
    );
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'Password change functionality will be available in the next update.',
      [{ text: 'OK' }]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true,
    rightElement,
    danger = false 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
    danger?: boolean;
  }) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, danger && styles.dangerIcon]}>
          <Ionicons 
            name={icon as any} 
            size={20} 
            color={danger ? '#E74C3C' : 'white'} 
          />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, danger && styles.dangerText]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {rightElement}
        {showArrow && !rightElement && (
          <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage your app preferences</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.profileCard}>
            <View style={styles.profileInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.profileName}>{username}</Text>
                <Text style={styles.profileRole}>Administrator</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <SettingItem
            icon="key-outline"
            title="Change Password"
            subtitle="Update your login password"
            onPress={handleChangePassword}
          />
          
          <SettingItem
            icon="download-outline"
            title="Export Data"
            subtitle="Download user data as CSV"
            onPress={handleExportData}
          />
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Receive app notifications"
            showArrow={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#2A3B5C', true: '#4A90E2' }}
                thumbColor={notificationsEnabled ? 'white' : '#B0B0B0'}
              />
            }
          />
          
          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Always enabled for better experience"
            showArrow={false}
            rightElement={
              <Switch
                value={darkModeEnabled}
                onValueChange={() => {}}
                disabled={true}
                trackColor={{ false: '#2A3B5C', true: '#4A90E2' }}
                thumbColor={'#B0B0B0'}
              />
            }
          />
          
          <SettingItem
            icon="cloud-upload-outline"
            title="Auto Backup"
            subtitle="Automatic daily data backup"
            showArrow={false}
            rightElement={
              <Switch
                value={autoBackup}
                onValueChange={handleAutoBackupToggle}
                trackColor={{ false: '#2A3B5C', true: '#4A90E2' }}
                thumbColor={autoBackup ? 'white' : '#B0B0B0'}
              />
            }
          />
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with the app"
            onPress={() => Alert.alert('Help', 'For support, please contact your system administrator.')}
          />
          
          <SettingItem
            icon="information-circle-outline"
            title="About"
            subtitle="App version and information"
            onPress={handleAbout}
          />
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          
          <SettingItem
            icon="log-out-outline"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
            danger={true}
          />
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Fitness Manager v1.0.0</Text>
          <Text style={styles.versionSubtext}>Built with Expo React Native</Text>
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
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileCard: {
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A3B5C',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 2,
  },
  dangerText: {
    color: '#E74C3C',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#666',
  },
});