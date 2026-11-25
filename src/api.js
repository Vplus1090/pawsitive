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
  // Auth
  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('pawsitive_token', data.token);
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
    return data;
  },

  async getMe() {
    if (!localStorage.getItem('pawsitive_token')) return null;
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  },

  async getDemoUsers() {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    return await res.json();
  },

  async switchDemoUser(userId) {
    const res = await fetch(`${API_BASE}/auth/demo-login/${userId}`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Switch failed');
    localStorage.setItem('pawsitive_token', data.token);
    return data;
  },

  logout() {
    localStorage.removeItem('pawsitive_token');
  },

  // Listings
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

  // Captures & Pokedex
  async getPokedex() {
    const res = await fetch(`${API_BASE}/captures/pokedex`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  async getMyCards() {
    const res = await fetch(`${API_BASE}/captures/my-cards`, {
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

  // Species
  async getSpecies() {
    const res = await fetch(`${API_BASE}/species`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  // Leaderboard & Deeds
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

  // Badges
  async getBadges() {
    const res = await fetch(`${API_BASE}/badges`, {
      headers: getHeaders()
    });
    return await res.json();
  },

  // AI Species Classification & Deed Verification
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
