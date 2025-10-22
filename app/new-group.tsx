/**
 * New Group Screen
 * Allows users to create a new group conversation
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import GroupCreation from '../src/components/chat/GroupCreation';

export default function NewGroupScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'New Group',
          headerBackTitle: 'Back',
        }}
      />
      <GroupCreation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

