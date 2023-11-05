import { isAscii, isContinuation, isIllegal, isLead2, isLead3 } from "./utf-8";

class DecodeError extends Error {
  constructor(message?: string) {
    super(message || 'Invalid UTF-8');
    Object.setPrototypeOf(this, DecodeError.prototype);
  }
}

class NonPrintableDecodeError extends DecodeError {
  constructor() {
    super('Non-printable character detected');
    Object.setPrototypeOf(this, NonPrintableDecodeError.prototype);
  }
}

// A Cursor represents a position in a buffer along with a partially written
// utf-8 possibly multi-byte character. A Cursor is immutable but not the
// buffer it contains, but because data is written sequentially, simple
// backtracking is possible.
// A Cursor will not try to fix encoding errors, but will throw on invalid
// utf-8 input, allowing higher level code to backtrack as needed.
class Cursor {
  private constructor(
    private readonly buffer: Uint8Array,
    private readonly offset: number,
    // The current partial utf-8 character in a 32-bits unsigned integer.
    // It is shifted to the left, so a single space character is 0x20000000.
    private readonly data: number,
    // How many bits were already added to the partial utf-8 character.
    private readonly bitCount: number) {
  }

  public static init(bufferSize: number) {
    return new Cursor(new Uint8Array(bufferSize), 0, 0, 0);
  }

  public decodePartial() {
    // It should not be possible for invalid utf-8 to be present in the buffer.
    return new TextDecoder('utf-8')
      .decode(new DataView(this.buffer.buffer, 0, this.offset));
  }

  public get isCommitted() {
    return this.bitCount === 0;
  }

  public writeHex(digits: string): Cursor {
    let cur: Cursor = this;
    for (const digit of digits) {
      const n = parseInt(digit, 16);
      if (isNaN(n)) {
        throw new Error('invalid digit');
      }
      cur = cur.write(n, 4);
    }
    return cur;
  }

  public write(content: number, bitsToWrite: number): Cursor {
    if (bitsToWrite < 0 || bitsToWrite > 32) {
      throw new Error('bits must be an integer between 0 and 32');
    }
    if ((content & ((1 << bitsToWrite) - 1)) !== content) {
      throw new Error('content has more bits than expected');
    }

    const bitCount = this.bitCount + bitsToWrite;

    if (bitCount > 32) {
      const overflowBits = bitCount - 32;
      return this
        .write(content >> overflowBits, bitsToWrite - overflowBits)
        .writeTail(content, overflowBits);
    }

    const data = this.data | (content << (32 - bitCount));

    if (bitCount < 8) {
      return new Cursor(this.buffer, this.offset, data, bitCount);
    }

    const firstByte = data >> 24;

    if (isAscii(firstByte)) {
      if (firstByte < 0x20) {
        throw new NonPrintableDecodeError();
      }
      this.buffer.set([firstByte], this.offset);
      return new Cursor(this.buffer, this.offset + 1, 0, 0)
        .writeTail(content, bitCount - 8);
    }

    if (isContinuation(firstByte) || isIllegal(firstByte)) {
      throw new DecodeError();
    }

    if (bitCount < 16) {
      return new Cursor(this.buffer, this.offset, data, bitCount);
    }

    const secondByte = (data >> 16) & 255;

    if (!isContinuation(secondByte)) {
      throw new DecodeError();
    }

    if (isLead2(firstByte)) {
      this.buffer.set([firstByte, secondByte], this.offset);
      return new Cursor(this.buffer, this.offset + 2, 0, 0)
        .writeTail(content, bitCount - 16);
    }

    if (bitCount < 24) {
      return new Cursor(this.buffer, this.offset, data, bitCount);
    }

    const thirdByte = (data >> 24) & 255;

    if (!isContinuation(thirdByte)) {
      throw new DecodeError();
    }

    if (isLead3(firstByte)) {
      this.buffer.set([firstByte, secondByte, thirdByte], this.offset);
      return new Cursor(this.buffer, this.offset + 3, 0, 0)
        .writeTail(content, bitCount - 24);
    }

    if (bitCount < 32) {
      return new Cursor(this.buffer, this.offset, data, bitCount);
    }

    const lastByte = data & 255;

    if (!isContinuation(lastByte)) {
      throw new DecodeError();
    }

    this.buffer.set([firstByte, secondByte, thirdByte, lastByte], this.offset);
    return new Cursor(this.buffer, this.offset + 4, 0, 0);
  }


  private writeTail(content: number, bits: number): Cursor {
    return this.write(content & ((1 << bits) - 1), bits);
  }
}

function chunksOf(input: string): string[] {
  // This could perhaps be made obsolete by tweaking tesseract options.
  const fixedInput = input
    .replace('{', 'f')
    .replace('¢', 'c')
    .replace('€', 'e');

  return Array
    .from(fixedInput.matchAll(/[0-9a-f]*[0-9][0-9a-f]*/gi))
    .map(([chunk]) => chunk)
    .filter(chunk => chunk.length > 3);
}

export function decodeLenient(input: string): { decoded: string, chunks: string[] } {
  const chunks = chunksOf(input).filter(chunk => !chunk.includes('00'));
  const realInput = chunks.join('');

  let commit = {
    cursor: Cursor.init(realInput.length / 2),
    index: 0,
  };
  while (commit.index < realInput.length) {
    let index = commit.index;
    let cursor = commit.cursor;
    try {
      while (index < realInput.length) {
        cursor = cursor.writeHex(realInput[index++]);
        if (cursor.isCommitted) {
          commit = { cursor, index };
        }
      }
      break;
    } catch (err) {
      if (err instanceof DecodeError) {
        commit.index += 1; // rollback and skip a hex digit
      } else {
        throw err;
      }
    }
  }
  return { decoded: commit.cursor.decodePartial(), chunks };
}

export function decodeStrict(input: string): { decoded: string, chunks: string[] } {
  const chunks = chunksOf(input);

  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }

  let cursor = Cursor.init(totalLength / 2);
  const retainedChunks: string[] = [];
  for (const chunk of chunks) {
    let nextCur;
    try {
      nextCur = cursor.writeHex(chunk);
    } catch (e) {
      if (e instanceof DecodeError) {
        continue; // Skip this chunk.
      } else {
        throw e;
      }
    }
    // Skip the chunk if it contains non-printable codepoints (those are in
    // the ascii range, so no risk of finding leftovers from a previous chunk)
    if (/[\x00-\x1F]/.test(nextCur.decodePartial())) {
      continue;
    }
    retainedChunks.push(chunk);
    cursor = nextCur;
  }

  return {
    decoded: cursor.decodePartial(),
    chunks: retainedChunks,
  };
}
