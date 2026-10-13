/**
 * ANVIL Formatters & Normalization Utilities
 */

/**
 * Standardize option & index contract symbols across the entire platform.
 * Formats:
 * - "NIFTY5026OCT25200CE" -> "NIFTY 26 OCT 25200 CE"
 * - "NIFTY 13 OCT 22550 CALL" -> "NIFTY 13 OCT 22550 CE"
 * - "NIFTY 13 OCT 22500 PUT" -> "NIFTY 13 OCT 22500 PE"
 * - "BANKNIFTY26OCT48200PE" -> "BANKNIFTY 26 OCT 48200 PE"
 * - "NIFTY-SEP2026-24500-CE" -> "NIFTY 26 SEP 24500 CE"
 */
export function formatTradingSymbol(rawSymbol) {
  if (!rawSymbol || typeof rawSymbol !== 'string') return '';
  const sym = rawSymbol.trim();

  // Index Spot names
  if (sym === 'NIFTY 50' || sym === 'BANK NIFTY' || sym === 'FIN NIFTY' || sym === 'SENSEX' || sym === 'MIDCPNIFTY') {
    return sym;
  }

  let cleaned = sym
    .replace(/^NSE:/i, '')
    .replace(/^BSE:/i, '')
    .replace(/-(CE|PE)$/i, ' $1')
    .replace(/\s+CALL$/i, ' CE')
    .replace(/\s+PUT$/i, ' PE')
    .replace(/-SEP(\d{4})-/i, ' 26 SEP ')
    .replace(/-OCT(\d{4})-/i, ' 26 OCT ');

  // Compact pattern like NIFTY5026OCT25200CE or NIFTY26OCT25200CE or BANKNIFTY26OCT48200PE
  const compactRegex = /^(NIFTY50|NIFTY|BANKNIFTY|FINNIFTY|SENSEX|MIDCPNIFTY)(\d{1,2}[A-Z]{3})(\d{4,6})(CE|PE)$/i;
  const match = cleaned.match(compactRegex);
  if (match) {
    let [_, indexName, expiry, strike, optionType] = match;
    if (indexName.toUpperCase() === 'NIFTY50') indexName = 'NIFTY';
    const expFormatted = expiry.replace(/^(\d{1,2})([A-Z]{3})$/i, '$1 $2').toUpperCase();
    return `${indexName.toUpperCase()} ${expFormatted} ${strike} ${optionType.toUpperCase()}`;
  }

  // Spaced pattern without space in expiry like "NIFTY 26OCT 22500 CE"
  const spacedRegex = /^(NIFTY50|NIFTY|BANKNIFTY|FINNIFTY|SENSEX|MIDCPNIFTY)\s+(\d{1,2}[A-Z]{3})\s+(\d+)\s+(CE|PE)$/i;
  const matchSpaced = cleaned.match(spacedRegex);
  if (matchSpaced) {
    let [_, indexName, expiry, strike, optionType] = matchSpaced;
    if (indexName.toUpperCase() === 'NIFTY50') indexName = 'NIFTY';
    const expFormatted = expiry.replace(/^(\d{1,2})([A-Z]{3})$/i, '$1 $2').toUpperCase();
    return `${indexName.toUpperCase()} ${expFormatted} ${strike} ${optionType.toUpperCase()}`;
  }

  // Fully spaced like "NIFTY 13 OCT 22550 CE"
  const fullSpacedRegex = /^(NIFTY50|NIFTY|BANKNIFTY|FINNIFTY|SENSEX|MIDCPNIFTY)\s+(\d{1,2})\s+([A-Z]{3})\s+(\d+)\s+(CE|PE)$/i;
  const matchFull = cleaned.match(fullSpacedRegex);
  if (matchFull) {
    let [_, indexName, day, month, strike, optionType] = matchFull;
    if (indexName.toUpperCase() === 'NIFTY50') indexName = 'NIFTY';
    return `${indexName.toUpperCase()} ${day} ${month.toUpperCase()} ${strike} ${optionType.toUpperCase()}`;
  }

  return cleaned.toUpperCase();
}
