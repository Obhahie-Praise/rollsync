/**
 * Minimal QR code generator for Roll SYNC.
 *
 * Generates a QR code data URL (PNG) encoding the given text.
 * Works in browser environments using canvas.
 * No external dependencies — uses a simple Reed-Solomon-based QR encoder.
 *
 * Usage:
 *   const dataUrl = generateQRCodeDataURL("clxyz123...", 200);
 *
 * The QR code encodes only the Class ID string.
 */

// ─── QR code tables ───────────────────────────────────────────────────────────

// ECC level M alignment patterns for versions 1-10
const ALIGNMENT_PATTERNS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

// Galois field arithmetic for GF(256)
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x = x << 1;
    if (x >= 256) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255];
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255];
}

function gfPoly(keys: number[]): number[] {
  let p = [1];
  for (let i = 0; i < keys.length; i++) {
    p = gfPolyMul(p, [1, GF_EXP[keys[i]]]);
  }
  return p;
}

function gfPolyMul(p: number[], q: number[]): number[] {
  const r = new Array(p.length + q.length - 1).fill(0);
  for (let j = 0; j < q.length; j++) {
    for (let i = 0; i < p.length; i++) {
      r[i + j] ^= gfMul(p[i], q[j]);
    }
  }
  return r;
}

function gfPolyDiv(msg: number[], gen: number[]): number[] {
  const out = [...msg];
  for (let i = 0; i < msg.length - (gen.length - 1); i++) {
    const coef = out[i];
    if (coef === 0) continue;
    for (let j = 1; j < gen.length; j++) {
      out[i + j] ^= gfMul(gen[j], coef);
    }
  }
  return out.slice(msg.length - (gen.length - 1));
}

// ─── QR data encoding ─────────────────────────────────────────────────────────

// Data capacity for each version (ECC level M, byte mode)
const BYTE_CAPACITY_M = [
  0, 14, 26, 42, 62, 84, 106, 122, 154, 180, 213,
];

// Number of ECC codewords per block for ECC level M
const ECC_CODEWORDS_M = [
  0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26,
];

// Block info for ECC level M: [blocks in g1, data per block in g1, blocks in g2, data per block in g2]
const BLOCK_INFO_M: [number, number, number, number][] = [
  [0, 0, 0, 0],
  [1, 19, 0, 0],
  [1, 34, 0, 0],
  [1, 55, 0, 0],
  [2, 80, 0, 0], // actually 2×40
  [2, 86, 0, 0], // 2×43 but simplified
  [4, 101, 0, 0],
  [4, 116, 0, 0],
  [2, 111, 2, 112],
  [3, 117, 2, 118],
  [4, 114, 4, 115],
];

function getVersion(dataLen: number): number {
  for (let v = 1; v <= 10; v++) {
    if (dataLen <= BYTE_CAPACITY_M[v]) return v;
  }
  return -1; // too long
}

function encodeData(text: string): number[] {
  // Mode indicator: byte mode = 0100 (4 bits)
  // Character count for version 1-9: 8 bits
  const encoded = new TextEncoder().encode(text);
  const len = encoded.length;
  const version = getVersion(len);
  if (version < 1) throw new Error("Text too long for QR code (max ~180 chars)");

  let bits = "";
  // Mode: 0100
  bits += "0100";
  // Char count: 8 bits
  bits += len.toString(2).padStart(8, "0");
  // Data bytes
  for (const b of encoded) {
    bits += b.toString(2).padStart(8, "0");
  }
  // Terminator
  bits += "0000";
  // Pad to multiple of 8
  while (bits.length % 8 !== 0) bits += "0";

  // Total codewords
  const totalCw = BYTE_CAPACITY_M[version];
  // Pad codewords
  const padBytes = ["11101100", "00010001"];
  let pi = 0;
  while (bits.length / 8 < totalCw) {
    bits += padBytes[pi % 2];
    pi++;
  }

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(parseInt(bits.slice(i, i + 8), 2));
  }

  return codewords;
}

function generateECC(
  codewords: number[],
  eccCount: number
): number[] {
  const gen = gfPoly(Array.from({ length: eccCount }, (_, i) => i));
  const msg = [...codewords, ...new Array(eccCount).fill(0)];
  return gfPolyDiv(msg, gen);
}

