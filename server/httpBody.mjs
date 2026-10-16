export function readJsonBody(req, { limit = 12_000_000 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    let settled = false;
    const fail = (message, code) => {
      if (settled) return;
      settled = true;
      chunks.length = 0;
      reject(Object.assign(new Error(message), { code }));
    };
    req.on('error', error => fail(error.message, error.code || 'REQUEST_FAILED'));
    req.on('aborted', () => fail('请求已中断。', 'REQUEST_ABORTED'));
    if (Number(req.headers['content-length']) > limit) {
      fail('请求内容过大', 'REQUEST_TOO_LARGE');
      req.resume();
      return;
    }
    req.on('data', chunk => {
      if (settled) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > limit) return fail('请求内容过大', 'REQUEST_TOO_LARGE');
      chunks.push(buffer);
    });
    req.on('end', () => {
      if (settled) return;
      try {
        // Decode only after reassembling bytes: a TCP chunk may split a Chinese
        // character or emoji. The size limit is bytes, not UTF-16 code units.
        const text = Buffer.concat(chunks, bytes).toString('utf8');
        const value = text ? JSON.parse(text) : {};
        settled = true;
        resolve(value);
      } catch {
        fail('JSON 格式无效', 'INVALID_JSON');
      } finally {
        chunks.length = 0;
      }
    });
  });
}
