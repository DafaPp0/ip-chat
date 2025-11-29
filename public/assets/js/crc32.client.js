// CRC32 Client-side Implementation
// Based on standard CRC32 algorithm

class CRC32 {
  constructor() {
    this.table = this.makeTable();
  }

  makeTable() {
    let table = [];
    let c;
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
    return table;
  }

  calculate(str) {
    let crc = 0 ^ -1;
    for (let i = 0; i < str.length; i++) {
      crc = (crc >>> 8) ^ this.table[(crc ^ str.charCodeAt(i)) & 0xff];
    }
    return ((crc ^ -1) >>> 0).toString(16).toUpperCase();
  }

  verify(str, checksum) {
    return this.calculate(str) === checksum.toUpperCase();
  }
}

// Export instance
const crc32 = new CRC32();
