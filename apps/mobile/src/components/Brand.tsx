import { Image, View } from 'react-native';
import { ASSETS } from '../lib/assets';

export default function Brand({ size = 44, stacked = false }: { size?: number; stacked?: boolean }) {
  return <View accessible accessibilityLabel="MedCore" style={{ flexDirection: stacked ? 'column' : 'row', alignItems: 'center', gap: stacked ? 20 : 10 }}>
    <Image source={ASSETS.brand.badge} resizeMode="contain" accessible={false} style={{ width: size, height: size }} />
    <Image source={ASSETS.brand.wordmark} resizeMode="contain" accessible={false} style={{ width: stacked ? 180 : 126, height: stacked ? 72 : 50 }} />
  </View>;
}
