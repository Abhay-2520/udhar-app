import { normalizePhone } from '../utils/phone.js';

export function cleanPhone(phone = '') {
  return String(phone).replace(/[^\d]/g, '');
}

export function reminderText(type, name, amount) {
  if (type === 'supplier') return `Hi ${name}, I will clear Rs ${amount} soon.`;
  return `Hi ${name}, you have Rs ${amount} pending. Please pay soon.`;
}

export function whatsappLink(phone, message) {
  const digits = cleanPhone(phone);
  const phoneForWhatsapp = digits.length === 10 ? `91${digits}` : digits || normalizePhone(phone);
  return `https://wa.me/${phoneForWhatsapp}?text=${encodeURIComponent(message)}`;
}

export async function sendSms(phone, message) {
  if (!process.env.SMS_WEBHOOK_URL) {
    return { sent: false, mode: 'disabled', message: 'SMS_WEBHOOK_URL is not configured' };
  }

  const response = await fetch(process.env.SMS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message })
  });

  return { sent: response.ok, status: response.status };
}
