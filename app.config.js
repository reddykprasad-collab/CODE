module.exports = {
  expo: {
    name: 'Migraine Companion',
    slug: 'migraine-companion',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#F7F4EF',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.prasad.migrainecompanion',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#F7F4EF',
      },
      package: 'com.prasad.migrainecompanion',
    },
    plugins: [
      [
        'expo-notifications',
        {
          color: '#8E7DC4',
        },
      ],
    ],
    extra: {
      claudeApiKey: process.env.CLAUDE_API_KEY,
      eas: {
        projectId: 'your-eas-project-id',
      },
    },
  },
};