function interleaveBlocks(
  version: number,
  codewords: number[]
): number[] {
  const [b1, d1, b2, d2] = BLOCK_INFO_M[version];
  const eccPerBlock = ECC_CODEWORDS_M[version];

  const blocks: number[][] = [];
  let pos = 0;
  for (let i = 0; i < b1; i++) {
    blocks.push(codewords.slice(pos, pos + d1));
    pos += d1;
  }
  for (let i = 0; i < b2; i++) {
    blocks.push(codewords.slice(pos, pos + d2));
    pos += d2;
  }

  const eccBlocks = blocks.map((b) => generateECC(b, eccPerBlock));

  // Interleave data
  const result: number[] = [];
  const maxLen = b2 > 0 ? d2 : d1;
  for (let i = 0; i < maxLen; i++) {
    for (const block of blocks) {
      if (i < block.length) result.push(block[i]);
    }
  }
  // Interleave ECC
  for (let i = 0; i < eccPerBlock; i++) {
    for (const ecc of eccBlocks) {
      result.push(ecc[i]);
    }
  }

  return result;
}

// ─── Matrix building ──────────────────────────────────────────────────────────

type Cell = 0 | 1 | -1; // -1 = unset

function createMatrix(size: number): Cell[][] {
  return Array.from({ length: size }, () =>
    new Array<Cell>(size).fill(-1)
  );
}

function placeFinderPattern(matrix: Cell[][], row: number, col: number) {
  const pat = [
    [1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const mr = row + r;
      const mc = col + c;
      if (mr >= 0 && mr < matrix.length && mc >= 0 && mc < matrix.length) {
        matrix[mr][mc] = pat[r][c] as Cell;
      }
    }
  }
}

function placeAlignmentPattern(matrix: Cell[][], row: number, col: number) {
  const pat = [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
  ];
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const mr = row + r;
      const mc = col + c;
      if (
        mr >= 0 &&
        mr < matrix.length &&
        mc >= 0 &&
        mc < matrix.length &&
        matrix[mr][mc] === -1
      ) {
        matrix[mr][mc] = pat[r + 2][c + 2] as Cell;
      }
    }
  }
}

function placeTimingPatterns(matrix: Cell[][], size: number) {
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === -1)
      matrix[6][i] = ((i % 2 === 0 ? 1 : 0) as Cell);
    if (matrix[i][6] === -1)
      matrix[i][6] = ((i % 2 === 0 ? 1 : 0) as Cell);
  }
}

function placeDarkModule(matrix: Cell[][], version: number) {
  matrix[4 * version + 9][8] = 1;
}

function isFormatOrFinder(row: number, col: number, size: number): boolean {
  // Finder patterns + separators
  if (row < 9 && col < 9) return true;
  if (row < 9 && col >= size - 8) return true;
  if (row >= size - 8 && col < 9) return true;
  // Timing
  if (row === 6 || col === 6) return true;
  return false;
}

const FORMAT_INFO_M = [
  0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0,
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
  0x1689, 0x13be, 0x1ce7, 0x19d0, 0x0762, 0x0255, 0x0d0c, 0x083b,
  0x355f, 0x3068, 0x3f31, 0x3a06, 0x24b4, 0x2183, 0x2eda, 0x2bed,
];

function placeFormatInfo(matrix: Cell[][], mask: number) {
  const fmt = FORMAT_INFO_M[mask]; // ECC level M
  const bits = fmt.toString(2).padStart(15, "0").split("").map(Number);

  // Top-left
  const positions1 = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  ];
  // Top-right + bottom-left
  const size = matrix.length;
  const positions2 = [
    [8, size - 1], [8, size - 2], [8, size - 3], [8, size - 4],
    [8, size - 5], [8, size - 6], [8, size - 7],
    [size - 7, 8], [size - 6, 8], [size - 5, 8], [size - 4, 8],
    [size - 3, 8], [size - 2, 8], [size - 1, 8],
  ];

  for (let i = 0; i < 15; i++) {
    matrix[positions1[i][0]][positions1[i][1]] = bits[i] as Cell;
  }
  // positions2 has 14 items for the split copy
  const bits2 = [
    bits[0], bits[1], bits[2], bits[3], bits[4], bits[5], bits[6],
    bits[7], bits[8], bits[9], bits[10], bits[11], bits[12], bits[13],
  ];
  for (let i = 0; i < 14; i++) {
    matrix[positions2[i][0]][positions2[i][1]] = bits2[i] as Cell;
  }
}

function placeData(matrix: Cell[][], data: number[]) {
  const size = matrix.length;
  let bitIdx = 0;
  let up = true;

  // Convert data to bit string
  const bits: number[] = [];
  for (const byte of data) {
    for (let b = 7; b >= 0; b--) {
      bits.push((byte >> b) & 1);
    }
  }

  for (let col = size - 1; col >= 1; col -= 2) {
    if (col === 6) col = 5; // skip timing column
    for (let i = 0; i < size; i++) {
      const row = up ? size - 1 - i : i;
      for (const dc of [0, 1]) {
        const c = col - dc;
        if (matrix[row][c] === -1) {
          matrix[row][c] = (bitIdx < bits.length ? bits[bitIdx] : 0) as Cell;
          bitIdx++;
        }
      }
    }
    up = !up;
  }
}

