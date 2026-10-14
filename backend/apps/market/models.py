import os
import shutil
from django.db import models
from django.conf import settings
from apps.market.choices import IndexNameChoices, BackupStatusChoices

class MarketBackupTask(models.Model):
    """
    Tracks Historical and Granular F&O Market Data Backup Tasks.
    Dispatched via Redis to Go worker microservice.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='market_backup_tasks', null=True, blank=True)
    index_name = models.CharField(max_length=20, choices=IndexNameChoices.choices, default=IndexNameChoices.NIFTY)
    start_date = models.DateField(help_text="Start session date (YYYY-MM-DD)")
    end_date = models.DateField(help_text="End session date (YYYY-MM-DD)")
    strike_count = models.PositiveIntegerField(default=15, help_text="Number of ATM +/- strikes (e.g. 15 = ATM +/- 15 strikes)")
    
    # Granularity / Resolution switches
    use_30_days_5s = models.BooleanField(default=True, help_text="Granular 5-second tick candles (Fyers Level-1)")
    use_30_days_1s = models.BooleanField(default=False, help_text="High-frequency 1-second ticks")
    include_vix = models.BooleanField(default=True, help_text="Bundle co-located INDIA VIX volatility ticks")
    
    # Execution Lifecycle & Progress
    status = models.CharField(max_length=20, choices=BackupStatusChoices.choices, default=BackupStatusChoices.CREATED)
    progress = models.PositiveIntegerField(default=0, help_text="Progress percentage 0-100")
    
    # Parquet Artifact & Storage Telemetry
    parquet_file_path = models.CharField(max_length=500, blank=True, null=True, help_text="Local path to compacted Parquet file")
    file_size_mb = models.FloatField(default=0.0, help_text="Generated dataset size in MB")
    total_records = models.BigIntegerField(default=0, help_text="Total rows/records contained in the parquet dataset")
    error_logs = models.TextField(blank=True, null=True, help_text="Error trace or execution logs")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Market Backup Task"
        verbose_name_plural = "Market Backup Tasks"

    @property
    def total_strikes_count(self):
        sc = self.strike_count or 0
        return (sc * 2) + 1 if sc > 0 else 0

    @property
    def resolution_label(self):
        if self.use_30_days_1s:
            return "1s High-Freq"
        if self.use_30_days_5s:
            return "5s Ticks"
        return "1m Candles"

    def delete_dataset_files(self):
        user_id = str(self.user.id if self.user else 1)
        task_id = str(self.id)
        candidate_paths = [
            self.parquet_file_path,
            os.path.join(settings.BASE_DIR, 'backup', user_id, task_id),
            os.path.join('/app', 'backup', user_id, task_id),
        ]
        for p in candidate_paths:
            if p and os.path.exists(p):
                if os.path.isdir(p):
                    shutil.rmtree(p, ignore_errors=True)
                else:
                    try:
                        os.remove(p)
                    except OSError:
                        pass

    def delete(self, using=None, keep_parents=False):
        self.delete_dataset_files()
        super().delete(using=using, keep_parents=keep_parents)

    def __str__(self):
        return f"Backup #{self.id:04d} - {self.index_name} ({self.start_date} to {self.end_date}) [{self.status}]"
