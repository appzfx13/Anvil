#!/usr/bin/env python
"""
Standalone execution script to provision 1 Super Admin and 2 Trader Users in ANVIL.
Run inside backend container:
  python scripts/setup_users.py
Or from workspace:
  docker exec anvil_backend python scripts/setup_users.py
"""
import os
import sys

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'anvil.settings')

import django
django.setup()

from django.core.management import call_command

if __name__ == '__main__':
    call_command('setup_demo_users')
