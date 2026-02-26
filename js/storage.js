/**
 * Storage module for drafts and folders.
 * Uses localStorage for persistence.
 *
 * Data structure:
 * {
 *   folders: [ { id, name, createdAt } ],
 *   drafts: [ { id, name, folderId, iban, recipient, amount, reference, bic, purpose, structuredRef, text, version, createdAt, updatedAt } ]
 * }
 */
const Storage = (() => {
  const STORAGE_KEY = 'epc_qr_data';

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return {
          folders: Array.isArray(data.folders) ? data.folders : [],
          drafts: Array.isArray(data.drafts) ? data.drafts : []
        };
      }
    } catch (e) { /* ignore */ }
    return { folders: [], drafts: [] };
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  // Folders
  function getFolders() {
    return load().folders;
  }

  function addFolder(name) {
    const data = load();
    const folder = { id: uid(), name: name.trim(), createdAt: Date.now() };
    data.folders.push(folder);
    save(data);
    return folder;
  }

  function renameFolder(id, name) {
    const data = load();
    const folder = data.folders.find(f => f.id === id);
    if (folder) {
      folder.name = name.trim();
      save(data);
    }
    return folder;
  }

  function deleteFolder(id) {
    const data = load();
    data.folders = data.folders.filter(f => f.id !== id);
    // Move drafts in this folder to root
    data.drafts.forEach(d => {
      if (d.folderId === id) d.folderId = null;
    });
    save(data);
  }

  // Drafts
  function getDrafts(folderId) {
    const data = load();
    if (folderId === undefined) return data.drafts;
    return data.drafts.filter(d => (d.folderId || null) === (folderId || null));
  }

  function addDraft(draft) {
    const data = load();
    const now = Date.now();
    const entry = {
      id: uid(),
      name: draft.name || '',
      folderId: draft.folderId || null,
      iban: draft.iban || '',
      recipient: draft.recipient || '',
      amount: draft.amount || '',
      reference: draft.reference || '',
      bic: draft.bic || '',
      purpose: draft.purpose || '',
      structuredRef: draft.structuredRef || '',
      text: draft.text || '',
      version: draft.version || '002',
      createdAt: now,
      updatedAt: now
    };
    data.drafts.push(entry);
    save(data);
    return entry;
  }

  function updateDraft(id, updates) {
    const data = load();
    const draft = data.drafts.find(d => d.id === id);
    if (draft) {
      Object.assign(draft, updates, { updatedAt: Date.now() });
      save(data);
    }
    return draft;
  }

  function deleteDraft(id) {
    const data = load();
    data.drafts = data.drafts.filter(d => d.id !== id);
    save(data);
  }

  function moveDraft(id, folderId) {
    const data = load();
    const draft = data.drafts.find(d => d.id === id);
    if (draft) {
      draft.folderId = folderId || null;
      draft.updatedAt = Date.now();
      save(data);
    }
    return draft;
  }

  function searchDrafts(query) {
    const q = query.toLowerCase().trim();
    if (!q) return load().drafts;
    return load().drafts.filter(d =>
      (d.name && d.name.toLowerCase().includes(q)) ||
      (d.recipient && d.recipient.toLowerCase().includes(q)) ||
      (d.iban && d.iban.toLowerCase().includes(q))
    );
  }

  function getDraftCountInFolder(folderId) {
    return getDrafts(folderId).length;
  }

  return {
    getFolders, addFolder, renameFolder, deleteFolder,
    getDrafts, addDraft, updateDraft, deleteDraft, moveDraft,
    searchDrafts, getDraftCountInFolder
  };
})();
