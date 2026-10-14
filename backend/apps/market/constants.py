SUPPORTED_BACKUP_INDICES = [
    {
        'key': 'NIFTY',
        'name': 'NIFTY 50',
        'exchange': 'NSE_FNO',
        'fyers_symbol': 'NSE:NIFTY50-INDEX',
        'lot_size': 25,
        'strike_interval': 50,
    },
    {
        'key': 'BANKNIFTY',
        'name': 'BANK NIFTY',
        'exchange': 'NSE_FNO',
        'fyers_symbol': 'NSE:NIFTYBANK-INDEX',
        'lot_size': 15,
        'strike_interval': 100,
    },
    {
        'key': 'FINNIFTY',
        'name': 'FIN NIFTY',
        'exchange': 'NSE_FNO',
        'fyers_symbol': 'NSE:FINNIFTY-INDEX',
        'lot_size': 25,
        'strike_interval': 50,
    },
    {
        'key': 'MIDCPNIFTY',
        'name': 'MIDCAP NIFTY',
        'exchange': 'NSE_FNO',
        'fyers_symbol': 'NSE:MIDCPNIFTY-INDEX',
        'lot_size': 50,
        'strike_interval': 25,
    },
    {
        'key': 'SENSEX',
        'name': 'BSE SENSEX',
        'exchange': 'BSE_FNO',
        'fyers_symbol': 'BSE:SENSEX-INDEX',
        'lot_size': 10,
        'strike_interval': 100,
    },
]

REDIS_TASKS_CHANNEL = 'anvil:tasks:control'
REDIS_TELEMETRY_CHANNEL = 'anvil:tasks:telemetry'
