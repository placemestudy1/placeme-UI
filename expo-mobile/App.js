import React from 'react';
import { StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  // /app serves the native-shell routes (NativeTabScreen / NativeStackScreen)
  // which are specifically designed for a mobile viewport.
  // 10.0.2.2 is the Android emulator's alias for the host machine's localhost.
  const targetUrl = 'http://10.0.2.2:8080/app';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <WebView 
        source={{ uri: targetUrl }} 
        style={styles.webview} 
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  webview: {
    flex: 1,
  },
});
