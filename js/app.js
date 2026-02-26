/**
 * Main application logic for EPC QR Generator PWA.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Apply translations
  I18n.applyTranslations();

  // === State ===
  let advancedSettings = {
    bic: '',
    purpose: '',
    structuredRef: '',
    text: '',
    version: '002'
  };
  let currentFolder = null; // null = root
  let editingDraftId = null;
  let movingDraftId = null;

  // === DOM References ===
  const $ = id => document.getElementById(id);
  const ibanInput = $('iban');
  const recipientInput = $('recipient');
  const amountInput = $('amount');
  const referenceInput = $('reference');
  const ibanIcon = $('iban-icon');
  const ibanError = $('iban-error');
  const btnGenerate = $('btn-generate');
  const btnAdvanced = $('btn-advanced');
  const btnSaveDraft = $('btn-save-draft');

  // Modals & Dialogs
  const modalQr = $('modal-qr');
  const modalAdvanced = $('modal-advanced');
  const modalEditDraft = $('modal-edit-draft');
  const modalMoveDraft = $('modal-move-draft');
  const dialogSaveDraft = $('dialog-save-draft');
  const dialogNewFolder = $('dialog-new-folder');
  const dialogInfo = $('dialog-info');
  const dialogConfirm = $('dialog-confirm');
  const dialogRenameFolder = $('dialog-rename-folder');

  // === Navigation ===
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      $('view-' + tab).classList.add('active');
      if (tab === 'drafts') renderDrafts();
    });
  });

  // === IBAN Input ===
  ibanInput.addEventListener('input', () => {
    const val = ibanInput.value.replace(/\s+/g, '');
    if (val.length === 0) {
      ibanIcon.className = 'input-icon';
      ibanError.classList.remove('visible');
      ibanInput.classList.remove('error');
    } else if (val.length >= 2) {
      if (IBAN.isValid(val)) {
        ibanIcon.className = 'input-icon valid';
        ibanError.classList.remove('visible');
        ibanInput.classList.remove('error');
      } else if (val.length >= 15) {
        ibanIcon.className = 'input-icon invalid';
        ibanError.classList.add('visible');
        ibanInput.classList.add('error');
      } else {
        ibanIcon.className = 'input-icon';
        ibanError.classList.remove('visible');
        ibanInput.classList.remove('error');
      }
    }
    updateGenerateButton();
  });

  // Format IBAN on blur
  ibanInput.addEventListener('blur', () => {
    const val = ibanInput.value.replace(/\s+/g, '');
    if (val.length > 0) {
      ibanInput.value = IBAN.format(val);
    }
  });

  recipientInput.addEventListener('input', updateGenerateButton);
  amountInput.addEventListener('input', updateGenerateButton);

  // Amount formatting - only allow valid decimal numbers
  amountInput.addEventListener('blur', () => {
    const val = amountInput.value.trim();
    if (val) {
      const num = parseFloat(val.replace(',', '.'));
      if (!isNaN(num) && num > 0) {
        amountInput.value = num.toFixed(2);
      }
    }
  });

  function updateGenerateButton() {
    const hasIban = IBAN.isValid(ibanInput.value);
    const hasRecipient = recipientInput.value.trim().length > 0;
    btnGenerate.disabled = !(hasIban && hasRecipient);
    btnSaveDraft.disabled = !(hasIban || hasRecipient);
  }

  // === Generate QR Code ===
  btnGenerate.addEventListener('click', generateQR);

  function generateQR() {
    const params = getFormParams();
    const errors = EPC.validate(params);
    if (errors.length > 0) {
      showInfoDialog('Validation Error', errors.join('\n'));
      return;
    }

    const payload = EPC.generate(params);
    showQrModal(payload, params);
  }

  function getFormParams() {
    return {
      iban: ibanInput.value,
      recipient: recipientInput.value,
      amount: amountInput.value.replace(',', '.'),
      reference: referenceInput.value,
      ...advancedSettings
    };
  }

  // === QR Modal ===
  function showQrModal(payload, params) {
    const body = $('qr-modal-body');
    body.innerHTML = '';

    // QR display
    const qrDiv = document.createElement('div');
    qrDiv.className = 'qr-display';
    const canvas = document.createElement('canvas');
    qrDiv.appendChild(canvas);
    body.appendChild(qrDiv);

    // Info rows
    const info = document.createElement('div');
    info.className = 'qr-info';
    if (params.recipient) addInfoRow(info, I18n.t('qr_label_recipient'), params.recipient);
    if (params.iban) addInfoRow(info, I18n.t('qr_label_iban'), IBAN.format(params.iban));
    if (params.amount && parseFloat(params.amount) > 0) {
      addInfoRow(info, I18n.t('qr_label_amount'), parseFloat(params.amount).toFixed(2) + ' EUR');
    }
    const ref = params.structuredRef || params.reference;
    if (ref) addInfoRow(info, I18n.t('qr_label_reference'), ref);
    body.appendChild(info);

    // Action buttons container
    const actions = document.createElement('div');
    actions.className = 'qr-actions';
    body.appendChild(actions);

    // Generate QR code.
    // Do NOT pass a custom color option — the library defaults to pure
    // #000000 on #ffffff which is the only value guaranteed to work on
    // every browser/WebView including iOS WKWebView in standalone PWA mode.
    QRCode.toCanvas(canvas, payload, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M'
    }, function (error) {
      if (error) {
        console.error('QR generation error:', error);
        return;
      }

      // Share button (Web Share API — available on iOS Safari / Android Chrome)
      if (navigator.share) {
        const shareBtn = createActionBtn(
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>' +
          I18n.t('qr_button_share'),
          'btn btn-outlined'
        );
        shareBtn.addEventListener('click', async () => {
          try {
            const blob = await canvasToBlob(canvas);
            const file = new File([blob], 'epc-qr.png', { type: 'image/png' });
            await navigator.share({ files: [file], title: 'EPC QR Code' });
          } catch (e) { /* user cancelled or share not supported */ }
        });
        actions.appendChild(shareBtn);
      }

      // Download button
      const dlBtn = createActionBtn(
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>' +
        I18n.t('qr_button_download'),
        'btn btn-primary'
      );
      dlBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'epc-qr-' + (params.recipient || 'code').replace(/\s+/g, '_') + '.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
      actions.appendChild(dlBtn);
    });

    openModal(modalQr);
  }

  function addInfoRow(container, label, value) {
    const row = document.createElement('div');
    row.className = 'qr-info-row';
    row.innerHTML = '<span class="qr-info-label">' + escapeHtml(label) + '</span><span class="qr-info-value">' + escapeHtml(value) + '</span>';
    container.appendChild(row);
  }

  function createActionBtn(innerHTML, className) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.innerHTML = innerHTML;
    return btn;
  }

  function canvasToBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  // === Advanced Settings Modal ===
  btnAdvanced.addEventListener('click', () => {
    showAdvancedModal();
  });

  function showAdvancedModal() {
    const body = $('advanced-modal-body');
    body.innerHTML = '';

    const form = document.createElement('div');
    form.className = 'advanced-form';

    // BIC
    form.appendChild(makeField(
      I18n.t('advanced_field_bic'),
      'adv-bic', 'text', advancedSettings.bic,
      I18n.t('advanced_field_bic_placeholder')
    ));

    // Purpose with info button
    const purposeGroup = makeField(
      I18n.t('advanced_field_purpose'),
      'adv-purpose', 'text', advancedSettings.purpose,
      I18n.t('advanced_field_purpose_placeholder')
    );
    const purposeLabel = purposeGroup.querySelector('label');
    const infoBtn = document.createElement('button');
    infoBtn.className = 'info-btn';
    infoBtn.textContent = '?';
    infoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showInfoDialog(I18n.t('advanced_info_purpose_title'), I18n.t('advanced_info_purpose_msg'));
    });
    purposeLabel.appendChild(infoBtn);
    form.appendChild(purposeGroup);

    // Structured Reference with info button
    const structGroup = makeField(
      I18n.t('advanced_field_struct_ref'),
      'adv-struct-ref', 'text', advancedSettings.structuredRef,
      I18n.t('advanced_field_struct_ref_placeholder')
    );
    const structLabel = structGroup.querySelector('label');
    const infoBtn2 = document.createElement('button');
    infoBtn2.className = 'info-btn';
    infoBtn2.textContent = '?';
    infoBtn2.addEventListener('click', (e) => {
      e.preventDefault();
      showInfoDialog(I18n.t('advanced_info_struct_ref_title'), I18n.t('advanced_info_struct_ref_msg'));
    });
    structLabel.appendChild(infoBtn2);
    form.appendChild(structGroup);

    // Remittance Text
    form.appendChild(makeField(
      I18n.t('advanced_field_text'),
      'adv-text', 'text', advancedSettings.text,
      I18n.t('advanced_field_text_placeholder')
    ));

    // Version select
    const verGroup = document.createElement('div');
    verGroup.className = 'form-group';
    verGroup.innerHTML =
      '<label>' + escapeHtml(I18n.t('advanced_field_version')) + '</label>' +
      '<select id="adv-version">' +
      '<option value="001"' + (advancedSettings.version === '001' ? ' selected' : '') + '>Version 1 (001)</option>' +
      '<option value="002"' + (advancedSettings.version === '002' ? ' selected' : '') + '>Version 2 (002)</option>' +
      '</select>';
    form.appendChild(verGroup);

    body.appendChild(form);
    openModal(modalAdvanced);
  }

  function makeField(label, id, type, value, placeholder) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.innerHTML =
      '<label>' + escapeHtml(label) + '</label>' +
      '<input type="' + type + '" id="' + id + '" value="' + escapeHtml(value || '') + '" placeholder="' + escapeHtml(placeholder || '') + '">';
    return group;
  }

  // Save advanced settings
  document.querySelector('.modal-save-advanced').addEventListener('click', () => {
    const bicEl = $('adv-bic');
    const purposeEl = $('adv-purpose');
    const structRefEl = $('adv-struct-ref');
    const textEl = $('adv-text');
    const versionEl = $('adv-version');

    if (bicEl) advancedSettings.bic = bicEl.value.trim();
    if (purposeEl) advancedSettings.purpose = purposeEl.value.trim();
    if (structRefEl) advancedSettings.structuredRef = structRefEl.value.trim();
    if (textEl) advancedSettings.text = textEl.value.trim();
    if (versionEl) advancedSettings.version = versionEl.value;

    closeModal(modalAdvanced);
  });

  // === Save Draft ===
  btnSaveDraft.addEventListener('click', () => {
    const nameInput = $('save-draft-name');
    nameInput.value = recipientInput.value.trim() || '';
    openDialog(dialogSaveDraft);
    nameInput.focus();
  });

  dialogSaveDraft.querySelector('.dialog-confirm').addEventListener('click', () => {
    const name = $('save-draft-name').value.trim();
    if (!name) return;
    const params = getFormParams();
    Storage.addDraft({ name, ...params });
    closeDialog(dialogSaveDraft);
  });

  dialogSaveDraft.querySelector('.dialog-cancel').addEventListener('click', () => {
    closeDialog(dialogSaveDraft);
  });

  // === New Folder ===
  $('btn-new-folder').addEventListener('click', () => {
    $('new-folder-name').value = '';
    openDialog(dialogNewFolder);
    $('new-folder-name').focus();
  });

  dialogNewFolder.querySelector('.dialog-confirm').addEventListener('click', () => {
    const name = $('new-folder-name').value.trim();
    if (!name) return;
    Storage.addFolder(name);
    closeDialog(dialogNewFolder);
    renderDrafts();
  });

  dialogNewFolder.querySelector('.dialog-cancel').addEventListener('click', () => {
    closeDialog(dialogNewFolder);
  });

  // === Rename Folder ===
  dialogRenameFolder.querySelector('.dialog-confirm').addEventListener('click', () => {
    const name = $('rename-folder-name').value.trim();
    if (!name || !currentFolder) return;
    Storage.renameFolder(currentFolder, name);
    closeDialog(dialogRenameFolder);
    renderDrafts();
  });

  dialogRenameFolder.querySelector('.dialog-cancel').addEventListener('click', () => {
    closeDialog(dialogRenameFolder);
  });

  // === Info Dialog ===
  dialogInfo.querySelector('.dialog-confirm').addEventListener('click', () => {
    closeDialog(dialogInfo);
  });

  function showInfoDialog(title, message) {
    $('dialog-info-title').textContent = title;
    $('dialog-info-message').textContent = message;
    openDialog(dialogInfo);
  }

  // === Confirm Dialog ===
  let confirmCallback = null;

  function showConfirmDialog(title, message, btnText, callback) {
    $('dialog-confirm-title').textContent = title;
    $('dialog-confirm-message').textContent = message;
    const confirmBtn = dialogConfirm.querySelector('.dialog-confirm-btn');
    confirmBtn.textContent = btnText;
    confirmCallback = callback;
    openDialog(dialogConfirm);
  }

  dialogConfirm.querySelector('.dialog-confirm-btn').addEventListener('click', () => {
    closeDialog(dialogConfirm);
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });

  dialogConfirm.querySelector('.dialog-cancel').addEventListener('click', () => {
    closeDialog(dialogConfirm);
    confirmCallback = null;
  });

  // === Modal helpers ===
  function openModal(modal) {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openDialog(dialog) {
    dialog.classList.add('open');
  }

  function closeDialog(dialog) {
    dialog.classList.remove('open');
  }

  // Close modal on backdrop click
  [modalQr, modalAdvanced, modalEditDraft, modalMoveDraft].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Close dialog on overlay click
  [dialogSaveDraft, dialogNewFolder, dialogInfo, dialogConfirm, dialogRenameFolder].forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) closeDialog(dialog);
    });
  });

  // Close buttons in modals
  modalQr.querySelector('.modal-close').addEventListener('click', () => closeModal(modalQr));
  modalAdvanced.querySelector('.modal-cancel').addEventListener('click', () => closeModal(modalAdvanced));
  modalEditDraft.querySelector('.modal-cancel').addEventListener('click', () => closeModal(modalEditDraft));

  // === Drafts Rendering ===
  function renderDrafts() {
    const list = $('drafts-list');
    const empty = $('drafts-empty');
    const title = $('drafts-title');
    list.innerHTML = '';

    const folders = Storage.getFolders();
    const drafts = Storage.getDrafts(currentFolder);

    if (currentFolder) {
      const folder = folders.find(f => f.id === currentFolder);
      title.textContent = folder ? folder.name : I18n.t('drafts_title');
    } else {
      title.textContent = I18n.t('drafts_title');
    }

    let hasItems = false;

    if (currentFolder) {
      const backItem = createDraftItem({
        icon: 'folder',
        name: '\u2190 ' + I18n.t('drafts_title'),
        detail: '',
        isBack: true
      });
      backItem.classList.add('folder-back');
      backItem.addEventListener('click', () => {
        currentFolder = null;
        renderDrafts();
      });
      list.appendChild(backItem);
      hasItems = true;
    }

    if (!currentFolder) {
      folders.forEach(folder => {
        const count = Storage.getDraftCountInFolder(folder.id);
        const item = createDraftItem({
          icon: 'folder',
          name: folder.name,
          detail: count + ' item' + (count !== 1 ? 's' : '')
        });
        item.addEventListener('click', () => {
          currentFolder = folder.id;
          renderDrafts();
        });
        addContextMenu(item, [
          { label: I18n.t('drafts_action_rename'), icon: 'edit', action: () => renameFolder(folder) },
          { label: I18n.t('drafts_action_delete_folder'), icon: 'delete', danger: true, action: () => confirmDeleteFolder(folder) }
        ]);
        list.appendChild(item);
        hasItems = true;
      });
    }

    drafts.forEach(draft => {
      const item = createDraftItem({
        icon: 'payment',
        name: draft.name || draft.recipient || 'Unnamed',
        detail: IBAN.format(draft.iban || '')
      });
      item.addEventListener('click', () => loadDraftToForm(draft));
      addContextMenu(item, [
        { label: I18n.t('drafts_action_edit'), icon: 'edit', action: () => showEditDraftModal(draft) },
        { label: I18n.t('drafts_action_move'), icon: 'move', action: () => showMoveDraftModal(draft) },
        { label: I18n.t('drafts_action_delete'), icon: 'delete', danger: true, action: () => confirmDeleteDraft(draft) }
      ]);
      list.appendChild(item);
      hasItems = true;
    });

    if (!hasItems) {
      empty.style.display = 'flex';
      list.style.display = 'none';
    } else {
      empty.style.display = 'none';
      list.style.display = 'block';
    }
  }

  function createDraftItem({ icon, name, detail, isBack }) {
    const item = document.createElement('div');
    item.className = 'draft-item';

    const iconDiv = document.createElement('div');
    iconDiv.className = 'draft-icon ' + icon;
    if (icon === 'folder') {
      iconDiv.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';
    } else {
      iconDiv.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>';
    }
    item.appendChild(iconDiv);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'draft-info';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'draft-name';
    nameDiv.textContent = name;
    infoDiv.appendChild(nameDiv);
    if (detail) {
      const detailDiv = document.createElement('div');
      detailDiv.className = 'draft-detail';
      detailDiv.textContent = detail;
      infoDiv.appendChild(detailDiv);
    }
    item.appendChild(infoDiv);

    if (!isBack) {
      const moreBtn = document.createElement('div');
      moreBtn.className = 'draft-more';
      moreBtn.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>';
      item.appendChild(moreBtn);
    }

    return item;
  }

  // === Context Menu ===
  const contextMenu = $('context-menu');
  const contextOverlay = $('context-overlay');

  function addContextMenu(element, menuItems) {
    let longPressTimer;

    element.addEventListener('touchstart', (e) => {
      longPressTimer = setTimeout(() => {
        e.preventDefault();
        const touch = e.touches[0];
        showContextMenu(touch.clientX, touch.clientY, menuItems);
      }, 500);
    }, { passive: false });

    element.addEventListener('touchend', () => clearTimeout(longPressTimer));
    element.addEventListener('touchmove', () => clearTimeout(longPressTimer));

    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, menuItems);
    });

    const moreBtn = element.querySelector('.draft-more');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = moreBtn.getBoundingClientRect();
        showContextMenu(rect.left, rect.bottom, menuItems);
      });
    }
  }

  function showContextMenu(x, y, items) {
    contextMenu.innerHTML = '';
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'context-menu-item' + (item.danger ? ' danger' : '');
      btn.innerHTML = getContextIcon(item.icon) + '<span>' + escapeHtml(item.label) + '</span>';
      btn.addEventListener('click', () => {
        hideContextMenu();
        item.action();
      });
      contextMenu.appendChild(btn);
    });

    contextMenu.style.display = 'block';
    contextOverlay.style.display = 'block';

    const menuRect = contextMenu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = x;
    let top = y;

    if (left + menuRect.width > vw) left = vw - menuRect.width - 8;
    if (top + menuRect.height > vh) top = vh - menuRect.height - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;

    contextMenu.style.left = left + 'px';
    contextMenu.style.top = top + 'px';
  }

  function hideContextMenu() {
    contextMenu.style.display = 'none';
    contextOverlay.style.display = 'none';
  }

  contextOverlay.addEventListener('click', hideContextMenu);

  function getContextIcon(name) {
    const icons = {
      edit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
      move: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 12H4V8h16v10h-6zm-2-6l-4 4h3v2h2v-2h3l-4-4z"/></svg>',
      delete: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
    };
    return icons[name] || '';
  }

  // === Draft Actions ===
  function loadDraftToForm(draft) {
    ibanInput.value = IBAN.format(draft.iban || '');
    recipientInput.value = draft.recipient || '';
    amountInput.value = draft.amount || '';
    referenceInput.value = draft.reference || '';
    advancedSettings = {
      bic: draft.bic || '',
      purpose: draft.purpose || '',
      structuredRef: draft.structuredRef || '',
      text: draft.text || '',
      version: draft.version || '002'
    };

    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-tab="create"]').classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    $('view-create').classList.add('active');

    ibanInput.dispatchEvent(new Event('input'));
    updateGenerateButton();
  }

  function showEditDraftModal(draft) {
    editingDraftId = draft.id;
    const body = $('edit-draft-body');
    body.innerHTML = '';

    const form = document.createElement('div');
    form.className = 'edit-form';

    const nameGroup = makeField(I18n.t('simple_alert_save_placeholder'), 'edit-name', 'text', draft.name, '');
    form.appendChild(nameGroup);
    form.appendChild(makeField(I18n.t('simple_field_iban'), 'edit-iban', 'text', IBAN.format(draft.iban || ''), I18n.t('simple_field_iban_placeholder')));
    form.appendChild(makeField(I18n.t('simple_field_recipient'), 'edit-recipient', 'text', draft.recipient, I18n.t('simple_field_recipient_placeholder')));
    form.appendChild(makeField(I18n.t('simple_field_amount'), 'edit-amount', 'text', draft.amount, '0.00'));
    form.appendChild(makeField(I18n.t('simple_field_reference'), 'edit-reference', 'text', draft.reference, I18n.t('simple_field_reference_placeholder')));
    form.appendChild(makeField(I18n.t('advanced_field_bic'), 'edit-bic', 'text', draft.bic, I18n.t('advanced_field_bic_placeholder')));

    body.appendChild(form);
    openModal(modalEditDraft);
  }

  document.querySelector('.modal-save-edit').addEventListener('click', () => {
    if (!editingDraftId) return;
    const updates = {
      name: ($('edit-name') || {}).value || '',
      iban: IBAN.normalize(($('edit-iban') || {}).value || ''),
      recipient: ($('edit-recipient') || {}).value || '',
      amount: ($('edit-amount') || {}).value || '',
      reference: ($('edit-reference') || {}).value || '',
      bic: ($('edit-bic') || {}).value || ''
    };
    Storage.updateDraft(editingDraftId, updates);
    editingDraftId = null;
    closeModal(modalEditDraft);
    renderDrafts();
  });

  function showMoveDraftModal(draft) {
    movingDraftId = draft.id;
    const body = $('move-draft-body');
    body.innerHTML = '';

    const list = document.createElement('ul');
    list.className = 'move-list';

    const rootItem = document.createElement('li');
    rootItem.className = 'move-list-item' + (!draft.folderId ? ' selected' : '');
    rootItem.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg><span>' + escapeHtml(I18n.t('drafts_folder_root')) + '</span>';
    rootItem.addEventListener('click', () => {
      Storage.moveDraft(movingDraftId, null);
      movingDraftId = null;
      closeModal(modalMoveDraft);
      renderDrafts();
    });
    list.appendChild(rootItem);

    Storage.getFolders().forEach(folder => {
      const item = document.createElement('li');
      item.className = 'move-list-item' + (draft.folderId === folder.id ? ' selected' : '');
      item.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg><span>' + escapeHtml(folder.name) + '</span>';
      item.addEventListener('click', () => {
        Storage.moveDraft(movingDraftId, folder.id);
        movingDraftId = null;
        closeModal(modalMoveDraft);
        renderDrafts();
      });
      list.appendChild(item);
    });

    body.appendChild(list);
    openModal(modalMoveDraft);
  }

  function renameFolder(folder) {
    $('rename-folder-name').value = folder.name;
    openDialog(dialogRenameFolder);
    $('rename-folder-name').focus();
  }

  function confirmDeleteDraft(draft) {
    showConfirmDialog(
      I18n.t('confirm_delete_title'),
      I18n.t('confirm_delete_message'),
      I18n.t('confirm_delete_btn'),
      () => {
        Storage.deleteDraft(draft.id);
        renderDrafts();
      }
    );
  }

  function confirmDeleteFolder(folder) {
    showConfirmDialog(
      I18n.t('confirm_delete_folder_title'),
      I18n.t('confirm_delete_folder_message'),
      I18n.t('confirm_delete_folder_btn'),
      () => {
        Storage.deleteFolder(folder.id);
        if (currentFolder === folder.id) currentFolder = null;
        renderDrafts();
      }
    );
  }

  // === Search ===
  const searchInput = $('search-drafts');
  const btnClearSearch = $('btn-clear-search');

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    btnClearSearch.style.display = q ? 'block' : 'none';
    if (q) {
      renderSearchResults(Storage.searchDrafts(q));
    } else {
      renderDrafts();
    }
  });

  btnClearSearch.addEventListener('click', () => {
    searchInput.value = '';
    btnClearSearch.style.display = 'none';
    renderDrafts();
  });

  function renderSearchResults(results) {
    const list = $('drafts-list');
    const empty = $('drafts-empty');
    list.innerHTML = '';

    if (results.length === 0) {
      empty.style.display = 'flex';
      list.style.display = 'none';
      return;
    }

    empty.style.display = 'none';
    list.style.display = 'block';

    results.forEach(draft => {
      const item = createDraftItem({
        icon: 'payment',
        name: draft.name || draft.recipient || 'Unnamed',
        detail: IBAN.format(draft.iban || '')
      });
      item.addEventListener('click', () => loadDraftToForm(draft));
      addContextMenu(item, [
        { label: I18n.t('drafts_action_edit'), icon: 'edit', action: () => showEditDraftModal(draft) },
        { label: I18n.t('drafts_action_move'), icon: 'move', action: () => showMoveDraftModal(draft) },
        { label: I18n.t('drafts_action_delete'), icon: 'delete', danger: true, action: () => confirmDeleteDraft(draft) }
      ]);
      list.appendChild(item);
    });
  }

  // === Utility ===
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // === Register Service Worker ===
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
