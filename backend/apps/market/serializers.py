from rest_framework import serializers
from apps.market.models import MarketBackupTask

class MarketBackupTaskSerializer(serializers.ModelSerializer):
    resolution_label = serializers.ReadOnlyField()
    total_strikes_count = serializers.ReadOnlyField()

    class Meta:
        model = MarketBackupTask
        fields = [
            'id',
            'index_name',
            'start_date',
            'end_date',
            'strike_count',
            'use_30_days_5s',
            'use_30_days_1s',
            'include_vix',
            'status',
            'progress',
            'parquet_file_path',
            'file_size_mb',
            'total_records',
            'error_logs',
            'created_at',
            'updated_at',
            'resolution_label',
            'total_strikes_count',
        ]
        read_only_fields = [
            'id',
            'status',
            'progress',
            'parquet_file_path',
            'file_size_mb',
            'total_records',
            'error_logs',
            'created_at',
            'updated_at',
            'resolution_label',
            'total_strikes_count',
        ]

    def validate(self, data):
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})
        return data


class MarketBackupStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketBackupTask
        fields = [
            'status',
            'progress',
            'parquet_file_path',
            'file_size_mb',
            'total_records',
            'error_logs',
        ]
