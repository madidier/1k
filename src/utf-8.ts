export function isContinuation(byte: number) {
  return (byte & 0b11000000) === 0b10000000;
}

export function leadLength(byte: number) {
  return (
    isLead2(byte) ? 2 :
      isLead3(byte) ? 3 :
        isLead4(byte) ? 4 : 1
  );
}

export function isLead4(byte: number) {
  return (byte & 0b11111000) === 0b11110000;
}

export function isLead3(byte: number) {
  return (byte & 0b11110000) === 0b11100000;
}

export function isLead2(byte: number) {
  return (byte & 0b11100000) === 0b11000000;
}

export function isAscii(byte: number) {
  return (byte & 0b10000000) === 0;
}
