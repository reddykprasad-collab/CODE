export const colors = {
  // Surfaces — warm light mode
  cream: '#F7F5F0',
  creamMid: '#EDE9E2',
  white: '#FFFFFF',

  // Primary — deep electric violet (much more saturated than before)
  lav: '#5335F5',
  lavLight: '#8B74FF',
  lavPale: '#EDE8FF',
  lavDark: '#3B22CE',

  // Positive — vivid emerald
  sage: '#059669',
  sageDark: '#047857',
  sagePale: '#ECFDF5',
  sageBorder: '#6EE7B7',

  // Text
  slate: '#0E0D1A',
  slateMid: '#3D3D52',
  slateLight: '#73728A',

  // Borders
  border: '#E0DBD4',

  // Alert — bold coral-red
  terra: '#E8442A',
  terraDark: '#B52415',
  terraPale: '#FEF0EC',
  terraBorder: '#FBBBAF',
  terraStrong: '#FDD8D2',

  // Misc
  amber: '#D97706',
};

export const fonts = {
  display: 'CormorantGaramond_400Regular',
  displayLight: 'CormorantGaramond_300Light',
  displayItalic: 'CormorantGaramond_400Regular_Italic',
  displayLightItalic: 'CormorantGaramond_300Light_Italic',
  body: 'Jost_400Regular',
  bodyLight: 'Jost_300Light',
  bodyMedium: 'Jost_500Medium',
  bodySemiBold: 'Jost_600SemiBold',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  full: 100,
};

export const shadows = {
  sm: {
    shadowColor: '#0E0D1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#0E0D1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const textSize = {
  micro: 11,
  fine: 12,
  label: 13,
  caption: 14,
  body: 15,
  base: 16,
  bodyLarge: 17,
  icon: 18,
  title: 20,
  titleMd: 21,
  heading: 22,
  headingMd: 24,
  headingLg: 26,
  display: 28,
  displayMd: 30,
  displayLg: 32,
  displayXl: 36,
  metric: 40,
  metricLg: 42,
  hero: 50,
};

// Gradient presets
export const gradients = {
  primary: ['#5335F5', '#059669'],   // deep violet → vivid emerald
  violet: ['#3B22CE', '#8B74FF'],
  emerald: ['#047857', '#059669'],
  danger: ['#B52415', '#E8442A'],
};
