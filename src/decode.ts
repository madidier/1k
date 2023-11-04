// A Cursor represents a position in a buffer along with a partially written
// byte. A Cursor is immutable to facilitate cheap backtracking; a rolled-back
// Cursor will simply overwrite content from aborted cursors.

import { isAscii, isContinuation, leadLength } from "./utf-8";

// Content is written in big endian order.
class Cursor {
  private constructor(
    private readonly buffer: Uint8Array,
    private readonly offset: number,
    // The current partial byte, not shifted yet:
    private readonly partialByte: number,
    // How many bits were already added to the partial byte
    private readonly partialBits: number) {
  }

  public static init(bufferSize: number) {
    return new Cursor(new Uint8Array(bufferSize), 0, 0, 0);
  }

  public decodePartialStrict() {
    // FIXME: Move to uft-8.ts
    // If the buffer stops at a partially encoded multi-byte character,
    // do not try to decode those partial utf-8 characters.
    //
    // Function will throw a TypeError if there is a decoding error.

    // Count the consecutive continuation bytes in the tail
    let nContinuations = 0;
    while (
      nContinuations > this.offset
      && isContinuation(this.buffer[this.offset - 1 - nContinuations])
    ) {
      nContinuations += 1;
      if (nContinuations > 3) {
        throw new TypeError(
          'decode error (too many consecutive continuation bytes in tail)'
        );
      }
    }

    if (nContinuations > 0) {
      if (nContinuations == this.offset) {
        throw new TypeError(
          'decode error (buffer starts with a continuation byte)'
        );
      }

      const leadLen = leadLength(this.buffer[this.offset - 1 - nContinuations]);
      if (leadLen < nContinuations + 1) {
        throw new TypeError(
          'decode error (continuation byte in an invalid position)'
        );
      }
    }

    // It is also possible to have a buffer that ends with a leading byte.
    const trimLength = (
      nContinuations > 0 ? nContinuations + 1 :
        this.offset > 0 && !isAscii(this.buffer[this.offset - 1]) ? 1 : 0
    );

    return new TextDecoder('utf-8', { fatal: true })
      .decode(new DataView(this.buffer.buffer, 0, this.offset - trimLength));
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

  public write(content: number, bits: number): Cursor {
    if (bits < 0 || bits > 32) {
      throw new Error('bits must be an integer between 0 and 32');
    }
    if ((content & ((1 << bits) - 1)) !== content) {
      throw new Error('content has more bits than expected');
    }

    // Using recursion because I'm lazy and it's easier here :)
    if (this.partialBits + bits < 8) {
      return new Cursor(
        this.buffer,
        this.offset,
        (this.partialByte << bits) | content,
        this.partialBits + bits,
      );
    } else {
      const bitsTaken = 8 - this.partialBits;
      const bitsOverflow = bits - bitsTaken;
      // Commit a byte:
      this.buffer.set(
        [(this.partialByte << bitsTaken) | (content >> bitsOverflow)],
        this.offset,
      );
      return new Cursor(
        this.buffer,
        this.offset + 1,
        0,
        0
      ).write(content & ((1 << bitsOverflow) - 1), bitsOverflow);
    }
  }

}

export function decode(input: string): { decoded: string, chunks: string[] } {
  const chunks = Array
    .from(input.matchAll(/[0-9a-f]*[0-9][0-9a-f]*/gi))
    .map(([chunk]) => chunk)
    .filter(chunk => chunk.length > 3);

  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }

  let cursor = Cursor.init(totalLength / 2);
  const retainedChunks: string[] = [];
  for (const chunk of chunks) {
    const nextCur = cursor.writeHex(chunk);
    let decoded;
    try {
      decoded = nextCur.decodePartialStrict();
    } catch (e) {
      if (e instanceof TypeError) {
        continue; // Skip this chunk.
      } else {
        throw e;
      }
    }
    // Skip the chunk if it contains non-printable codepoints (those are in
    // the ascii range, so no risk of finding leftovers from a previous chunk)
    if (/[\x00-\x1F]/.test(decoded)) {
      continue;
    }
    retainedChunks.push(chunk);
    cursor = nextCur;
  }

  return {
    decoded: cursor.decodePartialStrict(),
    chunks: retainedChunks,
  };
}
