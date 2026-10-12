/**
 * ANVIL Frontend Strict Constants — Zero Fallback Architecture
 */

export const SUPPORTED_INDICES = [
  {
    key: 'NIFTY50',
    name: 'NIFTY 50',
    fyersSymbol: 'NSE:NIFTY50-INDEX',
    exchange: 'NSE_FNO',
    strikeInterval: 50,
    lotSize: 25,
    baseSpot: 25200.0,
  },
  {
    key: 'BANKNIFTY',
    name: 'BANK NIFTY',
    fyersSymbol: 'NSE:NIFTYBANK-INDEX',
    exchange: 'NSE_FNO',
    strikeInterval: 100,
    lotSize: 15,
    baseSpot: 52100.0,
  },
  {
    key: 'FINNIFTY',
    name: 'FINNIFTY',
    fyersSymbol: 'NSE:FINNIFTY-INDEX',
    exchange: 'NSE_FNO',
    strikeInterval: 50,
    lotSize: 25,
    baseSpot: 24350.0,
  },
  {
    key: 'MIDCAPNIFTY',
    name: 'MIDCAP NIFTY',
    fyersSymbol: 'NSE:MIDCPNIFTY-INDEX',
    exchange: 'NSE_FNO',
    strikeInterval: 25,
    lotSize: 50,
    baseSpot: 13150.0,
  },
  {
    key: 'SENSEX',
    name: 'BSE SENSEX',
    fyersSymbol: 'BSE:SENSEX-INDEX',
    exchange: 'BSE_FNO',
    strikeInterval: 100,
    lotSize: 10,
    baseSpot: 82400.0,
  },
];

export const ORDER_TYPES = [
  { id: 'MARKET', label: 'Market' },
  { id: 'LIMIT', label: 'Limit' },
  { id: 'STOP_LOSS', label: 'Stop Loss (SL)' },
  { id: 'STOP_LOSS_MARKET', label: 'SL-Market (SL-M)' },
];

export const PRODUCT_TYPES = [
  { id: 'INTRADAY', label: 'Intraday (MIS)' },
  { id: 'MARGIN', label: 'Normal / Margin (NRML)' },
  { id: 'CNC', label: 'Cash & Carry (CNC)' },
  { id: 'BO', label: 'Bracket Order (BO)' },
];

export const TRANSACTION_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
};

export const ORDER_STATUSES = {
  TRADED: { label: 'TRADED', color: 'bull' },
  PENDING: { label: 'PENDING', color: 'amber' },
  REJECTED: { label: 'REJECTED', color: 'bear' },
  CANCELLED: { label: 'CANCELLED', color: 'neutral' },
  TRANSIT: { label: 'TRANSIT', color: 'cyan' },
};
