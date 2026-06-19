import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { login, setAuth, fetchFirstCycleId } from '../src/api';
import { colors } from '../src/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const { token, user } = await login(email, password);
      const cycleId = await fetchFirstCycleId(token);
      await setAuth(token, cycleId ?? undefined, user);
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Login failed', String(e).replace('Error: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fishmaster</Text>
      <Text style={styles.sub}>Aquaculture management</Text>
      <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Pressable style={styles.btn} onPress={submit} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Login'}</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/register')}>
        <Text style={styles.link}>Create account</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.bg },
  title: { fontSize: 32, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  sub: { color: colors.muted, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: colors.card, borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  btn: { backgroundColor: colors.primary, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  link: { color: colors.primary, textAlign: 'center', marginTop: 20 },
});
