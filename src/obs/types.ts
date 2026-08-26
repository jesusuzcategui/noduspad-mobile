export type OBSConnectionConfig = {
  host: string;
  port: string;
  password: string;
};

export type OBSConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';
