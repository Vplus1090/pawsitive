const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('pawsitive_token');
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  getCachedUser() {
    try {
      const raw = localStorage.getItem('pawsitive_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('pawsitive_token', data.token);
    if (data.user) localStorage.setItem('pawsitive_user', JSON.stringify(data.user));
    return data;
  },

  async register(name, email, password, location, avatarUrl = '') {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, location, avatar_url: avatarUrl || undefined })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    localStorage.setItem('pawsitive_token', data.token);
    if (data.user) localStorage.setItem('pawsitive_user', JSON.stringify(data.user));
    return data;
  },

  async getMe() {
    if (!localStorage.getItem('pawsitive_token')) return null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return { unauthorized: true };
    }
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.user) localStorage.setItem('pawsitive_user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('pawsitive_token');
    localStorage.removeItem('pawsitive_user');
  },

  async getListings(helpType = 'all', status = 'all', search = '') {
    const params = new URLSearchParams();
    if (helpType && helpType !== 'all') params.append('help_type', helpType);
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);

    const res = await fetch(`${API_BASE}/listings?${params.toString()}`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  async getListingDetails(id) {
    const res = await fetch(`${API_BASE}/listings/${id}`, {
      headers: getHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch listing');
    return data;
  },

  async createListing(listingData) {
    const res = await fetch(`${API_BASE}/listings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(listingData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create listing');
    return data;
  },

  async resolveListing(id, resolvedPhotoUrl, proofHint = '') {
    const res = await fetch(`${API_BASE}/listings/${id}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ resolved_photo_url: resolvedPhotoUrl, proof_hint: proofHint })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to resolve listing');
    return data;
  },

  async addComment(listingId, text) {
    const res = await fetch(`${API_BASE}/listings/${listingId}/comments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add comment');
    return data;
  },

  async getPokedex() {
    const res = await fetch(`${API_BASE}/captures/pokedex`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  async captureAnimal(data) {
    const res = await fetch(`${API_BASE}/captures`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Capture failed');
    return result;
  },

  async getSpecies() {
    const res = await fetch(`${API_BASE}/species`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  async getLeaderboard() {
    const res = await fetch(`${API_BASE}/leaderboard`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  async getActivityStream() {
    const res = await fetch(`${API_BASE}/leaderboard/activity`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  async getBadges() {
    const res = await fetch(`${API_BASE}/badges`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  async classifySpecies(imageHint, filename, url) {
    const res = await fetch(`${API_BASE}/ai/classify-species`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_hint: imageHint, filename, url })
    });
    return await res.json();
  },

  async verifyDeed(payload) {
    const res = await fetch(`${API_BASE}/ai/verify-deed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  }
};
