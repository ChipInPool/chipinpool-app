import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error.message);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle-outline" size={64} color="#7FFFD4" />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              An unexpected error occurred. Please try again.
            </Text>
            {__DEV__ && this.state.error && (
              <Text style={styles.errorDetail} numberOfLines={4}>
                {this.state.error.message}
              </Text>
            )}
            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#001F3F" />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#001F3F',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: 'rgba(127,255,212,0.15)',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(127,255,212,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#708090',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 12,
    color: '#F87171',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7FFFD4',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 16,
  },
  buttonText: {
    color: '#001F3F',
    fontSize: 16,
    fontWeight: '700',
  },
});
