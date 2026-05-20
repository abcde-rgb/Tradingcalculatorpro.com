"""
Stripe Payment System Tests for Trading Calculator PRO
Tests checkout creation, status verification, and webhook handling
"""
import os
import uuid
from typing import Dict

import pytest
import requests

BASE_URL: str = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://missing-apis-impl.preview.emergentagent.com"
)


def _login_demo_token() -> str:
    """Helper to log in the demo user and return its token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "demo@btccalc.pro", "password": "1234"},
    )
    assert response.status_code == 200, "Login failed"
    return str(response.json()["token"])


class TestStripeCheckoutCreate:
    """Tests for POST /api/checkout/create endpoint"""

    @pytest.fixture
    def auth_token(self) -> str:
        """Get authentication token for demo user"""
        return _login_demo_token()

    def test_checkout_create_monthly_plan(self, auth_token: str) -> None:
        """Test creating checkout session for monthly plan (€17)"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "plan_id": "monthly",
                "payment_method": "card",
                "origin_url": "https://missing-apis-impl.preview.emergentagent.com",
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert "transaction_id" in data, "Missing transaction_id"
        assert "checkout_url" in data, "Missing checkout_url"
        assert "session_id" in data, "Missing session_id"

        assert data["checkout_url"].startswith(
            "https://checkout.stripe.com"
        ), "Invalid Stripe checkout URL"
        assert data["session_id"].startswith(
            "cs_test_"
        ), "Invalid Stripe session ID format"

        print(
            f"Monthly plan checkout created - Session: {data['session_id'][:30]}..."
        )

    def test_checkout_create_quarterly_plan(self, auth_token: str) -> None:
        """Test creating checkout session for quarterly plan (€45)"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "plan_id": "quarterly",
                "payment_method": "card",
                "origin_url": "https://missing-apis-impl.preview.emergentagent.com",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data
        print("Quarterly plan checkout created")

    def test_checkout_create_annual_plan(self, auth_token: str) -> None:
        """Test creating checkout session for annual plan (€200)"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "plan_id": "annual",
                "payment_method": "card",
                "origin_url": "https://missing-apis-impl.preview.emergentagent.com",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data
        print("Annual plan checkout created")

    def test_checkout_create_lifetime_plan(self, auth_token: str) -> None:
        """Test creating checkout session for lifetime plan ($500)"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "plan_id": "lifetime",
                "payment_method": "card",
                "origin_url": "https://missing-apis-impl.preview.emergentagent.com",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data
        print("Lifetime plan checkout created")

    def test_checkout_create_sepa_payment(self, auth_token: str) -> None:
        """Test creating checkout session with SEPA payment method"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "plan_id": "monthly",
                "payment_method": "sepa",
                "origin_url": "https://missing-apis-impl.preview.emergentagent.com",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data
        print("SEPA payment checkout created")

    def test_checkout_create_invalid_plan(self, auth_token: str) -> None:
        """Test creating checkout with invalid plan returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "plan_id": "invalid_plan",
                "payment_method": "card",
                "origin_url": "https://test.com",
            },
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Plan no válido" in data["detail"]
        print("Invalid plan correctly rejected")

    def test_checkout_create_requires_auth(self) -> None:
        """Test that checkout creation requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            json={
                "plan_id": "monthly",
                "payment_method": "card",
                "origin_url": "https://test.com",
            },
        )
        assert response.status_code == 401
        print("Checkout correctly requires authentication")


class TestStripeCheckoutStatus:
    """Tests for GET /api/checkout/status/{session_id} endpoint"""

    @pytest.fixture
    def auth_token(self) -> str:
        """Get authentication token for demo user"""
        return _login_demo_token()

    @pytest.fixture
    def checkout_session(self, auth_token: str) -> Dict[str, str]:
        """Create a checkout session for testing"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "plan_id": "monthly",
                "payment_method": "card",
                "origin_url": "https://missing-apis-impl.preview.emergentagent.com",
            },
        )
        return response.json()

    def test_checkout_status_returns_pending(
        self, auth_token: str, checkout_session: Dict[str, str]
    ) -> None:
        """Test that newly created checkout returns pending status"""
        session_id = checkout_session["session_id"]

        response = requests.get(
            f"{BASE_URL}/api/checkout/status/{session_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()

        assert "transaction_id" in data
        assert "payment_status" in data
        assert "plan_id" in data
        assert "amount" in data
        assert "currency" in data
        assert "created_at" in data

        assert data["payment_status"] == "pending"
        assert data["plan_id"] == "monthly"
        assert data["amount"] == 17.0
        assert data["currency"] == "EUR"

        print(
            f"Checkout status returned correctly - "
            f"Status: {data['payment_status']}, Amount: {data['amount']} EUR"
        )

    def test_checkout_status_not_found(self, auth_token: str) -> None:
        """Test that invalid session_id returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/checkout/status/invalid_session_id",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print("Invalid session correctly returns 404")

    def test_checkout_status_requires_auth(
        self, checkout_session: Dict[str, str]
    ) -> None:
        """Test that status check requires authentication"""
        session_id = checkout_session["session_id"]
        response = requests.get(f"{BASE_URL}/api/checkout/status/{session_id}")
        assert response.status_code == 401
        print("Status check correctly requires authentication")


