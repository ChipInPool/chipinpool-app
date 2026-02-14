import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface TourStep {
  title: string;
  description: string;
  spotlightY: number;
  spotlightHeight: number;
  tooltipPosition: 'above' | 'below';
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS: (TourStep | null)[] = [
  null,
  {
    title: 'Your Wallet',
    description: 'View your available balance here. Tap Add Funds to deposit money or Withdraw to cash out to your bank.',
    spotlightY: 0.27,
    spotlightHeight: 0.20,
    tooltipPosition: 'below',
  },
  {
    title: 'Quick Actions',
    description: 'Create pools, join existing ones, shop with Spend Now, or check your recent activity — all in one tap.',
    spotlightY: 0.53,
    spotlightHeight: 0.14,
    tooltipPosition: 'below',
  },
  {
    title: 'Your Pools',
    description: 'See your active pools at a glance. Tap any pool to view details, contribute, invite friends, or manage it.',
    spotlightY: 0.74,
    spotlightHeight: 0.18,
    tooltipPosition: 'above',
  },
  {
    title: 'Friends, Cards & Spend Now',
    description: 'Find and follow friends in Explore. View virtual Visa cards in the Cards tab. Shop at partnered stores with Spend Now.',
    spotlightY: 0.95,
    spotlightHeight: 0.08,
    tooltipPosition: 'above',
  },
  {
    title: 'Navigation',
    description: 'Use the bottom tabs to switch between Home, Pools, Wallet, Spend Now, and your Profile. Add payment methods in Profile settings.',
    spotlightY: 0.95,
    spotlightHeight: 0.08,
    tooltipPosition: 'above',
  },
];

const WELCOME_STEP = {
  title: 'Welcome to ChipInPool!',
  description: "Let's take a quick tour of the app to help you get started.",
};

export function GuidedTour({ isOpen, onClose }: GuidedTourProps) {
  const { colors, isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const statusBarHeight = Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 0);

  const totalSteps = TOUR_STEPS.length;

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  useEffect(() => {
    slideAnim.setValue(20);
    Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start();
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const handleFinish = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onClose();
    });
  };

  if (!isOpen) return null;

  const isWelcome = currentStep === 0;
  const step = TOUR_STEPS[currentStep];
  const stepInfo = isWelcome ? WELCOME_STEP : step;

  const cardBg = isDark ? '#0D2B4E' : colors.card;
  const borderColor = isDark ? 'rgba(127,255,212,0.15)' : colors.cardBorder;

  const spotlightTop = step ? step.spotlightY * screenHeight - (step.spotlightHeight * screenHeight) / 2 : 0;
  const spotlightH = step ? step.spotlightHeight * screenHeight : 0;
  const spotlightPadding = 12;

  const renderOverlay = () => {
    if (isWelcome || !step) {
      return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]} />
      );
    }

    const sTop = Math.max(0, spotlightTop - spotlightPadding);
    const sHeight = spotlightH + spotlightPadding * 2;
    const sLeft = spotlightPadding;
    const sRight = spotlightPadding;
    const bottomTop = sTop + sHeight;
    const bottomH = Math.max(0, screenHeight - bottomTop);

    return (
      <>
        <View style={[styles.overlayPiece, { top: 0, left: 0, right: 0, height: sTop }]} />
        <View style={[styles.overlayPiece, { top: bottomTop, left: 0, right: 0, height: bottomH }]} />
        <View style={[styles.overlayPiece, { top: sTop, left: 0, width: sLeft, height: sHeight }]} />
        <View style={[styles.overlayPiece, { top: sTop, right: 0, width: sRight, height: sHeight }]} />
        <View
          style={[
            styles.spotlightBorder,
            {
              top: sTop,
              left: sLeft,
              right: sRight,
              height: sHeight,
              borderColor: colors.mint,
            },
          ]}
        />
      </>
    );
  };

  const renderTooltip = () => {
    if (!stepInfo) return null;

    let tooltipTop: number;
    if (isWelcome) {
      tooltipTop = screenHeight * 0.3;
    } else if (step?.tooltipPosition === 'above') {
      tooltipTop = spotlightTop - spotlightPadding - 220;
      if (tooltipTop < statusBarHeight + 10) tooltipTop = statusBarHeight + 10;
    } else {
      tooltipTop = spotlightTop + spotlightH + spotlightPadding + 16;
      if (tooltipTop + 220 > screenHeight) tooltipTop = screenHeight - 230;
    }

    return (
      <Animated.View
        style={[
          styles.tooltipCard,
          {
            top: tooltipTop,
            left: 20,
            right: 20,
            backgroundColor: cardBg,
            borderColor: borderColor,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.tooltipHeader}>
          <View style={styles.stepCounter}>
            <Ionicons name="compass-outline" size={16} color={colors.mint} />
            <Text style={[styles.stepCounterText, { color: colors.textSecondary }]}>
              Step {currentStep + 1} of {totalSteps}
            </Text>
          </View>
          <TouchableOpacity onPress={handleFinish} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.tooltipTitle, { color: colors.text }]}>{stepInfo.title}</Text>
        <Text style={[styles.tooltipDescription, { color: colors.textSecondary }]}>{stepInfo.description}</Text>

        <View style={styles.tooltipActions}>
          <TouchableOpacity onPress={handleFinish}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip Tour</Text>
          </TouchableOpacity>
          <View style={styles.navButtons}>
            {currentStep > 0 && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <Ionicons name="chevron-back" size={14} color={colors.textSecondary} />
                <Text style={[styles.backButtonText, { color: colors.textSecondary }]}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.mint }]}
              onPress={handleNext}
              activeOpacity={0.8}
            >
              <Text style={[styles.nextButtonText, { color: isDark ? '#001F3F' : '#FFFFFF' }]}>
                {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
              </Text>
              {currentStep < totalSteps - 1 && (
                <Ionicons name="chevron-forward" size={14} color={isDark ? '#001F3F' : '#FFFFFF'} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dotContainer}>
          {TOUR_STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentStep
                  ? { width: 16, backgroundColor: colors.mint }
                  : i < currentStep
                  ? { width: 6, backgroundColor: colors.mint, opacity: 0.5 }
                  : { width: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : colors.cardBorder },
              ]}
            />
          ))}
        </View>
      </Animated.View>
    );
  };

  return (
    <Modal visible={isOpen} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleFinish}
        >
          {renderOverlay()}
        </TouchableOpacity>
        {renderTooltip()}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayPiece: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  spotlightBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  tooltipCard: {
    position: 'absolute',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  tooltipActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
