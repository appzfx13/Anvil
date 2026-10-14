from django.urls import path
from apps.market.views import (
    MarketBackupTaskListCreateView,
    MarketBackupTaskDetailView,
    MarketBackupCancelView,
    MarketBackupRetryView,
    MarketBackupInspectView,
    MarketBackupDownloadView,
)

urlpatterns = [
    path('backups/', MarketBackupTaskListCreateView.as_view(), name='backup-list-create'),
    path('backups/<int:pk>/', MarketBackupTaskDetailView.as_view(), name='backup-detail'),
    path('backups/<int:pk>/cancel/', MarketBackupCancelView.as_view(), name='backup-cancel'),
    path('backups/<int:pk>/retry/', MarketBackupRetryView.as_view(), name='backup-retry'),
    path('backups/<int:pk>/inspect/', MarketBackupInspectView.as_view(), name='backup-inspect'),
    path('backups/<int:pk>/download/', MarketBackupDownloadView.as_view(), name='backup-download'),
]
