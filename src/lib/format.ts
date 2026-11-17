import type { Fare, NoticeStatus, NoticeType, OrderStatus, ShippingType, Zone } from '../api/types';

export const SHIPPING_TYPES: ShippingType[] = ['STANDARD', 'EXPRESS'];

export const SHIPPING_LABEL: Record<ShippingType, string> = {
  STANDARD: 'Estándar',
  EXPRESS: 'Exprés',
};

export const ZONES: Zone[] = ['SAME_CITY', 'SAME_DEPARTMENT', 'NEIGHBORING_DEPARTMENT', 'REST_OF_COUNTRY'];

export const ZONE_LABEL: Record<Zone, string> = {
  SAME_CITY: 'Misma ciudad',
  SAME_DEPARTMENT: 'Mismo departamento',
  NEIGHBORING_DEPARTMENT: 'Departamento vecino',
  REST_OF_COUNTRY: 'Resto del país',
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_VALIDATION: 'Validando cobertura',
  REJECTED: 'Rechazado',
  VALIDATED: 'Validado',
  CONFIRMED: 'Confirmado',
  GUIDE_GENERATING: 'Generando guía',
  GUIDE_READY: 'Guía lista',
};

export const NOTICE_LABEL: Record<NoticeType, string> = {
  ORDER_CONFIRMED: 'Pedido confirmado',
  GUIDE_READY: 'Guía lista',
};

export const NOTICE_STATUS_LABEL: Record<NoticeStatus, string> = {
  PENDING: 'Pendiente',
  SENT: 'Enviado',
  FAILED: 'Falló',
};

const pesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const clock = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

export function formatFare(fare: Fare): string {
  return fare.currency === 'COP' ? pesos.format(fare.amount) : `${fare.amount} ${fare.currency}`;
}

export function formatKg(kg: number): string {
  return `${kg.toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : clock.format(date);
}

/** First block of a UUID, the way a clerk would read it out loud. */
export function shortId(id: string): string {
  return id.split('-')[0].toUpperCase();
}

/** Accepts "2,5" and "2.5"; anything not strictly positive is null. */
export function parseKg(raw: string): number | null {
  const value = Number(raw.trim().replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(value) && value > 0 ? value : null;
}
