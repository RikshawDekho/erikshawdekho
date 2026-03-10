from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0005_dealerprofile_notify_email_dealerprofile_notify_push_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='dealerprofile',
            name='description',
            field=models.TextField(blank=True, help_text='Showroom description visible on public profile'),
        ),
    ]
