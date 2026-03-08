from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_dealer(self):
        res = self.client.post('/api/auth/register/', {
            'username':    'testdealer',
            'email':       'dealer@test.com',
            'password':    'testpass123',
            'dealer_name': 'Test Motors',
            'phone':       '9876543210',
            'city':        'Mumbai',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)

    def test_login(self):
        User.objects.create_user('loginuser', 'login@test.com', 'pass1234')
        res = self.client.post('/api/auth/login/', {
            'username': 'loginuser',
            'password': 'pass1234',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

    def test_unauthenticated_dashboard(self):
        res = self.client.get('/api/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_marketplace_public(self):
        res = self.client.get('/api/marketplace/')
        # marketplace is public — should not require auth
        self.assertNotEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)
