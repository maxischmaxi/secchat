import { Component, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Letzte Instanz bevor React ohne sichtbare Fehlermeldung scheitert.
 * Zeigt Stack + Message statt weissem Bildschirm — hilfreich auf Release-
 * Builds, wo die Expo-Dev-Redbox nicht greift.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('ErrorBoundary caught', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.body}
      >
        <Text style={styles.title}>App-Fehler</Text>
        <Text style={styles.message}>{error.message}</Text>
        {error.stack ? (
          <View style={styles.stackBox}>
            <Text style={styles.stack}>{error.stack}</Text>
          </View>
        ) : null}
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a0a0a' },
  body: { padding: 24, paddingTop: 72 },
  title: { color: '#ff8c8c', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  message: { color: '#fff', fontSize: 15, marginBottom: 16, lineHeight: 22 },
  stackBox: {
    backgroundColor: '#2a1a1a',
    padding: 12,
    borderRadius: 8,
  },
  stack: {
    color: '#ffcaca',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});
