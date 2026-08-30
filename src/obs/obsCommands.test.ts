import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveOBSConfig } from './obsConnectionStorage';
import {
  executeOBSCommand,
  fetchVerticalScenes,
  resetOBSSharedConnection,
  setActiveProfileId,
} from './obsCommands';

// Minimal fake matching the subset of the obs-websocket-js API this module
// actually uses (connect/disconnect/call/on), so tests can control exactly
// when `connect()` resolves and simulate a stale connection. Defined inside
// the jest.mock() factory (with a `mock`-prefixed name) because Jest hoists
// jest.mock() calls above the rest of the module and forbids referencing
// out-of-scope variables from the factory.
jest.mock('obs-websocket-js', () => {
  class MockOBSSocket {
    static instances: MockOBSSocket[] = [];
    // Scripted `CallVendorRequest` response for the whole test — set by a
    // test before invoking the vendor call it wants to inspect the result
    // of; reset to a plain empty responseData in beforeEach.
    static vendorResponse: { responseData?: Record<string, unknown> } = { responseData: {} };
    url = '';
    password: string | undefined;
    connected = false;
    disconnected = false;
    handlers: Partial<Record<string, () => void>> = {};
    calls: string[] = [];
    // Full (request, data) pairs — `calls` above only tracks request names
    // for the pre-existing tests; this captures the requestData too so
    // vendor-request tests can assert the exact shape sent.
    callArgs: Array<{ request: string; data?: unknown }> = [];

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

    call(request: string, data?: unknown) {
      this.calls.push(request);
      this.callArgs.push({ request, data });
      if (request === 'CallVendorRequest') {
        const { vendorName, requestType } = (data ?? {}) as { vendorName?: string; requestType?: string };
        return Promise.resolve({
          vendorName,
          requestType,
          responseData: MockOBSSocket.vendorResponse.responseData ?? {},
        });
      }
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
      callArgs: Array<{ request: string; data?: unknown }>;
      emitConnectionClosed: () => void;
    }>;
    vendorResponse: { responseData?: Record<string, unknown> };
  };
};

const flushMicrotasks = () => new Promise<void>(resolve => setImmediate(resolve));

describe('obsCommands', () => {
  beforeEach(async () => {
    FakeOBSSocket.instances = [];
    FakeOBSSocket.vendorResponse = { responseData: {} };
    await AsyncStorage.clear();
    setActiveProfileId('default');
    resetOBSSharedConnection();
    await saveOBSConfig('default', { host: '192.168.1.16', port: '4455', password: 'secret' });
  });

  describe('Aitum Vertical (vertical canvas) support', () => {
    it('fetchVerticalScenes calls CallVendorRequest with the aitum-vertical-canvas vendor and get_scenes, and returns the scene list', async () => {
      // Real plugin shape (vertical-canvas.cpp's vendor_request_get_scenes):
      // scenes is an array of objects `{ name: "SceneName" }`, not strings.
      FakeOBSSocket.vendorResponse = {
        responseData: { scenes: [{ name: 'Vertical A' }, { name: 'Vertical B' }], success: true },
      };

      const scenes = await fetchVerticalScenes();

      expect(scenes).toEqual(['Vertical A', 'Vertical B']);
      expect(FakeOBSSocket.instances).toHaveLength(1);
      const call = FakeOBSSocket.instances[0].callArgs.find(c => c.request === 'CallVendorRequest');
      expect(call?.data).toEqual({
        vendorName: 'aitum-vertical-canvas',
        requestType: 'get_scenes',
        requestData: {},
      });
      // fetchVerticalScenes opens its own connection and tears it down —
      // mirrors fetchOBSScenes, must not leak into the shared socket.
      expect(FakeOBSSocket.instances[0].disconnected).toBe(true);
    });

    it("executeOBSCommand('change-vertical-scene', sceneName) calls CallVendorRequest with switch_scene via the shared socket", async () => {
      await executeOBSCommand('change-vertical-scene', 'Vertical A');

      expect(FakeOBSSocket.instances).toHaveLength(1);
      const call = FakeOBSSocket.instances[0].callArgs.find(c => c.request === 'CallVendorRequest');
      expect(call?.data).toEqual({
        vendorName: 'aitum-vertical-canvas',
        requestType: 'switch_scene',
        requestData: { scene: 'Vertical A' },
      });
    });

    it("executeOBSCommand('change-vertical-scene') without a sceneName throws the same 'no scene selected' error as change-scene", async () => {
      await expect(executeOBSCommand('change-vertical-scene')).rejects.toThrow(
        'Este botón no tiene una escena seleccionada',
      );
      await expect(executeOBSCommand('change-scene')).rejects.toThrow(
        'Este botón no tiene una escena seleccionada',
      );
    });

    it("executeOBSCommand('start-vertical-record') calls CallVendorRequest with start_recording via the shared socket", async () => {
      FakeOBSSocket.vendorResponse = { responseData: { success: true } };

      await executeOBSCommand('start-vertical-record');

      expect(FakeOBSSocket.instances).toHaveLength(1);
      const call = FakeOBSSocket.instances[0].callArgs.find(c => c.request === 'CallVendorRequest');
      expect(call?.data).toEqual({
        vendorName: 'aitum-vertical-canvas',
        requestType: 'start_recording',
        requestData: {},
      });
    });

    it("executeOBSCommand('stop-vertical-record') calls CallVendorRequest with stop_recording via the shared socket", async () => {
      FakeOBSSocket.vendorResponse = { responseData: { success: true } };

      await executeOBSCommand('stop-vertical-record');

      const call = FakeOBSSocket.instances[0].callArgs.find(c => c.request === 'CallVendorRequest');
      expect(call?.data).toEqual({
        vendorName: 'aitum-vertical-canvas',
        requestType: 'stop_recording',
        requestData: {},
      });
    });

    it("executeOBSCommand('start-vertical-record'/'stop-vertical-record') throws when the plugin responds with success:false", async () => {
      FakeOBSSocket.vendorResponse = { responseData: { success: false } };

      await expect(executeOBSCommand('start-vertical-record')).rejects.toThrow(
        'No se pudo controlar la grabación vertical (Aitum)',
      );
      await expect(executeOBSCommand('stop-vertical-record')).rejects.toThrow(
        'No se pudo controlar la grabación vertical (Aitum)',
      );
    });
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
