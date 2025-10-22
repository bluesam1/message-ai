/**
 * Main App Tabs Layout
 * 
 * Protected tab navigation for authenticated users
 */

import { Tabs } from 'expo-router';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../../src/store/AuthContext';

export default function TabsLayout() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    console.log('[TabsLayout] handleLogout called from header button');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('[TabsLayout] User cancelled logout')
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('[TabsLayout] User confirmed logout, calling signOut()...');
            try {
              await signOut();
              console.log('[TabsLayout] signOut() completed successfully');
            } catch (error) {
              console.error('[TabsLayout] Error signing out:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        // Hide the tab bar completely to prevent animation crashes
        tabBarStyle: {
          display: 'none',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Conversations',
          tabBarLabel: 'Chats',
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={{ marginRight: 16 }}
            >
              <Text style={{ fontSize: 16, color: '#007AFF' }}>Logout</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
        }}
      />
    </Tabs>
  );
}


