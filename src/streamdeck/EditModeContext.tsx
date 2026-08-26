import React, { createContext, useContext, useMemo, useState } from 'react';

type EditModeContextValue = {
  isEditMode: boolean;
  toggleEditMode: () => void;
};

const EditModeContext = createContext<EditModeContextValue | null>(null);

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const value = useMemo(
    () => ({ isEditMode, toggleEditMode: () => setIsEditMode(prev => !prev) }),
    [isEditMode],
  );
  return <EditModeContext.Provider value={value}>{children}</EditModeContext.Provider>;
}

export function useEditMode(): EditModeContextValue {
  const context = useContext(EditModeContext);
  if (!context) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}
