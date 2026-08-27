import { saveCommandServerConfig } from './commandServerStorage';
import { listCommands, createCommand, executeCommand, __resetSharedSocketForTests } from './commandServerClient';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  sent: string[] = [];

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.onclose?.();
  }

  // Test helper: simulate the server responding.
  emit(message: object) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

// @ts-expect-error test double
global.WebSocket = FakeWebSocket;

// getAuthenticatedSocket() awaits loadCommandServerConfig() (backed by the
// AsyncStorage jest mock, itself `async`) before constructing the WebSocket,
// so the socket isn't created synchronously within the calling test's stack
// frame. setImmediate flushes the pending microtask chain so the socket
// exists before we reach into FakeWebSocket.instances.
const flushMicrotasks = () => new Promise<void>(resolve => setImmediate(resolve));

describe('commandServerClient', () => {
  beforeEach(async () => {
    FakeWebSocket.instances = [];
    __resetSharedSocketForTests();
    await saveCommandServerConfig({ host: '192.168.1.16', port: '7070', password: 'secret' });
  });

  it('authenticates then sends list_commands and resolves on the commands response', async () => {
    const promise = listCommands();
    await flushMicrotasks();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    socket.emit({ type: 'auth_ok' });
    // Resolving auth also needs a tick to unwind back through
    // getAuthenticatedSocket()'s await before listCommands() registers its
    // 'commands' waiter and sends the request — flush before responding.
    await flushMicrotasks();
    socket.emit({ type: 'commands', commands: [{ id: '1', label: 'Play/Pause', kind: 'media_key', target: 'play_pause' }] });

    await expect(promise).resolves.toEqual([
      { id: '1', label: 'Play/Pause', kind: 'media_key', target: 'play_pause' },
    ]);
    expect(socket.sent[0]).toContain('"password":"secret"');
  });

  it('rejects when auth fails', async () => {
    const promise = createCommand('X', 'launch_app', 'x');
    await flushMicrotasks();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    socket.emit({ type: 'auth_error', message: 'incorrect password' });

    await expect(promise).rejects.toThrow('incorrect password');
  });

  it('rejects execute when the server reports execute_error', async () => {
    const promise = executeCommand('abc');
    await flushMicrotasks();
    const socket = FakeWebSocket.instances[0];
    socket.onopen?.();
    socket.emit({ type: 'auth_ok' });
    // Same as above: give executeCommand() a tick to resume past
    // getAuthenticatedSocket() and register the pending execute before the
    // server's error response arrives.
    await flushMicrotasks();
    socket.emit({ type: 'execute_error', command_id: 'abc', message: 'comando no encontrado' });

    await expect(promise).rejects.toThrow('comando no encontrado');
  });
});