class TestSubscriptionPlans:
    """Tests for GET /api/plans endpoint"""

    def test_plans_endpoint(self) -> None:
        """Test that plans endpoint returns all subscription plans"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        data = response.json()

        assert "monthly" in data
        assert "quarterly" in data
        assert "annual" in data
        assert "lifetime" in data

        assert data["monthly"]["price"] == 17.0
        assert data["monthly"]["currency"] == "EUR"
        assert data["monthly"]["interval"] == "month"

        assert data["quarterly"]["price"] == 45.0
        assert data["quarterly"]["currency"] == "EUR"

        assert data["annual"]["price"] == 200.0
        assert data["annual"]["currency"] == "EUR"

        assert data["lifetime"]["price"] == 500.0
        assert data["lifetime"]["currency"] == "EUR"

        print(
            f"Plans endpoint working - Monthly: {data['monthly']['price']} EUR, "
            f"Lifetime: {data['lifetime']['price']} EUR"
        )


class TestStripeWebhook:
    """Tests for POST /api/webhook/stripe endpoint"""

    def test_webhook_endpoint_exists(self) -> None:
        """Test that webhook endpoint exists and accepts POST"""
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            headers={"Content-Type": "application/json"},
            data="{}",
        )
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404
        print(f"Webhook endpoint exists - Status: {response.status_code}")


class TestNewUserCheckoutFlow:
    """Tests for checkout flow with a new (non-premium) user"""

    @pytest.fixture
    def new_user_token(self) -> Dict[str, object]:
        """Create a new test user and get token"""
        test_email = f"TEST_stripe_{uuid.uuid4().hex[:8]}@test.com"

        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Test Stripe User",
            },
        )

        if response.status_code != 200:
            pytest.skip(f"Could not create test user: {response.text}")

        data = response.json()
        return {
            "token": data["token"],
            "user_id": data["user"]["id"],
            "email": test_email,
            "is_premium": data["user"]["is_premium"],
        }

    def test_new_user_is_not_premium(self, new_user_token: Dict[str, object]) -> None:
        """Verify new user starts without premium"""
        assert not new_user_token["is_premium"]
        print("New user correctly starts without premium")

    def test_new_user_can_create_checkout(
        self, new_user_token: Dict[str, object]
    ) -> None:
        """Test that non-premium user can create checkout session"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {new_user_token['token']}"},
            json={
                "plan_id": "monthly",
                "payment_method": "card",
                "origin_url": "https://missing-apis-impl.preview.emergentagent.com",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "checkout_url" in data
        assert "session_id" in data
        print("Non-premium user can create checkout session")

    def test_new_user_checkout_status(
        self, new_user_token: Dict[str, object]
    ) -> None:
        """Test full checkout flow for new user"""
        create_response = requests.post(
            f"{BASE_URL}/api/checkout/create",
            headers={"Authorization": f"Bearer {new_user_token['token']}"},
            json={
                "plan_id": "annual",
                "payment_method": "card",
                "origin_url": "https://missing-apis-impl.preview.emergentagent.com",
            },
        )
        assert create_response.status_code == 200
        session_id = create_response.json()["session_id"]

        status_response = requests.get(
            f"{BASE_URL}/api/checkout/status/{session_id}",
            headers={"Authorization": f"Bearer {new_user_token['token']}"},
        )
        assert status_response.status_code == 200
        data = status_response.json()

        assert data["payment_status"] == "pending"
        assert data["plan_id"] == "annual"
        assert data["amount"] == 200.0

        print(
            f"New user checkout flow working - Plan: {data['plan_id']}, "
            f"Amount: {data['amount']} EUR"
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
