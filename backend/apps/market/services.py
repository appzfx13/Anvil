import json
import logging
import os
import redis
from django.conf import settings
from apps.market.constants import REDIS_TASKS_CHANNEL

logger = logging.getLogger(__name__)

def get_redis_client():
    redis_url = getattr(settings, 'REDIS_URL', 'redis://redis:6379/0')
    return redis.from_url(redis_url, decode_responses=True)

def dispatch_backup_task(task_id, command='START'):
    """Dispatches a backup control command (START, CANCEL, RETRY) to Redis."""
    from apps.market.models import MarketBackupTask
    try:
        task = MarketBackupTask.objects.get(id=task_id)
    except MarketBackupTask.DoesNotExist:
        logger.error(f"[MARKET-BACKUP] Task #{task_id} not found for dispatch.")
        return False

    payload = {
        'task_id': str(task.id),
        'command': command,
        'params': {
            'user_id': str(task.user.id if task.user else 1),
            'index_name': task.index_name,
            'start_date': str(task.start_date),
            'end_date': str(task.end_date),
            'strike_count': task.strike_count,
            'use_30_days_5s': task.use_30_days_5s,
            'use_30_days_1s': task.use_30_days_1s,
            'include_vix': task.include_vix,
        }
    }

    try:
        r = get_redis_client()
        r.publish(REDIS_TASKS_CHANNEL, json.dumps(payload))
        logger.info(f"[MARKET-BACKUP] Dispatched {command} for Task #{task_id} to Redis channel '{REDIS_TASKS_CHANNEL}'.")
        return True
    except Exception as e:
        logger.error(f"[MARKET-BACKUP] Failed to dispatch task #{task_id} to Redis: {e}")
        return False

def inspect_parquet_dataset(file_path, limit=20, query=None):
    """
    Inspects Apache Parquet file using pyarrow.
    Extracts schema, column data types, row counts, memory size, and preview rows.
    """
    if not file_path or not os.path.exists(file_path):
        return {
            'exists': False,
            'error': f'Parquet dataset file not found at: {file_path}'
        }

    try:
        import pyarrow.parquet as pq
        pf = pq.ParquetFile(file_path)
        num_rows = pf.metadata.num_rows
        num_row_groups = pf.metadata.num_row_groups
        schema = [{'name': f.name, 'type': str(f.type)} for f in pf.schema_arrow]

        head_records = []
        tail_records = []
        records = []
        is_split_view = False

        slice_count = min(limit, 10) if limit else 10
        if num_row_groups > 0:
            first_rg_table = pf.read_row_group(0)
            head_len = min(slice_count, first_rg_table.num_rows)
            head_table = first_rg_table.slice(0, head_len)
            head_dict = head_table.to_pydict()
            keys = list(head_dict.keys())
            for i in range(head_len):
                head_records.append({k: head_dict[k][i] for k in keys})

            if num_rows > head_len:
                last_rg_idx = num_row_groups - 1
                last_rg_table = pf.read_row_group(last_rg_idx)
                tail_len = min(slice_count, last_rg_table.num_rows)
                tail_offset = max(0, last_rg_table.num_rows - tail_len)
                tail_table = last_rg_table.slice(tail_offset, tail_len)
                tail_dict = tail_table.to_pydict()
                for i in range(tail_len):
                    tail_records.append({k: tail_dict[k][i] for k in keys})

            if tail_records:
                is_split_view = True
                records = head_records + tail_records
            else:
                records = head_records

        file_size_bytes = os.path.getsize(file_path)
        file_size_mb = round(file_size_bytes / (1024 * 1024), 2)

        return {
            'exists': True,
            'is_valid': True,
            'file_path': file_path,
            'file_size_mb': file_size_mb,
            'num_rows': num_rows,
            'num_row_groups': num_row_groups,
            'columns': pf.schema.names,
            'schema': schema,
            'head_records': head_records,
            'tail_records': tail_records,
            'records': records,
            'is_split_view': is_split_view,
            'sample_count': len(records),
        }
    except Exception as e:
        return {
            'exists': True,
            'is_valid': False,
            'error': f'Error reading Parquet binary format: {str(e)}'
        }
