import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export default function VisioScreen({ route }) {
  const { roomName } = route.params || {};
  const nomSalle = roomName || 'PharmaciePlusGlobal';
  const url = `https://meet.jit.si/${nomSalle}#config.prejoinPageEnabled=false`;

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: url }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});
