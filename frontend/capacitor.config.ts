import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ru.robolabs.robopulse.terminal',
  appName: 'RoboPulse Terminal',
  webDir: 'dist',
  server: {
    allowNavigation: [
      'localhost',
      '127.0.0.1',
      '10.*.*.*',
      '172.*.*.*',
      '192.168.*.*'
    ]
  }
};

export default config;
