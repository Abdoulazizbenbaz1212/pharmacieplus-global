// Numéros d'urgence par pays (code ISO 3166-1 alpha-2 -> numéro général)
export const URGENCE_PAR_PAYS = {
  // Afrique
  CM: '119', NG: '112', CI: '111', SN: '17', GH: '191', KE: '999',
  ZA: '10111', MA: '19', TN: '197', DZ: '17', CD: '112', CG: '112',
  GA: '1730', BJ: '117', TG: '117', ML: '17', BF: '17', NE: '17',
  TD: '17', CF: '117', GN: '17', RW: '112', UG: '999', TZ: '112',
  ET: '991', EG: '122', ZM: '991', ZW: '999', AO: '113', MZ: '119',
  BW: '999', NA: '10111', LS: '112', SZ: '999', MW: '997', MG: '117',
  SO: '888', SD: '999', LY: '1515', ER: '113', DJ: '17', BI: '112',
  SL: '999', LR: '911', GM: '117', GW: '112', MR: '17', CV: '132',
  ST: '112', GQ: '112', SS: '777', SC: '999', MU: '999', KM: '17',

  // Europe
  FR: '15', GB: '999', DE: '112', ES: '112', IT: '112', PT: '112',
  BE: '112', CH: '117', NL: '112', SE: '112', PL: '112', AT: '144',
  IE: '112', DK: '112', FI: '112', GR: '166', NO: '113', IS: '112',
  LU: '112', MT: '112', CY: '112', CZ: '112', SK: '112', HU: '112',
  RO: '112', BG: '112', HR: '112', SI: '112', EE: '112', LV: '112',
  LT: '112', RS: '94', BA: '124', MK: '192', AL: '127', ME: '124',
  MD: '112', UA: '112', BY: '103', RU: '112', TR: '112',

  // Amériques
  US: '911', CA: '911', MX: '911', BR: '192', AR: '911', CL: '133',
  CO: '123', PE: '105', VE: '171', EC: '911', BO: '911', PY: '911',
  UY: '911', CR: '911', PA: '911', GT: '110', HN: '911', SV: '911',
  NI: '911', CU: '106', DO: '911', HT: '114', JM: '119', TT: '999',

  // Asie / Moyen-Orient
  CN: '120', IN: '112', JP: '119', SA: '997', AE: '999', IL: '100',
  KR: '112', TH: '191', VN: '113', ID: '112', MY: '999', PH: '911',
  PK: '15', BD: '999', LK: '119', NP: '100', SG: '999', HK: '999',
  TW: '110', IQ: '104', IR: '110', JO: '911', LB: '112', KW: '112',
  QA: '999', BH: '999', OM: '9999', YE: '191', AF: '119', KZ: '112',
  UZ: '112', AZ: '112', GE: '112', AM: '911', MN: '105', MM: '199',
  KH: '117', LA: '191', BN: '993',

  // Océanie
  AU: '000', NZ: '111', FJ: '911', PG: '000', WS: '999', VU: '112',

  DEFAULT: '112',
};

export function getNumeroUrgence(codePays) {
  if (codePays && URGENCE_PAR_PAYS[codePays]) {
    return URGENCE_PAR_PAYS[codePays];
  }
  return URGENCE_PAR_PAYS.DEFAULT;
}
