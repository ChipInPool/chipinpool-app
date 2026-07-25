import dns from 'dns/promises';
import net from 'net';

// Guards outbound requests to user/merchant-controlled URLs (e.g. webhook URLs)
// against SSRF: only public HTTP(S) endpoints are allowed, and hostnames that
// resolve to private, loopback, link-local, or cloud-metadata addresses are
// rejected.

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts;
  if (a === 10) return true;                       // 10.0.0.0/8
  if (a === 127) return true;                      // loopback
  if (a === 0) return true;                        // "this" network
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true;          // 192.168.0.0/16
  if (a === 169 && b === 254) return true;          // link-local + metadata (169.254.169.254)
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a >= 224) return true;                        // multicast/reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
  if (lower.startsWith('fe80')) return true;          // link-local
  if (lower.startsWith('::ffff:')) {                  // IPv4-mapped
    return isPrivateIPv4(lower.replace('::ffff:', ''));
  }
  return false;
}

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  if (net.isIPv6(ip)) return isPrivateIPv6(ip);
  return true; // unknown format -> treat as unsafe
}

// Returns { ok: true } if the URL is a safe public HTTP(S) endpoint, otherwise
// { ok: false, reason }. Resolves DNS and checks every resolved address.
export async function assertSafeOutboundUrl(rawUrl: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL' };
  }

  const allowHttp = process.env.NODE_ENV !== 'production';
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
    return { ok: false, reason: 'Only HTTPS URLs are allowed' };
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    return { ok: false, reason: 'Internal hostnames are not allowed' };
  }

  // If the host is a literal IP, check it directly.
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) return { ok: false, reason: 'Private IP addresses are not allowed' };
    return { ok: true };
  }

  // Otherwise resolve and verify every address is public.
  try {
    const results = await dns.lookup(hostname, { all: true });
    if (results.length === 0) return { ok: false, reason: 'Host did not resolve' };
    for (const r of results) {
      if (isPrivateAddress(r.address)) {
        return { ok: false, reason: 'Host resolves to a private address' };
      }
    }
  } catch {
    return { ok: false, reason: 'Host did not resolve' };
  }

  return { ok: true };
}
