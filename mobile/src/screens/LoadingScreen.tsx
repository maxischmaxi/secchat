import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function LoadingScreen() {
  return (
    <View style={styles.root}>
      <ActivityIndicator color="#3d8bfd" size="large" />
      <Text style={styles.label}>Lade…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: '#888', fontSize: 14, marginTop: 16 },
});
