import React, { createContext, useContext } from 'react';
import { useProfiles } from './useProfiles';
import { DEFAULT_PROFILE } from './profileStorage';
import type { Profile } from './types';

type ProfileContextValue = {
  profiles: Profile[];
  activeProfileId: string;
  isLoading: boolean;
  switchProfile: (id: string) => Promise<void>;
  createProfile: (name: string) => Promise<Profile>;
};

// Inert default so components that read profile context outside a
// <ProfileProvider> (e.g. component tests rendering AppBar/GlassDrawerContent
// in isolation, the way this repo's existing tests do) still render sensibly
// with the single default profile instead of crashing. Production code is
// always rendered under DashboardShell's <ProfileProvider>.
const defaultContextValue: ProfileContextValue = {
  profiles: [DEFAULT_PROFILE],
  activeProfileId: DEFAULT_PROFILE.id,
  isLoading: false,
  switchProfile: async () => {},
  createProfile: async () => DEFAULT_PROFILE,
};

const ProfileContext = createContext<ProfileContextValue>(defaultContextValue);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const value = useProfiles();
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext(): ProfileContextValue {
  return useContext(ProfileContext);
}
