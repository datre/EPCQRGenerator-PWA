/**
 * Minimal i18n system - translation-ready.
 * All UI strings use data-i18n attributes in HTML.
 * To add a new language, add a translation object to `translations` and call setLanguage().
 */
const I18n = (() => {
  const translations = {
    en: {
      // Create screen
      simple_header_subtitle: 'Create SEPA payment QR codes',
      simple_field_iban: 'IBAN',
      simple_field_iban_placeholder: 'DE89 3704 0044 0532 0130 00',
      simple_field_iban_invalid: 'Invalid IBAN checksum',
      simple_field_recipient: 'Recipient Name',
      simple_field_recipient_placeholder: 'Max Mustermann',
      simple_field_amount: 'Amount (Optional)',
      simple_field_reference: 'Payment Reference (Optional)',
      simple_field_reference_placeholder: 'Invoice 12345',
      simple_button_generate: 'Generate QR Code',
      simple_button_advanced: 'Advanced',
      simple_button_save: 'Save Draft',

      // Tabs
      tab_create: 'Create',
      tab_drafts: 'Drafts',

      // QR modal
      qr_title: 'QR Code',
      qr_button_done: 'Done',
      qr_label_recipient: 'Recipient',
      qr_label_iban: 'IBAN',
      qr_label_amount: 'Amount',
      qr_label_reference: 'Reference',
      qr_button_share: 'Share',
      qr_button_copy: 'Copy',
      qr_button_download: 'Download',

      // Advanced settings
      advanced_title: 'Advanced Settings',
      advanced_button_done: 'Done',
      advanced_field_bic: 'BIC / SWIFT (Optional)',
      advanced_field_bic_placeholder: 'COBADEFFXXX',
      advanced_field_purpose: 'Purpose Code (Optional)',
      advanced_field_purpose_placeholder: 'e.g. SALA, CBFF',
      advanced_field_struct_ref: 'Structured Reference (Optional)',
      advanced_field_struct_ref_placeholder: 'RF18539007547034',
      advanced_field_text: 'Remittance Text (Optional)',
      advanced_field_text_placeholder: 'Payment for invoice #12345',
      advanced_field_version: 'EPC QR Version',
      advanced_info_purpose_title: 'Purpose Code',
      advanced_info_purpose_msg: 'A 4-character code (ISO 20022) identifying the payment purpose. Common codes: SALA (salary), CBFF (capital building), CHAR (charity).',
      advanced_info_struct_ref_title: 'Structured Reference',
      advanced_info_struct_ref_msg: 'A standardized reference (e.g., RF creditor reference per ISO 11649). If set, the unstructured reference on the main screen will be ignored.',
      advanced_info_ok: 'OK',

      // Drafts
      drafts_title: 'Saved Drafts',
      drafts_search_prompt: 'Search drafts',
      drafts_empty_title: 'No Saved Drafts',
      drafts_empty_subtitle: 'Save payment details to quickly create QR codes later',
      drafts_item_count: '{count} items',
      drafts_folder_root: 'Root (No Folder)',
      drafts_folder_new_title: 'New Folder',
      drafts_folder_new_placeholder: 'Folder Name',
      drafts_folder_rename_title: 'Rename Folder',
      drafts_move_title: 'Move to Folder',

      // Draft actions
      drafts_action_edit: 'Edit',
      drafts_action_move: 'Move to Folder',
      drafts_action_delete: 'Delete',
      drafts_action_rename: 'Rename Folder',
      drafts_action_delete_folder: 'Delete Folder',

      // Save/Edit
      simple_alert_save_title: 'Save Draft',
      simple_alert_save_placeholder: 'Draft Name',
      simple_alert_save_cancel: 'Cancel',
      simple_alert_save_confirm: 'Save',
      edit_title: 'Edit Draft',
      edit_button_cancel: 'Cancel',
      edit_button_save: 'Save',

      // Confirm dialogs
      confirm_delete_title: 'Delete Draft',
      confirm_delete_message: 'Are you sure you want to delete this draft?',
      confirm_delete_btn: 'Delete',
      confirm_delete_folder_title: 'Delete Folder',
      confirm_delete_folder_message: 'All drafts in this folder will be moved to the root. Continue?',
      confirm_delete_folder_btn: 'Delete',
    }
  };

  let currentLang = 'en';

  function t(key) {
    const strings = translations[currentLang] || translations.en;
    return strings[key] || translations.en[key] || key;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-placeholder-i18n]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-placeholder-i18n'));
    });
  }

  function setLanguage(lang) {
    if (translations[lang]) {
      currentLang = lang;
      applyTranslations();
    }
  }

  function getLanguage() {
    return currentLang;
  }

  return { t, applyTranslations, setLanguage, getLanguage };
})();
