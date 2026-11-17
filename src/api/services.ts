import { request } from './http';
import type { CoverageAnswer, CoverageQuery, CustomerNotice, NewOrder, Order } from './types';

// Orders retries Coverage up to 3 times with a 3 s timeout each, so creation can be slow.
const CREATE_ORDER_TIMEOUT_MS = 20_000;

export function createOrder(input: NewOrder): Promise<Order> {
  return request<Order>('orders', '/orders', { method: 'POST', body: input, timeoutMs: CREATE_ORDER_TIMEOUT_MS });
}

export function confirmOrder(orderId: string): Promise<Order> {
  return request<Order>('orders', `/orders/${encodeURIComponent(orderId)}/confirm`, { method: 'POST' });
}

export function getOrder(orderId: string): Promise<Order> {
  return request<Order>('orders', `/orders/${encodeURIComponent(orderId)}`);
}

export function validateCoverage(query: CoverageQuery): Promise<CoverageAnswer> {
  return request<CoverageAnswer>('coverage', '/coverage/validate', { method: 'POST', body: query, timeoutMs: 10_000 });
}

export function listNotices(orderId: string): Promise<CustomerNotice[]> {
  return request<CustomerNotice[]>('notifications', `/notifications/order/${encodeURIComponent(orderId)}`);
}
