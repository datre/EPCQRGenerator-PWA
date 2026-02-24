/**
 * EPC QR Code generation module.
 * Generates the EPC069-12 standard QR code payload for SEPA Credit Transfers.
 *
 * Format:
 * BCD                       (Service Tag)
 * 002                       (Version: 001 or 002)
 * 1                         (Character set: 1=UTF-8)
 * SCT                       (Identification: SEPA Credit Transfer)
 * [BIC]                     (optional in v002)
 * [Beneficiary Name]        (max 70 chars)
 * [IBAN]
 * EUR[Amount]               (max 999999999.99, optional)
 * [Purpose]                 (4 chars, optional)
 * [Structured Reference]    (max 35 chars, optional, mutually exclusive with unstructured)
 * [Unstructured Reference]  (max 140 chars, optional)
 * [Information]             (max 70 chars, optional)
 */
const EPC = (() => {

  function generate(params) {
    const {
      iban = '',
      recipient = '',
      amount = '',
      reference = '',
      bic = '',
      purpose = '',
      structuredRef = '',
      text = '',
      version = '002'
    } = params;

    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    const cleanBic = bic.replace(/\s+/g, '').toUpperCase();

    // Format amount: EUR followed by amount with dot decimal separator
    let amountLine = '';
    if (amount && parseFloat(amount) > 0) {
      const num = parseFloat(amount);
      amountLine = 'EUR' + num.toFixed(2);
    }

    // Structured ref takes priority over unstructured
    const structRef = structuredRef.trim();
    const unstuctRef = structRef ? '' : reference.trim();

    const lines = [
      'BCD',                              // Service Tag
      version,                            // Version
      '1',                                // Character set (UTF-8)
      'SCT',                              // Identification
      cleanBic,                           // BIC
      recipient.trim().substring(0, 70),  // Beneficiary name
      cleanIban,                          // IBAN
      amountLine,                         // Amount
      purpose.trim().substring(0, 4).toUpperCase(),  // Purpose
      structRef.substring(0, 35),         // Structured reference
      unstuctRef.substring(0, 140),       // Unstructured reference
      (text || '').trim().substring(0, 70)  // Information
    ];

    // Trim trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    return lines.join('\n');
  }

  function validate(params) {
    const errors = [];
    const iban = (params.iban || '').replace(/\s+/g, '');
    const recipient = (params.recipient || '').trim();

    if (!iban) errors.push('IBAN is required');
    if (!recipient) errors.push('Recipient name is required');

    if (params.amount) {
      const num = parseFloat(params.amount);
      if (isNaN(num) || num < 0.01 || num > 999999999.99) {
        errors.push('Amount must be between 0.01 and 999,999,999.99');
      }
    }

    if (params.purpose && !/^[A-Z]{4}$/i.test(params.purpose.trim())) {
      errors.push('Purpose code must be exactly 4 letters');
    }

    return errors;
  }

  return { generate, validate };
})();
