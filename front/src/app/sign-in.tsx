import { useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthProvider';
import { supabase, supabaseConfigured } from '../lib/supabase';

export default function SignIn() {
  const { session, loading, error: sessionError } = useAuth();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  async function submit() {
    if (busy || !supabaseConfigured) return;
    setError(null); setMessage(null);
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setBusy(true);
    try {
      const credentials = { email: email.trim(), password };
      if (creating) {
        const { data, error: authError } = await supabase.auth.signUp(credentials);
        if (authError) throw authError;
        if (!data.session) {
          setMessage('Check your email and open the confirmation link, then return here to sign in.');
          setCreating(false); setPassword('');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword(credentials);
        if (authError) throw authError;
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not connect. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.brand}>USnitch<Text style={styles.brandDot}>.</Text></Text>
            <Text style={styles.eyebrow}>UNIVERSITY OF UTAH</Text>
            <Text style={styles.title}>{creating ? 'Join the campus watch.' : 'Eyes on campus.'}</Text>
            <Text style={styles.subtitle}>Share a sighting. See what’s happening around you.</Text>
            <View style={styles.tabs}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: !creating }} disabled={busy} onPress={() => { setCreating(false); setError(null); }} style={[styles.tab, !creating && styles.activeTab]}><Text style={styles.tabText}>Sign in</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: creating }} disabled={busy} onPress={() => { setCreating(true); setError(null); setMessage(null); }} style={[styles.tab, creating && styles.activeTab]}><Text style={styles.tabText}>Create account</Text></Pressable>
            </View>
            <Text style={styles.label}>Email</Text>
            <TextInput accessibilityLabel="Email" placeholder="tester@example.com" placeholderTextColor="#AE999F" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" value={email} onChangeText={setEmail} editable={!busy} style={styles.input} />
            <Text style={styles.label}>Password</Text>
            <TextInput accessibilityLabel="Password" placeholder={creating ? '6 characters or more' : 'Your password'} placeholderTextColor="#AE999F" secureTextEntry autoCapitalize="none" autoComplete={creating ? 'new-password' : 'current-password'} textContentType={creating ? 'newPassword' : 'password'} value={password} onChangeText={setPassword} editable={!busy} onSubmitEditing={() => { void submit(); }} style={styles.input} />
            {(error || sessionError) && <Text accessibilityRole="alert" style={styles.error}>{error || sessionError}</Text>}
            {message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
            <Pressable accessibilityRole="button" disabled={busy || loading || !supabaseConfigured} onPress={() => { void submit(); }} style={[styles.submit, (busy || loading || !supabaseConfigured) && styles.disabled]}>
              {busy || loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{creating ? 'Create account' : 'Sign in to USnitch'}</Text>}
            </Pressable>
            <Text style={styles.footnote}>Community sightings, in one shared map.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: '#33262C' },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, alignItems: 'center' },
  card: { width: '100%', maxWidth: 420 }, brand: { fontSize: 44, fontWeight: '900', color: '#fff', letterSpacing: -2 },
  brandDot: { color: '#FB503F' }, eyebrow: { color: '#D7A49E', fontSize: 11, letterSpacing: 2.2, marginTop: 8, marginBottom: 36 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 10 },
  subtitle: { color: '#D7BEC5', fontSize: 16, lineHeight: 24, marginBottom: 28 },
  tabs: { flexDirection: 'row', backgroundColor: '#43333A', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 9 }, activeTab: { backgroundColor: '#78444B' },
  tabText: { color: '#fff', fontSize: 14, fontWeight: '600' }, label: { color: '#F3E3E0', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#43333A', color: '#fff', borderWidth: 1, borderColor: '#73575F', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 18 },
  submit: { backgroundColor: '#E4332D', padding: 17, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' }, disabled: { opacity: 0.5 },
  error: { color: '#FFB4AB', lineHeight: 21, marginBottom: 12 }, message: { color: '#CAE6CF', lineHeight: 22, marginBottom: 12 },
  footnote: { color: '#BCA3AA', fontSize: 12, textAlign: 'center', marginTop: 24 },
});
