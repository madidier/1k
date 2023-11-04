export function isContinuation(byte: number) {
  return (byte & 0b1100_0000) === 0b1000_0000;
}

export function isLead4(byte: number) {
  return (byte & 0b1111_1000) === 0b1111_0000;
}

export function isLead3(byte: number) {
  return (byte & 0b1111_0000) === 0b1110_0000;
}

export function isLead2(byte: number) {
  return (byte & 0b1110_0000) === 0b1100_0000;
}

export function isAscii(byte: number) {
  return (byte & 0b1000_0000) === 0;
}

export function isIllegal(byte: number) {
  return (byte & 0b1111_1000) === 0b1111_1000;
}