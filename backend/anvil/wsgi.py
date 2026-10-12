"""
WSGI config for anvil project.
"""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'anvil.settings')
application = get_wsgi_application()
