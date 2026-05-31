import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@migraine/font_scale';

export const FONT_SCALES = [
  { key: 'small',  label: 'A',  scale: 0.85 },
  { key: 'medium', label: 'A',  scale: 1.0  },
  { key: 'large',  label: 'A',  scale: 1.2  },
];

const FontSizeContext = createContext({ scaleKey: 'medium', scale: 1.0, fs: n => n, setScaleKey: () => {} });

export function FontSizeProvider({ children }) {
  const [scaleKey, setScaleKeyState] = useState('medium');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val && FONT_SCALES.find(s => s.key === val)) setScaleKeyState(val);
    });
  }, []);

  const currentScale = FONT_SCALES.find(s => s.key === scaleKey)?.scale ?? 1.0;

  function setScaleKey(key) {
    setScaleKeyState(key);
    AsyncStorage.setItem(STORAGE_KEY, key);
  }

  // fs(n) returns n scaled and rounded to avoid sub-pixel jitter
  const fs = (n) => Math.round(n * currentScale);

  return (
    <FontSizeContext.Provider value={{ scaleKey, scale: currentScale, fs, setScaleKey }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  return useContext(FontSizeContext);
}
