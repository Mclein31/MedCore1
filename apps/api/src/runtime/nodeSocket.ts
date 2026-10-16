import tls from 'node:tls';
import type { OpenSocket } from '../services/mailer';

/** Implicit-TLS SMTP socket for Node. Certificates are always verified. */
export const openNodeSocket: OpenSocket = (host, port) =>
  new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, minVersion: 'TLSv1.2' });
    socket.setEncoding('utf8');
    const queue: (string | null)[] = [];
    const waiters: ((chunk: string | null) => void)[] = [];
    const push = (chunk: string | null) => {
      const waiter = waiters.shift();
      if (waiter) waiter(chunk);
      else queue.push(chunk);
    };
    socket.on('data', (chunk: string) => push(chunk));
    socket.on('end', () => push(null));
    socket.on('close', () => push(null));
    socket.once('error', (err) => {
      reject(err);
      push(null);
    });
    socket.once('secureConnect', () =>
      resolve({
        write: (data) => new Promise((done, fail) => socket.write(data, (err) => (err ? fail(err) : done()))),
        read: () =>
          queue.length ? Promise.resolve(queue.shift() ?? null) : new Promise((done) => waiters.push(done)),
        close: async () => {
          socket.end();
          socket.destroy();
        },
      }),
    );
  });
