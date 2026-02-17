import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthStack';
import { api } from '@/services/api';
import { useTheme } from '@/theme/ThemeContext';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState<'info' | 'verify'>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const handleSendCode = async () => {
    if (!firstName || !lastName || !username || !email || !phone || !password || !dateOfBirth) {
      setError('Please fill in all fields');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.auth.sendPhoneCode(phone);
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.auth.verifyPhoneCode(phone, verificationCode);

      await api.auth.register({
        firstName,
        lastName,
        username: username.toLowerCase(),
        email,
        phone,
        password,
        dateOfBirth,
        phoneVerificationCode: verificationCode,
        acceptTerms: true,
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const buttonTextColor = isDark ? '#001F3F' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => step === 'verify' ? setStep('info') : navigation.goBack()}>
            <Text style={[styles.backButtonText, { color: colors.mint }]}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.appName, { color: colors.mint }]}>ChipInPool</Text>
            <Text style={[styles.title, { color: colors.text }]}>{step === 'info' ? 'Create account' : 'Verify phone'}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {step === 'info' ? 'Enter your details to get started' : `Enter the code sent to ${phone}`}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
            </View>
          ) : null}

          {step === 'info' ? (
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>First Name</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]} placeholder="John" placeholderTextColor={colors.slate} value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.text }]}>Last Name</Text>
                  <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]} placeholder="Doe" placeholderTextColor={colors.slate} value={lastName} onChangeText={setLastName} />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Username</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]} placeholder="johndoe" placeholderTextColor={colors.slate} value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Email</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]} placeholder="you@example.com" placeholderTextColor={colors.slate} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]} placeholder="+1 (555) 000-0000" placeholderTextColor={colors.slate} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]} placeholder="1990-01-01" placeholderTextColor={colors.slate} value={dateOfBirth} onChangeText={setDateOfBirth} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Password</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]} placeholder="••••••••" placeholderTextColor={colors.slate} value={password} onChangeText={setPassword} secureTextEntry />
              </View>

              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.mint }]} onPress={handleSendCode} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color={buttonTextColor} /> : <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>Continue</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Verification Code</Text>
                <TextInput style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder, color: colors.text }]} placeholder="000000" placeholderTextColor={colors.slate} value={verificationCode} onChangeText={setVerificationCode} keyboardType="number-pad" maxLength={6} />
              </View>

              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.mint }]} onPress={handleRegister} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color={buttonTextColor} /> : <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>Create Account</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={handleSendCode}>
                <Text style={[styles.resendButtonText, { color: colors.mint }]}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  backButton: { marginBottom: 20 },
  backButtonText: { fontSize: 16 },
  header: { marginBottom: 32 },
  appName: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16 },
  errorContainer: { backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14 },
  form: { gap: 20 },
  row: { flexDirection: 'row', gap: 12 },
  inputContainer: { gap: 8 },
  label: { fontSize: 14, fontWeight: '500' },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  primaryButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { fontSize: 18, fontWeight: '600' },
  resendButton: { alignItems: 'center', marginTop: 8 },
  resendButtonText: { fontSize: 14 },
});
