import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';

export interface BiometricCapability {
  isAvailable: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
  isEnrolled: boolean;
}

export async function checkBiometricCapability(): Promise<BiometricCapability> {
  try {
    const isAvailable = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: BiometricCapability['biometricType'] = 'none';
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'facial';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return { isAvailable, biometricType, isEnrolled };
  } catch (error) {
    console.log('[Biometric] Error checking capability:', error);
    return { isAvailable: false, biometricType: 'none', isEnrolled: false };
  }
}

export async function authenticateWithBiometrics(reason?: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason || 'Authenticate to continue',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });

    return result.success;
  } catch (error) {
    console.log('[Biometric] Authentication error:', error);
    return false;
  }
}

export function getBiometricLabel(type: BiometricCapability['biometricType']): string {
  switch (type) {
    case 'facial': return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
    case 'fingerprint': return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case 'iris': return 'Iris Scanner';
    default: return 'Biometrics';
  }
}

export function getBiometricIcon(type: BiometricCapability['biometricType']): string {
  switch (type) {
    case 'facial': return 'scan-outline';
    case 'fingerprint': return 'finger-print-outline';
    case 'iris': return 'eye-outline';
    default: return 'lock-closed-outline';
  }
}
