# Generated migration for DealerAPIKey and PlatformSettings models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_plan_model_and_geolocation'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('support_phone', models.CharField(blank=True, default='', max_length=20)),
                ('support_whatsapp', models.CharField(blank=True, default='', max_length=20)),
                ('support_email', models.EmailField(default='support@erikshawdekho.com', max_length=254)),
                ('support_name', models.CharField(default='eRickshawDekho Support', max_length=100)),
                ('homepage_intro_video_url', models.URLField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Platform Settings',
            },
        ),
        migrations.CreateModel(
            name='DealerAPIKey',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('service', models.CharField(
                    choices=[
                        ('twilio', 'Twilio (SMS/WhatsApp OTP)'),
                        ('gmail_smtp', 'Gmail SMTP (Email Marketing)'),
                        ('whatsapp_business', 'WhatsApp Business API'),
                        ('firebase', 'Firebase (Push Notifications)'),
                    ],
                    max_length=30,
                )),
                ('display_name', models.CharField(blank=True, max_length=100)),
                ('api_key', models.CharField(max_length=500)),
                ('api_secret', models.CharField(blank=True, max_length=500)),
                ('extra_config', models.JSONField(blank=True, default=dict, help_text='e.g. {"from_number": "+1234567890"}')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('dealer', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='api_keys',
                    to='api.dealerprofile',
                )),
            ],
            options={
                'ordering': ['service'],
                'unique_together': {('dealer', 'service')},
            },
        ),
    ]
