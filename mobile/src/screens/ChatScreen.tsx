import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export function ChatScreen({ route }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <View style={styles.body}>
        <Text style={styles.placeholder}>
          Chat-UI für {route.params.groupId}.{'\n\n'}
          Kommt mit Nachrichten-Composer + MLS-Encryption in Phase 3.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0d0d' },
  body: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
