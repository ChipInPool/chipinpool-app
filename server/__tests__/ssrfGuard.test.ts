import { describe, it, expect, beforeEach } from 'vitest';
import { assertSafeOutboundUrl } from '../ssrfGuard';

describe('assertSafeOutboundUrl', () => {
  beforeEach(() => { process.env.NODE_ENV = 'production'; });

  it('rejects non-HTTPS in production', async () => {
    expect((await assertSafeOutboundUrl('http://example.com')).ok).toBe(false);
  });

  it('rejects localhost', async () => {
    expect((await assertSafeOutboundUrl('https://localhost/hook')).ok).toBe(false);
  });

  it('rejects loopback IP', async () => {
    expect((await assertSafeOutboundUrl('https://127.0.0.1/hook')).ok).toBe(false);
  });

  it('rejects private ranges', async () => {
    expect((await assertSafeOutboundUrl('https://10.0.0.5/hook')).ok).toBe(false);
    expect((await assertSafeOutboundUrl('https://192.168.1.10/hook')).ok).toBe(false);
    expect((await assertSafeOutboundUrl('https://172.16.5.5/hook')).ok).toBe(false);
  });

  it('rejects the cloud metadata address', async () => {
    expect((await assertSafeOutboundUrl('https://169.254.169.254/latest/meta-data')).ok).toBe(false);
  });

  it('rejects internal-looking hostnames', async () => {
    expect((await assertSafeOutboundUrl('https://db.internal/hook')).ok).toBe(false);
    expect((await assertSafeOutboundUrl('https://service.local/hook')).ok).toBe(false);
  });

  it('rejects malformed URLs', async () => {
    expect((await assertSafeOutboundUrl('not-a-url')).ok).toBe(false);
  });

  it('allows a public HTTPS host', async () => {
    // A literal public IP avoids depending on DNS in CI.
    expect((await assertSafeOutboundUrl('https://8.8.8.8/hook')).ok).toBe(true);
  });
});
