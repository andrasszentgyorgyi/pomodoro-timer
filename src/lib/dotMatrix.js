// 5×7 bitmap font for the field recorder's dot-matrix MM:SS display.
const DOT = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
}

const ON = '#D7DCE0'
const OFF = 'rgba(130,148,160,0.12)'

// Lay out four digits "MMSS" plus a center colon into absolutely-positioned dots.
export function buildDots(d4) {
  const pitch = 9
  const cells = []
  let x = 0
  const order = [d4[0], d4[1], ':', d4[2], d4[3]]
  for (const ch of order) {
    if (ch === ':') {
      cells.push({ k: 'c' + x + 'a', l: x, t: 2 * pitch, on: true })
      cells.push({ k: 'c' + x + 'b', l: x, t: 5 * pitch, on: true })
      x += pitch + 13
    } else {
      const g = DOT[ch]
      for (let r = 0; r < 7; r++) {
        const row = g[r]
        for (let c = 0; c < 5; c++) {
          cells.push({ k: ch + x + '_' + r + '_' + c, l: x + c * pitch, t: r * pitch, on: row[c] === '1' })
        }
      }
      x += 5 * pitch + 14
    }
  }
  cells.forEach((c) => { c.bg = c.on ? ON : OFF })
  return { cells, w: x - 14, h: 7 * pitch - 3 }
}
