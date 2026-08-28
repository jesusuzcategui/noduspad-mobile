import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_PROFILE,
  loadActiveProfileId,
  loadProfiles,
  saveActiveProfileId,
  saveProfiles,
} from './profileStorage';
import type { Profile } from './types';
import { resetSharedConnection, setActiveProfileId as setCommandServerActiveProfileId } from '../commandServer/commandServerClient';
import { resetOBSSharedConnection, setActiveProfileId as setOBSActiveProfileId } from '../obs/obsCommands';

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([DEFAULT_PROFILE]);
  const [activeProfileId, setActiveProfileId] = useState<string>(DEFAULT_PROFILE.id);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [loadedProfiles, loadedActiveId] = await Promise.all([loadProfiles(), loadActiveProfileId()]);
      if (cancelled) return;
      setProfiles(loadedProfiles);
      setActiveProfileId(loadedActiveId);
      // Both connection clients need to know which profile's config to load
      // on their next connect, even before any switch/create happens.
      setCommandServerActiveProfileId(loadedActiveId);
      setOBSActiveProfileId(loadedActiveId);
      setIsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const switchProfile = useCallback(async (id: string) => {
    await saveActiveProfileId(id);
    setActiveProfileId(id);
    // Tell both connection clients which profile's config to load next,
    // THEN reset the shared sockets so the very next command/OBS action
    // reconnects fresh under the new profile instead of reusing a socket
    // authenticated against the previous profile's server.
    setCommandServerActiveProfileId(id);
    setOBSActiveProfileId(id);
    resetSharedConnection();
    resetOBSSharedConnection();
  }, []);

  const createProfile = useCallback(async (name: string): Promise<Profile> => {
    const trimmed = name.trim();
    // Guard against empty/whitespace names, matching the categories
    // precedent (createCategory returns '' and does nothing). Profile is an
    // object, not an id string, so we signal "no-op" with an empty-id
    // sentinel instead — callers should treat id === '' as "not created".
    if (!trimmed) return { id: '', name: '' };

    const newProfile: Profile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
    };

    let nextProfiles: Profile[] = [];
    setProfiles(prev => {
      nextProfiles = [...prev, newProfile];
      saveProfiles(nextProfiles);
      return nextProfiles;
    });

    // A freshly created, empty profile has no data to lose — auto-switching
    // to it immediately is a natural next step (the user just asked to
    // create it to configure it), rather than requiring an extra explicit
    // switch afterwards.
    await saveActiveProfileId(newProfile.id);
    setActiveProfileId(newProfile.id);
    setCommandServerActiveProfileId(newProfile.id);
    setOBSActiveProfileId(newProfile.id);
    resetSharedConnection();
    resetOBSSharedConnection();

    return newProfile;
  }, []);

  return {
    profiles,
    activeProfileId,
    isLoading,
    switchProfile,
    createProfile,
  };
}
