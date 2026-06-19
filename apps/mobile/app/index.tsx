import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getToken } from '../src/api';
import { colors } from '../src/theme';

export default function Index() {
  useEffect(() => {
    getToken().then((token) => {
      router.replace(token ? '/(tabs)' : '/login');
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
