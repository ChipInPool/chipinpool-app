import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthStack';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

type LoginTab = 'email' | 'phone' | 'username';

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { sendOTP, verifyOTP, loginWithUsername } = useAuth();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<LoginTab>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'identifier' | 'otp'>('identifier');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [maskedTarget, setMaskedTarget] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<string>('');
  const hiddenInputRef = useRef<TextInput>(null);

  const isUsernameTab = activeTab === 'username';

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
      setOtpCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to send login code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameLogin = async () => {
    if (!identifier.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginWithUsername(identifier.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtpCode(cleaned);
    if (cleaned.length === 6 && !isLoading) {
      hiddenInputRef.current?.blur();
      handleVerifyOTP(cleaned);
    }
  };

  const handleVerifyOTP = async (code?: string) => {
    const verificationCode = code || otpCode;
    if (verificationCode.length !== 6 || isLoading) {
      if (verificationCode.length !== 6) setError('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await verifyOTP(identifier.trim(), verificationCode);
    } catch (err: any) {
      setError(err.message || 'Invalid code');
      setOtpCode('');
      hiddenInputRef.current?.focus();
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
      setError('');
    } else {
      navigation.goBack();
    }
  };

  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const handleSubmit = () => {
    if (isUsernameTab) {
      handleUsernameLogin();
    } else {
      handleSendOTP();
    }
  };

  const isSubmitDisabled = () => {
    if (isUsernameTab) {
      return !identifier.trim() || !password.trim() || isLoading;
    }
    return !identifier.trim() || isLoading;
  };

  const buttonTextColor = isDark ? '#001F3F' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color={colors.mint} />
            <Text style={[styles.backButtonText, { color: colors.mint }]}>{step === 'otp' ? 'Change method' : 'Back'}</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.appName, { color: colors.mint }]}>ChipInPool</Text>
            <Text style={[styles.title, { color: colors.text }]}>{step === 'identifier' ? 'Welcome back' : 'Enter your code'}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {step === 'identifier'
                ? isUsernameTab
                  ? 'Sign in with your username and password'
                  : 'Sign in with a one-time code sent to your email or phone'
                : `We sent a 6-digit code to ${maskedTarget}`
              }
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={colors.red} />
              <Text style={[styles.errorText, { color: colors.red }]}>{error}</Text>
            </View>
          ) : null}

          {step === 'identifier' ? (
            <View style={styles.form}>
              <View style={[styles.tabContainer, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                {(['email', 'phone', 'username'] as LoginTab[]).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tab, activeTab === tab && { backgroundColor: `${colors.mint}20` }]}
                    onPress={() => handleTabChange(tab)}
                  >
                    <Ionicons
                      name={getTabIcon(tab)}
                      size={16}
                      color={activeTab === tab ? colors.mint : colors.slate}
                    />
                    <Text style={[styles.tabText, { color: colors.slate }, activeTab === tab && { color: colors.mint }]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputContainer}>
                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                  <Ionicons
                    name={getTabIcon(activeTab)}
                    size={20}
                    color={colors.slate}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder={getPlaceholder()}
                    placeholderTextColor={colors.slate}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType={getKeyboardType()}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>

                {isUsernameTab && (
                  <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={colors.slate}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Password"
                      placeholderTextColor={colors.slate}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.slate}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.mint }, isSubmitDisabled() && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isSubmitDisabled()}
              >
                {isLoading ? (
                  <ActivityIndicator color={buttonTextColor} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>
                      {isUsernameTab ? 'Sign In' : 'Send Login Code'}
                    </Text>
                    <Ionicons name={isUsernameTab ? 'log-in-outline' : 'arrow-forward'} size={18} color={buttonTextColor} />
                  </View>
                )}
              </TouchableOpacity>

              <View style={[styles.infoCard, { backgroundColor: `${colors.mint}10`, borderColor: `${colors.mint}20` }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.mint} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {isUsernameTab
                    ? 'Sign in securely with your username and password.'
                    : 'No password needed. We\'ll send a secure one-time code to verify your identity.'
                  }
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.deliveryInfo}>
                <View style={[styles.deliveryIconContainer, { backgroundColor: `${colors.mint}1A` }]}>
                  <Ionicons
                    name={deliveryMethod === 'phone' ? 'chatbubble-outline' : 'mail-outline'}
                    size={24}
                    color={colors.mint}
                  />
                </View>
                <Text style={[styles.deliveryText, { color: colors.textSecondary }]}>
                  {deliveryMethod === 'phone' ? 'Code sent via SMS' : 'Code sent via email'}
                </Text>
              </View>

              <TouchableOpacity 
                style={styles.otpContainer} 
                activeOpacity={1}
                onPress={() => hiddenInputRef.current?.focus()}
              >
                <TextInput
                  ref={hiddenInputRef}
                  style={styles.hiddenInput}
                  value={otpCode}
                  onChangeText={handleOtpChange}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  autoFocus
                  caretHidden
                />
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.otpInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.cardBorder },
                      otpCode[index] ? { borderColor: colors.mint, backgroundColor: `${colors.mint}14` } : {},
                    ]}
                  >
                    <Text style={[styles.otpDigitText, { color: colors.text }]}>{otpCode[index] || ''}</Text>
                  </View>
                ))}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.mint }, (otpCode.length !== 6 || isLoading) && styles.disabledButton]}
                onPress={() => handleVerifyOTP()}
                disabled={otpCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={buttonTextColor} />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={[styles.primaryButtonText, { color: buttonTextColor }]}>Verify & Sign In</Text>
                    <Ionicons name="checkmark-circle" size={18} color={buttonTextColor} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={handleResend} disabled={isLoading}>
                <Ionicons name="refresh-outline" size={16} color={colors.mint} />
                <Text style={[styles.resendText, { color: colors.mint }]}>Resend code</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.registerLinkText, { color: colors.textSecondary }]}>
              Don't have an account? <Text style={{ color: colors.mint, fontWeight: '600' }}>Sign up</Text>
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
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
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
    fontSize: 14,
    flex: 1,
  },
  form: {
    gap: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
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
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputContainer: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  primaryButton: {
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
    fontSize: 17,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryText: {
    fontSize: 14,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  registerLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerLinkText: {
    fontSize: 14,
  },
});
