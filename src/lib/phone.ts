export function normalizeKenyanPhone(value: string) {
    const digits = value.replace(/\D/g, '');

    if (!digits) return '';
    if (digits.startsWith('254')) return `+${digits}`;
    if (digits.startsWith('0')) return `+254${digits.slice(1)}`;
    if ((digits.startsWith('7') || digits.startsWith('1')) && digits.length === 9) return `+254${digits}`;

    return value.trim();
}

export function isValidKenyanPhone(value: string) {
    if (!value.trim()) return true;
    return /^\+254[17]\d{8}$/.test(normalizeKenyanPhone(value));
}
