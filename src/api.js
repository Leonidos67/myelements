async function req(path, opts = {}) {
  const res = await fetch('/api' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.error || `http ${res.status}`);
    error.status = res.status; error.retryAt = err.retryAt; error.serverTime = err.serverTime;
    throw error;
  }
  return res.json();
}

export const api = {
  openStatProject: videoId => req('/stat-projects', {method:'POST',body:JSON.stringify({videoId})}),
  statProjectForVideo: videoId => req('/stat-projects/by-video/'+encodeURIComponent(videoId)),
  projectAssistant: (id,data) => req('/stat-projects/'+encodeURIComponent(id)+'/assistant',{method:'POST',body:JSON.stringify(data)}),
  statProject: id => req('/stat-projects/'+encodeURIComponent(id)),
  statProjectScript: id => req('/stat-projects/'+encodeURIComponent(id)+'/script'),
  saveStatProject: (id,data) => req('/stat-projects/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify(data)}),
  deleteStatProject: id => req('/stat-projects/'+encodeURIComponent(id),{method:'DELETE'}),
  videoScript: (id, source = 'saved') => req('/video-scripts/' + encodeURIComponent(id) + '?source=' + encodeURIComponent(source)),
  saveVideoScript: (id, data) => req('/video-scripts/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(data) }),
  resetCommentTimer: (id) => req('/comment-pages/' + encodeURIComponent(id) + '/reset-timer', { method: 'POST' }),
  addCustomComment: (id, data) => req('/comment-pages/' + encodeURIComponent(id) + '/comments', { method: 'POST', body: JSON.stringify(data) }),
  deletePendingComment: (id, comment) => req('/comment-pages/' + encodeURIComponent(id) + '/comments', { method: 'DELETE', body: JSON.stringify({ comment }) }),
  confirmComments: (id, indexes) => req('/comment-pages/' + encodeURIComponent(id) + '/reviews', { method: 'POST', body: JSON.stringify({ indexes }) }),
  reviewComment: (id, index, action) => req('/comment-pages/' + encodeURIComponent(id) + '/reviews/' + index, { method: 'POST', body: JSON.stringify({ action }) }),
  replaceComment: (id, comment) => req('/comment-pages/' + encodeURIComponent(id) + '/replace', { method: 'POST', body: JSON.stringify({ comment }) }),
  deleteCommentTask: (video) => req('/comment-pages?video=' + encodeURIComponent(video), { method: 'DELETE' }),
  commentSummary: () => req('/comment-pages/summary'),
  commentThemes: () => req('/comment-pages/themes'),
  commentPages: (video, includeLinked = false) => req('/comment-pages?video=' + encodeURIComponent(video) + (includeLinked ? '&includeLinked=1' : '')),
  createCommentBranch: (id, data) => req('/comment-pages/' + encodeURIComponent(id) + '/branch', { method: 'POST', body: JSON.stringify(data) }),
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

  toolServices: () => req('/tools'),
  toolService: id => req('/tools/' + encodeURIComponent(id)),
  createToolService: data => req('/tools', { method: 'POST', body: JSON.stringify(data) }),
  updateToolService: (id, data) => req('/tools/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(data) }),
  deleteToolService: id => req('/tools/' + encodeURIComponent(id), { method: 'DELETE' }),
  saveToolMaterial: (id, materialId, data) => req('/tools/' + encodeURIComponent(id) + '/materials' + (materialId ? '/' + encodeURIComponent(materialId) : ''),
    { method: materialId ? 'PATCH' : 'POST', body: JSON.stringify(data) }),
  deleteToolMaterial: (id, materialId) => req('/tools/' + encodeURIComponent(id) + '/materials/' + encodeURIComponent(materialId), { method: 'DELETE' }),

  savings: () => req('/savings'),
  addSaving: (d) => req('/savings', { method: 'POST', body: JSON.stringify(d) }),
  deleteSaving: (id) => req(`/savings/${id}`, { method: 'DELETE' }),

  adjustments: () => req('/adjustments'),
  addAdjustment: (d) => req('/adjustments', { method: 'POST', body: JSON.stringify(d) }),
  deleteAdjustment: (id) => req(`/adjustments/${id}`, { method: 'DELETE' }),

  videos: () => req('/videos'),
  addVideo: (d) => req('/videos', { method: 'POST', body: JSON.stringify(d) }),
  duplicateVideo: id => req('/videos/'+encodeURIComponent(id)+'/duplicate',{method:'POST'}),
  updateVideo: (id, d) => req(`/videos/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  deleteVideo: (id) => req(`/videos/${id}`, { method: 'DELETE' }),

  stats: () => req('/stats/overview'),
  
  getGoal: () => req('/goals'),
  setGoal: (d) => req('/goals', { method: 'POST', body: JSON.stringify(d) }),
  
  chat: (messages) => req('/ai', { method: 'POST', body: JSON.stringify({ messages }) }),
};