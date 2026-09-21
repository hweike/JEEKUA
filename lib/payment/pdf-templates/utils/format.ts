// lib/payment/pdf-templates/utils/format.ts

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return `${currency} ${amount.toFixed(2)}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    pending_payment: 'Pending Payment',
    paid: 'Paid',
    expired: 'Expired',
    cancelled: 'Cancelled',
  };
  return labels[status] || status;
}

export function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    draft: 'statusDraft',
    sent: 'statusSent',
    pending_payment: 'statusPending',
    paid: 'statusPaid',
    expired: 'statusExpired',
    cancelled: 'statusCancelled',
  };
  return styles[status] || 'statusDraft';
}