import secrets
import string
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is strictly required')
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        
        # Auto-provision Dhan sandbox credentials if not set
        if not user.dhan_client_id:
            user.dhan_client_id = user.generate_new_client_id()
        if not user.access_token:
            user.access_token = user.generate_new_access_token()
            
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        return self.create_user(email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=150, blank=True, default='')
    
    # Dhan Broker Protocol Identity
    dhan_client_id = models.CharField(max_length=20, unique=True, db_index=True)
    access_token = models.CharField(max_length=64, unique=True, db_index=True)
    
    # Gmail OTP Verification
    otp_code = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    
    # Google SSO Identity
    google_id = models.CharField(max_length=128, blank=True, null=True, unique=True)
    
    # Permissions & Flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} [Dhan: {self.dhan_client_id}]"

    @classmethod
    def generate_new_client_id(cls):
        """Generates a unique 10-digit Dhan style numeric client ID."""
        while True:
            # 1000000001 to 1099999999
            num = secrets.randbelow(99999999) + 1000000001
            client_id = str(num)
            if not cls.objects.filter(dhan_client_id=client_id).exists():
                return client_id

    @classmethod
    def generate_new_access_token(cls):
        """Generates a secure high-entropy sandbox access token."""
        token_chars = string.ascii_letters + string.digits
        random_suffix = ''.join(secrets.choice(token_chars) for _ in range(32))
        return f"dhn_sec_sandbox_{random_suffix}"
