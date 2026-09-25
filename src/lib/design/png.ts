// PNG header parsing, shared by the server (upload checks) and the admin form (early warnings).

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from a PNG header, or null if the bytes are not a PNG. */
export function readPngSize(buf: Uint8Array): { width: number; height: number } | null {
  if (buf.length < 24 || PNG_SIGNATURE.some((b, i) => buf[i] !== b)) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
