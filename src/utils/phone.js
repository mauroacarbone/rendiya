const COUNTRY_CODE = '54';

function digitsOf(value) {
  return String(value || '').replace(/\D/g, '');
}

function localDigits(value) {
  let digits = digitsOf(value);
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith(COUNTRY_CODE) && digits.length > 10) {
    digits = digits.slice(COUNTRY_CODE.length);
  }
  return digits.replace(/^0+/, '');
}

function formatLocal(value) {
  const digits = localDigits(value);
  if (!digits) return '';
  if (digits.startsWith('11')) {
    const rest = digits.slice(2);
    if (!rest) return '11';
    if (rest.length <= 4) return `11 ${rest}`;
    return `11 ${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const digits = digitsOf(raw);
  if (!digits) return '';

  if (raw.startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.startsWith('00')) {
    return `+${digits.slice(2)}`;
  }
  if (digits.startsWith(COUNTRY_CODE) && digits.length >= 11) {
    return `+${digits}`;
  }
  return `+${COUNTRY_CODE}${digits.replace(/^0+/, '')}`;
}

function isValidPhone(value) {
  const local = localDigits(value);
  return local.length >= 10 && local.length <= 12;
}

function displayPhone(value) {
  const local = formatLocal(value);
  return local ? `+${COUNTRY_CODE} ${local}` : '';
}

module.exports = {
  COUNTRY_CODE,
  digitsOf,
  localDigits,
  formatLocal,
  normalizePhone,
  isValidPhone,
  displayPhone
};
