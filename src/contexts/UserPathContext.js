import React, { createContext, useContext, useState } from 'react';
import { setUserPath as persistUserPath } from '../services/storage';

const UserPathContext = createContext(null);

export function UserPathProvider({ children }) {
  const [userPath, setUserPathState] = useState('awareness');

  async function setUserPath(path) {
    await persistUserPath(path);
    setUserPathState(path);
  }

  return (
    <UserPathContext.Provider value={{ userPath, setUserPath, setUserPathState }}>
      {children}
    </UserPathContext.Provider>
  );
}

export function useUserPath() {
  return useContext(UserPathContext);
}
