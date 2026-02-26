/**
 * IBAN validation module.
 * Validates format and checksum per ISO 13616.
 */
const IBAN = (() => {
  // Country code -> expected total IBAN length
  const LENGTHS = {
    AL:28,AD:24,AT:20,AZ:28,BH:22,BY:28,BE:16,BA:20,BR:29,BG:22,
    CR:22,HR:21,CY:28,CZ:24,DK:18,DO:28,TL:23,EE:20,FO:18,FI:18,
    FR:27,GE:22,DE:22,GI:23,GR:27,GL:18,GT:28,HU:28,IS:26,IQ:23,
    IE:22,IL:23,IT:27,JO:30,KZ:20,XK:20,KW:30,LV:21,LB:28,LY:25,
    LI:21,LT:20,LU:20,MT:31,MR:27,MU:30,MC:27,MD:24,ME:22,NL:18,
    MK:19,NO:15,PK:24,PS:29,PL:28,PT:25,QA:29,RO:24,LC:32,SM:27,
    ST:25,SA:24,RS:22,SC:31,SK:24,SI:19,ES:24,SD:18,SE:24,CH:21,
    TN:24,TR:26,UA:29,AE:23,GB:22,VA:22,VG:24,EG:29
  };

  function normalize(iban) {
    return iban.replace(/\s+/g, '').toUpperCase();
  }

  function isValid(iban) {
    const clean = normalize(iban);
    if (clean.length < 2) return false;

    const country = clean.substring(0, 2);
    const expectedLen = LENGTHS[country];
    if (!expectedLen || clean.length !== expectedLen) return false;

    // Check that format is: 2 letters + 2 digits + alphanumeric rest
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(clean)) return false;

    // Mod-97 check (ISO 7064)
    const rearranged = clean.substring(4) + clean.substring(0, 4);
    let remainder = '';
    for (let i = 0; i < rearranged.length; i++) {
      const ch = rearranged[i];
      const val = ch >= 'A' && ch <= 'Z' ? (ch.charCodeAt(0) - 55).toString() : ch;
      remainder += val;
      // Process in chunks to avoid BigInt issues
      if (remainder.length > 7) {
        remainder = (parseInt(remainder, 10) % 97).toString();
      }
    }
    return parseInt(remainder, 10) % 97 === 1;
  }

  function format(iban) {
    const clean = normalize(iban);
    return clean.replace(/(.{4})/g, '$1 ').trim();
  }

  function getCountry(iban) {
    return normalize(iban).substring(0, 2);
  }

  return { isValid, normalize, format, getCountry };
})();
