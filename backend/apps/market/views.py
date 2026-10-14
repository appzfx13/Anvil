import os
from django.http import FileResponse, Http404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.market.models import MarketBackupTask
from apps.market.serializers import MarketBackupTaskSerializer, MarketBackupStatusUpdateSerializer
from apps.market.services import dispatch_backup_task, inspect_parquet_dataset

class MarketBackupTaskListCreateView(APIView):
    """
    GET /api/v1/market/backups/ - List all backup tasks with filters
    POST /api/v1/market/backups/ - Create and dispatch a new backup task
    """
    def get(self, request):
        queryset = MarketBackupTask.objects.all().order_by('-created_at')
        index_name = request.query_params.get('index_name')
        if index_name:
            queryset = queryset.filter(index_name=index_name)
        status_param = request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param.upper())
        
        # Summary statistics
        total_tasks = queryset.count()
        total_size_mb = sum([t.file_size_mb for t in queryset])
        active_jobs = queryset.filter(status__in=['PENDING', 'RUNNING']).count()

        serializer = MarketBackupTaskSerializer(queryset, many=True)
        return Response({
            'status': 'success',
            'stats': {
                'total_tasks': total_tasks,
                'total_size_mb': round(total_size_mb, 2),
                'active_jobs': active_jobs,
            },
            'data': serializer.data,
        })

    def post(self, request):
        serializer = MarketBackupTaskSerializer(data=request.data)
        if serializer.is_valid():
            task = serializer.save(
                user=request.user if request.user.is_authenticated else None,
                status='PENDING',
                progress=0
            )
            # Dispatch command to Redis Go microservice
            dispatched = dispatch_backup_task(task.id, 'START')
            return Response({
                'status': 'success',
                'message': 'Market backup task created and queued for execution.',
                'dispatched': dispatched,
                'data': MarketBackupTaskSerializer(task).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MarketBackupTaskDetailView(APIView):
    """
    GET /api/v1/market/backups/{id}/ - Retrieve task status
    DELETE /api/v1/market/backups/{id}/ - Delete task and purge files
    """
    def get_object(self, pk):
        try:
            return MarketBackupTask.objects.get(pk=pk)
        except MarketBackupTask.DoesNotExist:
            raise Http404

    def get(self, request, pk):
        task = self.get_object(pk)
        serializer = MarketBackupTaskSerializer(task)
        return Response({'status': 'success', 'data': serializer.data})

    def patch(self, request, pk):
        task = self.get_object(pk)
        serializer = MarketBackupStatusUpdateSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({'status': 'success', 'data': MarketBackupTaskSerializer(task).data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        task = self.get_object(pk)
        if task.status in ['PENDING', 'RUNNING']:
            dispatch_backup_task(task.id, 'CANCEL')
        task.delete()
        return Response({'status': 'success', 'message': f'Task #{pk} deleted successfully.'}, status=status.HTTP_200_OK)


class MarketBackupCancelView(APIView):
    """POST /api/v1/market/backups/{id}/cancel/ - Abort running backup job"""
    def post(self, request, pk):
        try:
            task = MarketBackupTask.objects.get(pk=pk)
        except MarketBackupTask.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        
        task.status = 'CANCELLED'
        task.save(update_fields=['status'])
        dispatched = dispatch_backup_task(task.id, 'CANCEL')
        return Response({
            'status': 'success',
            'message': f'Cancellation signal dispatched for Task #{pk}.',
            'dispatched': dispatched,
            'data': MarketBackupTaskSerializer(task).data,
        })


class MarketBackupRetryView(APIView):
    """POST /api/v1/market/backups/{id}/retry/ - Re-queue failed or cancelled backup job"""
    def post(self, request, pk):
        try:
            task = MarketBackupTask.objects.get(pk=pk)
        except MarketBackupTask.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        
        task.status = 'PENDING'
        task.progress = 0
        task.error_logs = ''
        task.save(update_fields=['status', 'progress', 'error_logs'])
        dispatched = dispatch_backup_task(task.id, 'START')
        return Response({
            'status': 'success',
            'message': f'Task #{pk} re-queued successfully.',
            'dispatched': dispatched,
            'data': MarketBackupTaskSerializer(task).data,
        })


class MarketBackupInspectView(APIView):
    """GET /api/v1/market/backups/{id}/inspect/ - Inspect Parquet schema & records using PyArrow"""
    def get(self, request, pk):
        try:
            task = MarketBackupTask.objects.get(pk=pk)
        except MarketBackupTask.DoesNotExist:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)

        file_path = task.parquet_file_path
        if not file_path or not os.path.exists(file_path):
            # Check default standard location
            candidate = f"/app/backup/{task.user_id or 1}/{task.id}/dataset.parquet"
            if os.path.exists(candidate):
                file_path = candidate
                task.parquet_file_path = candidate
                task.save(update_fields=['parquet_file_path'])

        limit = int(request.query_params.get('limit', 20))
        query = request.query_params.get('q', None)
        inspection = inspect_parquet_dataset(file_path, limit=limit, query=query)
        return Response({
            'status': 'success',
            'task_id': task.id,
            'index_name': task.index_name,
            'inspection': inspection,
        })


class MarketBackupDownloadView(APIView):
    """GET /api/v1/market/backups/{id}/download/ - Stream .parquet file to client"""
    def get(self, request, pk):
        try:
            task = MarketBackupTask.objects.get(pk=pk)
        except MarketBackupTask.DoesNotExist:
            raise Http404("Task not found")

        file_path = task.parquet_file_path
        if not file_path or not os.path.exists(file_path):
            candidate = f"/app/backup/{task.user_id or 1}/{task.id}/dataset.parquet"
            if os.path.exists(candidate):
                file_path = candidate

        if not file_path or not os.path.exists(file_path):
            raise Http404("Parquet dataset file not generated yet or missing on disk.")

        filename = f"{task.index_name}_{task.start_date}_{task.end_date}_backup.parquet"
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)
