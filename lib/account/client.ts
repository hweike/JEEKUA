// lib/account/client.ts
function getToken(): string | null {
  const match = document.cookie.match(/token=([^;]+)/);
  return match ? match[1] : null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error('No token');
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getCustomerProfile() {
  try {
    return await fetchWithAuth('/api/account/me');
  } catch {
    return null;
  }
}

export async function updateCustomerProfile(data: any) {
  try {
    await fetchWithAuth('/api/account/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return true;
  } catch {
    return false;
  }
}

export async function getAddresses() {
  try {
    return await fetchWithAuth('/api/account/addresses');
  } catch {
    return [];
  }
}

export async function createAddress(data: any) {
  try {
    return await fetchWithAuth('/api/account/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch {
    return null;
  }
}

export async function updateAddress(id: number, data: any) {
  try {
    return await fetchWithAuth(`/api/account/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch {
    return null;
  }
}

export async function deleteAddress(id: number) {
  try {
    await fetchWithAuth(`/api/account/addresses/${id}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}

export async function setDefaultAddress(id: number) {
  const addresses = await getAddresses();
  const addr = addresses.find((a: any) => a.id === id);
  if (!addr) return false;
  return updateAddress(id, { ...addr, is_default: true });
}

export async function updateMarketingPreference(subscribed: boolean) {
  try {
    // const profile = await getCustomerProfile();
    // if (!profile) return false;
    // await fetchWithAuth('/api/account/me', {
    await fetchWithAuth('/api/account/preferences', {
      method: 'PUT',
      body: JSON.stringify({ email_subscribed: subscribed ? '已订阅' : '未订阅' }),
    });
    return true;
  } catch {
    return false;
  }
}