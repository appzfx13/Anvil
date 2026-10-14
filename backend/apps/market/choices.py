from django.db import models

class IndexNameChoices(models.TextChoices):
    NIFTY = 'NIFTY', 'NIFTY 50'
    BANKNIFTY = 'BANKNIFTY', 'BANK NIFTY'
    FINNIFTY = 'FINNIFTY', 'FIN NIFTY'
    MIDCPNIFTY = 'MIDCPNIFTY', 'MIDCAP NIFTY'
    SENSEX = 'SENSEX', 'BSE SENSEX'
    INDIAVIX = 'INDIAVIX', 'INDIA VIX'

class BackupStatusChoices(models.TextChoices):
    CREATED = 'CREATED', 'Created'
    PENDING = 'PENDING', 'Pending'
    RUNNING = 'RUNNING', 'Running'
    COMPLETED = 'COMPLETED', 'Completed'
    FAILED = 'FAILED', 'Failed'
    CANCELLED = 'CANCELLED', 'Cancelled'
