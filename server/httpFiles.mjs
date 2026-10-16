import { open } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { gzip } from 'node:zlib';

const compress = promisify(gzip);

// Only a single byte range is supported. null means no range; false means 416.
export function parseByteRange(value, size) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(String(value).trim());
  if (!Number.isSafeInteger(size) || size <= 0 || !match || (!match[1] && !match[2])) return false;
  let start;
  let end;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return false;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return false;
    end = Math.min(end, size - 1);
  }
  return { start, end };
}

function acceptsGzip(value = '') {
  const encodings = String(value).split(',').map(item => item.trim().split(';').map(part => part.trim()));
  const entry = encodings.find(([name]) => name.toLowerCase() === 'gzip') || encodings.find(([name]) => name === '*');
  if (!entry) return false;
  const quality = entry.slice(1).find(part => /^q=/i.test(part));
  const q = quality ? Number(quality.slice(2)) : 1;
  return Number.isFinite(q) && q > 0 && q <= 1;
}

export async function sendFile(req, res, contentType, buffer) {
  const compressible = /^(text\/|application\/(javascript|json|xml)|image\/svg\+xml)/i.test(contentType);
  const headers = { 'Content-Type': contentType, 'Cache-Control': 'no-cache' };
  if (compressible) {
    const vary = new Set(String(res.getHeader('Vary') || '').split(',').map(item => item.trim()).filter(Boolean));
    vary.add('Accept-Encoding');
    headers.Vary = [...vary].join(', ');
  }
  if (buffer.length >= 1024 && compressible && acceptsGzip(req.headers['accept-encoding'])) {
    buffer = await compress(buffer);
    headers['Content-Encoding'] = 'gzip';
  }
  headers['Content-Length'] = buffer.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : buffer);
}

export async function sendMediaFile(req, res, file, contentType) {
  // Open before sending headers and stat the same descriptor we stream. This
  // avoids an unhandled read-stream error if an asset is deleted concurrently.
  const handle = await open(file, 'r');
  try {
    const info = await handle.stat();
    if (!info.isFile()) throw Object.assign(new Error('媒体文件不存在。'), { code: 'ENOENT' });
    const size = info.size;
    const range = parseByteRange(req.headers.range, size);
    const headers = { 'Content-Type': contentType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=31536000, immutable' };
    if (range === false) {
      res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}`, 'Content-Length': 0 });
      return res.end();
    }
    headers['Content-Length'] = range ? range.end - range.start + 1 : size;
    if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
    res.writeHead(range ? 206 : 200, headers);
    if (req.method === 'HEAD' || size === 0) return res.end();
    // pipeline destroys the source on client disconnect and propagates errors
    // to the request handler rather than leaving an unhandled EventEmitter.
    await pipeline(handle.createReadStream({ autoClose: false, ...(range || {}) }), res);
  } finally {
    await handle.close();
  }
}
