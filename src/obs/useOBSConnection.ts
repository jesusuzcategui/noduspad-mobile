import { useCallback, useEffect, useRef, useState } from 'react';
import OBSWebSocket from 'obs-websocket-js';
import { DEFAULT_OBS_CONFIG, loadOBSConfig, saveOBSConfig } from './obsConnectionStorage';
import type { OBSConnectionConfig, OBSConnectionStatus } from './types';

export function useOBSConnection(profileId: string) {
  const [config, setConfig] = useState<OBSConnectionConfig>(DEFAULT_OBS_CONFIG);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [status, setStatus] = useState<OBSConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const socketRef = useRef<OBSWebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingConfig(true);
    loadOBSConfig(profileId).then(loaded => {
      if (!cancelled) {
        setConfig(loaded);
        setIsLoadingConfig(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const connect = useCallback(async () => {
    setStatus('connecting');
    setErrorMessage(null);
    const socket = new OBSWebSocket();
    try {
      const url = `ws://${config.host}:${config.port}`;
      await socket.connect(url, config.password || undefined);
      socket.on('ConnectionClosed', () => {
        setStatus('idle');
      });
      socketRef.current = socket;
      setStatus('connected');
      await saveOBSConfig(profileId, config);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo conectar a OBS');
    }
  }, [config, profileId]);

  const disconnect = useCallback(async () => {
    await socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('idle');
  }, []);

  return { config, setConfig, isLoadingConfig, status, errorMessage, connect, disconnect };
}
