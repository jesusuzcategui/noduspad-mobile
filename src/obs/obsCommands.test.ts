import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveOBSConfig } from './obsConnectionStorage';
import { executeOBSCommand, resetOBSSharedConnection, setActiveProfileId } from './obsCommands';

// Minimal fake matching the subset of the obs-websocket-js API this module
// actually uses (connect/disconnect/call/on), so tests can control exactly
// when `connect()` resolves and simulate a stale connection. Defined inside
// the jest.mock() factory (with a `mock`-prefixed name) because Jest hoists
// jest.mock() calls above the rest of the module and forbids referencing
// out-of-scope variables from the factory.
jest.mock('obs-websocket-js', () => {
  class MockOBSSocket {
    static instances: MockOBSSocket[] = [];
    url = '';
    password: string | undefined;
    connected = false;
    disconnected = false;
    handlers: Partial<Record<string, () => void>> = {};
    calls: string[] = [];

    constructor() {
      MockOBSSocket.instances.push(this);
    }

    connect(url: string, password?: string) {
      this.url = url;
      this.password = password;
      this.connected = true;
      return Promise.resolve({ obsWebSocketVersion: '5.0.0', negotiatedRpcVersion: 1 });
    }

    disconnect() {
      this.disconnected = true;
      this.connected = false;
      return Promise.resolve();
    }

    on(event: string, handler: () => void) {
      this.handlers[event] = handler;
    }

    call(request: string) {
      this.calls.push(request);
      return Promise.resolve({});
    }

    // Test helper: simulate the server dropping the connection.
    emitConnectionClosed() {
      this.handlers.ConnectionClosed?.();
    }
  }

  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => new MockOBSSocket()),
    __MockOBSSocket: MockOBSSocket,
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __MockOBSSocket: FakeOBSSocket } = jest.requireMock('obs-websocket-js') as {
  __MockOBSSocket: {
    instances: Array<{
      url: string;
      password: string | undefined;
      connected: boolean;
      disconnected: boolean;
      handlers: Partial<Record<string, () => void>>;
      calls: string[];
      emitConnectionClosed: () => void;
    }>;
  };
};

const flushMicrotasks = () => new Promise<void>(resolve => setImmediate(resolve));

describe('obsCommands', () => {
  beforeEach(async () => {
    FakeOBSSocket.instances = [];
    await AsyncStorage.clear();
    setActiveProfileId('default');
    resetOBSSharedConnection();
    await saveOBSConfig('default', { host: '192.168.1.16', port: '4455', password: 'secret' });
  });

  it('resetOBSSharedConnection disconnects the live socket instead of just nulling the reference', async () => {
    await executeOBSCommand('start-record');
    expect(FakeOBSSocket.instances).toHaveLength(1);
    const socket = FakeOBSSocket.instances[0];
    expect(socket.disconnected).toBe(false);

    resetOBSSharedConnection();

    expect(socket.disconnected).toBe(true);

    // Next command opens a brand-new socket rather than reusing the torn
    // down one.
    await executeOBSCommand('start-record');
    expect(FakeOBSSocket.instances).toHaveLength(2);
    expect(FakeOBSSocket.instances[1]).not.toBe(socket);
  });

  it('a stale ConnectionClosed event from a disconnected old socket does not null out the new healthy connection', async () => {
    await executeOBSCommand('start-record');
    const oldSocket = FakeOBSSocket.instances[0];

    resetOBSSharedConnection();
    await executeOBSCommand('start-record');
    const newSocket = FakeOBSSocket.instances[1];
    expect(newSocket).not.toBe(oldSocket);

    // The old socket's ConnectionClosed handler firing asynchronously after
    // the new one is already live must not clear the new shared connection.
    oldSocket.emitConnectionClosed();

    // A subsequent command must reuse the still-healthy new socket, not
    // reconnect a third time.
    await executeOBSCommand('start-record');
    expect(FakeOBSSocket.instances).toHaveLength(2);
  });

  it('a stale connect started before a profile switch does not win the race and assign itself as the shared socket', async () => {
    await saveOBSConfig('profile-2', { host: '10.0.0.5', port: '4456', password: 'other' });

    // Start a connect attempt for the 'default' profile — dispatched but not
    // yet resolved (connect() is async even though this fake resolves it
    // immediately as a microtask).
    const stalePromise = executeOBSCommand('start-record');
    stalePromise.catch(() => {});

    // Profile switch happens with no await in between, mirroring
    // useProfiles.switchProfile(): currentProfileId updates, then
    // resetOBSSharedConnection() bumps the generation counter.
    setActiveProfileId('profile-2');
    resetOBSSharedConnection();

    await flushMicrotasks();
    await expect(stalePromise).rejects.toThrow();

    // The stale socket must have been created (connect() was awaited) but
    // then discarded — disconnected, not left as the shared connection.
    expect(FakeOBSSocket.instances).toHaveLength(1);
    expect(FakeOBSSocket.instances[0].disconnected).toBe(true);

    // A fresh, real command now connects using the NEW profile's config.
    await executeOBSCommand('start-record');
    expect(FakeOBSSocket.instances).toHaveLength(2);
    const freshSocket = FakeOBSSocket.instances[1];
    expect(freshSocket.url).toBe('ws://10.0.0.5:4456');
    expect(freshSocket.disconnected).toBe(false);
  });
});
