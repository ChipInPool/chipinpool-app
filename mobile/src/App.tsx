import { enableScreens } from 'react-native-screens';
enableScreens(true);

import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '@/hooks/useAuth';
import RootNavigator from '@/navigation/RootNavigator';
import ErrorBoundary from '@/components/ErrorBoundary';

LogBox.ignoreLogs(['Reanimated']);

if (typeof globalThis.ErrorUtils !== 'undefined') {
  const defaultErrorHandler = (globalThis.ErrorUtils as any).getGlobalHandler?.();
  (globalThis.ErrorUtils as any).setGlobalHandler((error: Error, isFatal?: boolean) => {
    console.error('[GlobalErrorHandler]', isFatal ? 'FATAL:' : 'ERROR:', error?.message);
    if (!isFatal && defaultErrorHandler) {
      defaultErrorHandler(error, isFatal);
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NavigationContainer>
                <RootNavigator />
                <StatusBar style="light" />
              </NavigationContainer>
            </AuthProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
