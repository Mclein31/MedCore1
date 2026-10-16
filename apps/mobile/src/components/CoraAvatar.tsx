import { Image } from 'react-native';
import { ASSETS } from '../lib/assets';

// Cora's identity is artwork; the surrounding label names the assistant/action.
export function CoraAvatar({ size = 32 }: { size?: number }) {
  return (
    <Image
      testID="cora-avatar"
      source={ASSETS.brand.cora}
      resizeMode="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );
}
