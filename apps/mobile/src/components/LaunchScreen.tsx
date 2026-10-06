import { ActivityIndicator, Text, View } from 'react-native';

// Bare-primitive launch screen (no design-system imports) so it renders
// even if another module fails to load.
export default function LaunchScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F3F5F9', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontSize: 30, fontWeight: '800' }}>+</Text>
      </View>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#101E33' }}>MedCore</Text>
      <ActivityIndicator size="small" color="#2563EB" />
    </View>
  );
}
