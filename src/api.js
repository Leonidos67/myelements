async function req(path, opts = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `http ${res.status}`);
  }
  return res.json();
}

export const api = {
  replaceComment: (id, comment) => req('/comment-pages/' + encodeURIComponent(id) + '/replace', { method: 'POST', body: JSON.stringify({ comment }) }),
  deleteCommentTask: (video) => req('/comment-pages?video=' + encodeURIComponent(video), { method: 'DELETE' }),
  commentSummary: () => req('/comment-pages/summary'),
  commentThemes: () => req('/comment-pages/themes'),
  commentPages: (video) => req('/comment-pages?video=' + encodeURIComponent(video)),
  createCommentPage: (data) => req('/comment-pages', { method: 'POST', body: JSON.stringify(data) }),
  commentPage: (id) => req('/comment-pages/' + encodeURIComponent(id)),
  claimComment: (id, visitor) => req('/comment-pages/' + encodeURIComponent(id) + '/claim', { method: 'POST', body: JSON.stringify({ visitor }) }),
  me: () => req('/auth/me'),
  login: (username, password) => req('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),

  accounts: () => req('/accounts'),
  addAccount: (d) => req('/accounts', { method: 'POST', body: JSON.stringify(d) }),
  deleteAccount: (id) => req(`/accounts/${id}`, { method: 'DELETE' }),

  ideas: () => req('/ideas'),
  addIdea: (d) => req('/ideas', { method: 'POST', body: JSON.stringify(d) }),
  deleteIdea: (id) => req(`/ideas/${id}`, { method: 'DELETE' }),

  savings: () => req('/savings'),
  addSaving: (d) => req('/savings', { method: 'POST', body: JSON.stringify(d) }),
  deleteSaving: (id) => req(`/savings/${id}`, { method: 'DELETE' }),

  adjustments: () => req('/adjustments'),
  addAdjustment: (d) => req('/adjustments', { method: 'POST', body: JSON.stringify(d) }),
  deleteAdjustment: (id) => req(`/adjustments/${id}`, { method: 'DELETE' }),

  videos: () => req('/videos'),
  addVideo: (d) => req('/videos', { method: 'POST', body: JSON.stringify(d) }),
  updateVideo: (id, d) => req(`/videos/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  deleteVideo: (id) => req(`/videos/${id}`, { method: 'DELETE' }),

  stats: () => req('/stats/overview'),
  
  getGoal: () => req('/goals'),
  setGoal: (d) => req('/goals', { method: 'POST', body: JSON.stringify(d) }),
  
  chat: (messages) => req('/ai', { method: 'POST', body: JSON.stringify({ messages }) }),
};