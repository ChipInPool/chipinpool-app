import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthStack';
import { api } from '@/services/api';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
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
    if (!firstName || !lastName || !email || !phone || !password || !dateOfBirth) {
      setError('Please fill in all fields');
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
      await api.auth.register({
        firstName,
        lastName,
        username: username || `@${firstName.toLowerCase()}${Date.now()}`,
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => step === 'verify' ? setStep('info') : navigation.goBack()}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>{step === 'info' ? 'Create account' : 'Verify phone'}</Text>
            <Text style={styles.subtitle}>
              {step === 'info' ? 'Enter your details to get started' : `Enter the code sent to ${phone}`}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'info' ? (
            <View style={styles.form}>
              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput style={styles.input} placeholder="John" placeholderTextColor="#708090" value={firstName} onChangeText={setFirstName} />
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput style={styles.input} placeholder="Doe" placeholderTextColor="#708090" value={lastName} onChangeText={setLastName} />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor="#708090" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone</Text>
                <TextInput style={styles.input} placeholder="+1 (555) 000-0000" placeholderTextColor="#708090" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput style={styles.input} placeholder="1990-01-01" placeholderTextColor="#708090" value={dateOfBirth} onChangeText={setDateOfBirth} />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#708090" value={password} onChangeText={setPassword} secureTextEntry />
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleSendCode} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#001F3F" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput style={styles.input} placeholder="000000" placeholderTextColor="#708090" value={verificationCode} onChangeText={setVerificationCode} keyboardType="number-pad" maxLength={6} />
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#001F3F" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={handleSendCode}>
                <Text style={styles.resendButtonText}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001F3F' },
  scrollContent: { flexGrow: 1, padding: 24 },
  backButton: { marginBottom: 20 },
  backButtonText: { color: '#7FFFD4', fontSize: 16 },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#708090' },
  errorContainer: { backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: '#f87171', fontSize: 14 },
  form: { gap: 20 },
  row: { flexDirection: 'row', gap: 12 },
  inputContainer: { gap: 8 },
  label: { color: '#fff', fontSize: 14, fontWeight: '500' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  primaryButton: { backgroundColor: '#7FFFD4', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#001F3F', fontSize: 18, fontWeight: '600' },
  resendButton: { alignItems: 'center', marginTop: 8 },
  resendButtonText: { color: '#7FFFD4', fontSize: 14 },
});
