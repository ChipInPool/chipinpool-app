import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthStack';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

type LoginTab = 'email' | 'phone' | 'username';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { sendOTP, verifyOTP } = useAuth();
  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [identifier, setIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<string>('');
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'email': return 'you@example.com';
      case 'phone': return '+1 (555) 123-4567';
      case 'username': return '@username';
    }
  };

  const getKeyboardType = () => {
    switch (activeTab) {
      case 'email': return 'email-address' as const;
      case 'phone': return 'phone-pad' as const;
      case 'username': return 'default' as const;
    }
  };

  const getTabIcon = (tab: LoginTab): keyof typeof Ionicons.glyphMap => {
    switch (tab) {
      case 'email': return 'mail-outline';
      case 'phone': return 'call-outline';
      case 'username': return 'person-outline';
    }
  };

  const handleSendOTP = async () => {
    if (!identifier.trim()) {
      setError(`Please enter your ${activeTab}`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const method = activeTab === 'phone' ? 'phone' : 'email';
      const result = await sendOTP(identifier.trim(), method);
      setMaskedTarget(result.maskedTarget);
      setDeliveryMethod(result.deliveryMethod);
      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to send login code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.split('').slice(0, 6);
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setOtpDigits(newDigits);
      const code = newDigits.join('');
      setOtpCode(code);
      if (code.length === 6) {
        handleVerifyOTP(code);
      } else {
        const nextIndex = Math.min(index + digits.length, 5);
        otpInputRefs.current[nextIndex]?.focus();
      }
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    const code = newDigits.join('');
    setOtpCode(code);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (code.length === 6) {
      handleVerifyOTP(code);
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      const newDigits = [...otpDigits];
      newDigits[index - 1] = '';
      setOtpDigits(newDigits);
      setOtpCode(newDigits.join(''));
    }
  };

  const handleVerifyOTP = async (code?: string) => {
    const verificationCode = code || otpCode;
    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyOTP(identifier.trim(), verificationCode);
      if (result?.mfaRequired) {
        navigation.navigate('Verify2FA');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid code');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCode('');
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    setError('');
    try {
      const method = activeTab === 'phone' ? 'phone' : 'email';
      const result = await sendOTP(identifier.trim(), method);
      setMaskedTarget(result.maskedTarget);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      setStep('identifier');
      setOtpCode('');
      setOtpDigits(['', '', '', '', '', '']);
      setError('');
    } else {
      navigation.goBack();
    }
  };

  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    setIdentifier('');
    setError('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color="#7FFFD4" />
            <Text style={styles.backButtonText}>{step === 'otp' ? 'Change method' : 'Back'}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.appName}>ChipInPool</Text>
            <Text style={styles.title}>{step === 'identifier' ? 'Welcome back' : 'Enter your code'}</Text>
            <Text style={styles.subtitle}>
              {step === 'identifier'
                ? 'Sign in with a one-time code sent to your email or phone'
                : `We sent a 6-digit code to ${maskedTarget}`
              }
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#f87171" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 'identifier' ? (
            <View style={styles.form}>
              <View style={styles.tabContainer}>
                {(['email', 'phone', 'username'] as LoginTab[]).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.activeTab]}
                    onPress={() => handleTabChange(tab)}
                  >
                    <Ionicons
                      name={getTabIcon(tab)}
                      size={16}
                      color={activeTab === tab ? '#7FFFD4' : '#708090'}
                    />
                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name={getTabIcon(activeTab)}
                    size={20}
                    color="#708090"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={getPlaceholder()}
                    placeholderTextColor="#708090"
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType={getKeyboardType()}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (!identifier.trim() || isLoading) && styles.disabledButton]}
                onPress={handleSendOTP}
                disabled={!identifier.trim() || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#001F3F" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.primaryButtonText}>Send Login Code</Text>
                    <Ionicons name="arrow-forward" size={18} color="#001F3F" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.infoCard}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#7FFFD4" />
                <Text style={styles.infoText}>
                  No password needed. We'll send a secure one-time code to verify your identity.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.deliveryInfo}>
                <View style={styles.deliveryIconContainer}>
                  <Ionicons
                    name={deliveryMethod === 'phone' ? 'chatbubble-outline' : 'mail-outline'}
                    size={24}
                    color="#7FFFD4"
                  />
                </View>
                <Text style={styles.deliveryText}>
                  {deliveryMethod === 'phone' ? 'Code sent via SMS' : 'Code sent via email'}
                </Text>
              </View>

              <View style={styles.otpContainer}>
                {otpDigits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { otpInputRefs.current[index] = ref; }}
                    style={[
                      styles.otpInput,
                      digit ? styles.otpInputFilled : {},
                    ]}
                    value={digit}
                    onChangeText={(value) => handleOtpDigitChange(index, value)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    autoFocus={index === 0}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (otpCode.length !== 6 || isLoading) && styles.disabledButton]}
                onPress={() => handleVerifyOTP()}
                disabled={otpCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#001F3F" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#001F3F" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={handleResend} disabled={isLoading}>
                <Ionicons name="refresh-outline" size={16} color="#7FFFD4" />
                <Text style={styles.resendText}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLinkText}>
              Don't have an account? <Text style={styles.registerLinkHighlight}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backButtonText: {
    color: '#7FFFD4',
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7FFFD4',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#708090',
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    flex: 1,
  },
  form: {
    gap: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(127,255,212,0.12)',
  },
  tabText: {
    color: '#708090',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#7FFFD4',
  },
  inputContainer: {
    gap: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#7FFFD4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#001F3F',
    fontSize: 17,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(127,255,212,0.06)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.12)',
  },
  infoText: {
    color: '#708090',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  deliveryInfo: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  deliveryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(127,255,212,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryText: {
    color: '#708090',
    fontSize: 14,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    textAlign: 'center',
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  otpInputFilled: {
    borderColor: '#7FFFD4',
    backgroundColor: 'rgba(127,255,212,0.08)',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  resendText: {
    color: '#7FFFD4',
    fontSize: 14,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerLinkText: {
    color: '#708090',
    fontSize: 14,
  },
  registerLinkHighlight: {
    color: '#7FFFD4',
    fontWeight: '600',
  },
});
