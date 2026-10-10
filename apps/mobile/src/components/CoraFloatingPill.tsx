import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { C, Radius } from './theme';

export interface CoraFloatingPillProps {
  onPress: () => void;
  label?: string;
  style?: any;
}

export const CoraFloatingPill: React.FC<CoraFloatingPillProps> = ({
  onPress,
  label = 'Ask Cora AI',
  style
}) => {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Ask Cora AI Billing Concierge"
      style={({ pressed }) => [
        styles.pill,
        pressed && styles.pillPressed,
        style
      ]}
    >
      <View style={styles.iconCircle}>
        <Sparkles size={15} color="#FFFFFF" />
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dot} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.hero,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  pillPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }]
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34D399',
    marginLeft: 2
  }
});