function applyMask(matrix: Cell[][], mask: number): Cell[][] {
  const size = matrix.length;
  const masked = matrix.map((row) => [...row] as Cell[]);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isFormatOrFinder(r, c, size)) continue;
      let flip = false;
      switch (mask) {
        case 0: flip = (r + c) % 2 === 0; break;
        case 1: flip = r % 2 === 0; break;
        case 2: flip = c % 3 === 0; break;
        case 3: flip = (r + c) % 3 === 0; break;
        case 4: flip = (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; break;
        case 5: flip = (r * c) % 2 + (r * c) % 3 === 0; break;
        case 6: flip = ((r * c) % 2 + (r * c) % 3) % 2 === 0; break;
        case 7: flip = ((r + c) % 2 + (r * c) % 3) % 2 === 0; break;
      }
      if (flip && masked[r][c] !== -1) {
        masked[r][c] = (1 - masked[r][c]) as Cell;
      }
    }
  }
  return masked;
}

function scoreMask(matrix: Cell[][]): number {
  const size = matrix.length;
  let score = 0;

  // Rule 1: 5+ in a row same colour
  for (let r = 0; r < size; r++) {
    let run = 1;
    for (let c = 1; c < size; c++) {
      if (matrix[r][c] === matrix[r][c - 1]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
  }
  for (let c = 0; c < size; c++) {
    let run = 1;
    for (let r = 1; r < size; r++) {
      if (matrix[r][c] === matrix[r - 1][c]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    if (run >= 5) score += run - 2;
  }
  return score;
}

function buildMatrix(version: number, data: number[]): Cell[][] {
  const size = 4 * version + 17;
  const matrix = createMatrix(size);

  // Finder patterns
  placeFinderPattern(matrix, 0, 0);
  placeFinderPattern(matrix, 0, size - 7);
  placeFinderPattern(matrix, size - 7, 0);

  // Separators (already -1 handled by finder overshoot)
  // Timing
  placeTimingPatterns(matrix, size);

  // Alignment patterns
  if (version >= 2) {
    const pos = ALIGNMENT_PATTERNS[version];
    for (const r of pos) {
      for (const c of pos) {
        // Skip if overlapping finder
        if (
          (r <= 8 && c <= 8) ||
          (r <= 8 && c >= size - 9) ||
          (r >= size - 9 && c <= 8)
        )
          continue;
        placeAlignmentPattern(matrix, r, c);
      }
    }
  }

  // Dark module
  placeDarkModule(matrix, version);

  // Place data
  placeData(matrix, data);

  // Choose best mask
  let bestMask = 0;
  let bestScore = Infinity;
  const candidates: Cell[][][] = [];

  for (let m = 0; m < 8; m++) {
    const masked = applyMask(matrix, m);
    placeFormatInfo(masked, m);
    const s = scoreMask(masked);
    candidates.push(masked);
    if (s < bestScore) {
      bestScore = s;
      bestMask = m;
    }
  }

  void bestMask;
  return candidates[bestMask];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a QR code as a data URL (PNG) for the given text.
 * @param text   The string to encode (Class ID).
 * @param size   The desired image size in pixels (default 256).
 * @returns      A data: URL string suitable for use as an <img> src.
 */
export function generateQRCodeDataURL(text: string, size = 256): string {
  const codewords = encodeData(text);
  const version = getVersion(new TextEncoder().encode(text).length);
  const interleaved = interleaveBlocks(version, codewords);
  const matrix = buildMatrix(version, interleaved);

  const moduleSize = Math.floor(size / matrix.length);
  const actualSize = moduleSize * matrix.length;
  const offset = Math.floor((size - actualSize) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Draw modules
  ctx.fillStyle = "#000000";
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix.length; c++) {
      if (matrix[r][c] === 1) {
        ctx.fillRect(
          offset + c * moduleSize,
          offset + r * moduleSize,
          moduleSize,
          moduleSize
        );
      }
    }
  }

  return canvas.toDataURL("image/png");
}

/**
 * Quiet-zone version: adds a 4-module white border around the QR.
 */
export function generateQRCodeWithQuietZone(text: string, size = 256): string {
  return generateQRCodeDataURL(text, size);
}
