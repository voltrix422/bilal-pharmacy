function pad(num: number, size: number): string {
  return String(num).padStart(size, "0");
}

function randomDigits(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

function dateStamp(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1, 2);
  const d = pad(date.getDate(), 2);
  return `${y}${m}${d}`;
}

function timeStamp(date: Date = new Date()): string {
  const h = pad(date.getHours(), 2);
  const min = pad(date.getMinutes(), 2);
  const s = pad(date.getSeconds(), 2);
  return `${h}${min}${s}`;
}

export function generateSKU(category?: string, name?: string): string {
  const cat = (category || "GEN")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");
  const namePart = (name || "MED")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  return `SKU-${cat}-${namePart}-${randomDigits(4)}`;
}

export function generateBarcode(prefix = "890"): string {
  const body = `${prefix}${randomDigits(9)}`.slice(0, 12);
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${body}${checkDigit}`;
}

export function generateSaleNumber(date: Date = new Date()): string {
  return `SAL-${dateStamp(date)}-${timeStamp(date)}-${randomDigits(3)}`;
}

export function generatePONumber(date: Date = new Date()): string {
  return `PO-${dateStamp(date)}-${randomDigits(4)}`;
}

export function generatePrescriptionNumber(date: Date = new Date()): string {
  return `RX-${dateStamp(date)}-${randomDigits(5)}`;
}

export function generateReturnNumber(date: Date = new Date()): string {
  return `RET-${dateStamp(date)}-${randomDigits(4)}`;
}
