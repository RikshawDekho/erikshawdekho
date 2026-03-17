from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_prod_indexes_and_fixes'),
    ]

    operations = [
        migrations.CreateModel(
            name='FinanceApplicationRemark',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('author_type', models.CharField(choices=[('financer', 'Financer'), ('dealer', 'Dealer')], max_length=10)),
                ('content', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('application', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='remarks', to='api.financeapplication')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
    ]
