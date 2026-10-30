import json
from unittest.mock import patch
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import Client, TestCase
from .models import CarMake, CarModel
from .populate import initiate
from .restapis import BackendUnavailable


class AuthAndReviewTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.password = "test-only-P4ssphrase!2026"
        self.user = User.objects.create_user(
            "driver", password=self.password, first_name="Alex", last_name="Morgan")
        initiate()
        self.model = CarModel.objects.first()

    def post(self, path, data):
        token = self.client.get("/djangoapp/session").json()["csrfToken"]
        return self.client.post(
            path, json.dumps(data), content_type="application/json",
            HTTP_X_CSRFTOKEN=token)

    def sign_in(self):
        return self.post("/djangoapp/login", {
            "userName": "driver", "password": self.password})

    def test_login_session_logout_and_csrf(self):
        self.assertEqual(self.client.post("/djangoapp/login", {}).status_code, 403)
        self.assertEqual(self.post("/djangoapp/login", {
            "userName": "driver", "password": "wrong"}).status_code, 401)
        self.assertEqual(self.sign_in().json()["status"], "Authenticated")
        self.assertEqual(self.client.get("/djangoapp/session").json()["user"]["userName"], "driver")
        self.assertEqual(self.client.get("/djangoapp/logout").status_code, 405)
        self.assertEqual(self.post("/djangoapp/logout", {}).status_code, 200)
        self.assertFalse(self.client.get("/djangoapp/session").json()["authenticated"])

    def test_registration_validates_and_establishes_session(self):
        data = {"userName": "samira", "firstName": "Samira", "lastName": "Ali",
                "email": "samira@example.com", "password": "lesson-Passphrase!82"}
        self.assertEqual(self.post("/djangoapp/register", data).status_code, 201)
        self.assertTrue(self.client.get("/djangoapp/session").json()["authenticated"])
        self.assertEqual(self.post("/djangoapp/register", data).status_code, 409)
        data.update(userName="someone", email="invalid")
        self.assertEqual(self.post("/djangoapp/register", data).status_code, 400)

    def test_bad_json_and_anonymous_review(self):
        self.assertEqual(self.post("/djangoapp/login", []).status_code, 400)
        self.assertEqual(self.post("/djangoapp/add_review", {}).status_code, 401)

    @patch("djangoapp.views.post_review")
    @patch("djangoapp.views.analyze_review_sentiments", return_value={"sentiment": "positive"})
    @patch("djangoapp.views.get_request", return_value=[{"id": 1}])
    def test_review_uses_session_identity_and_validates_purchase(self, get, sentiment, post):
        self.sign_in()
        post.return_value = {"id": 51}
        data = {"dealership": 1, "review": "Fantastic services", "purchase": True,
                "car_model_id": self.model.id, "car_year": 2023,
                "purchase_date": "2024-05-20", "name": "Forged author", "username": "root"}
        response = self.post("/djangoapp/add_review", data)
        self.assertEqual(response.status_code, 201)
        payload = post.call_args.args[0]
        self.assertEqual(payload["name"], "Alex Morgan")
        self.assertEqual(payload["username"], "driver")
        self.assertEqual(payload["car_make"], self.model.car_make.name)
        data["purchase_date"] = "2999-01-01"
        self.assertEqual(self.post("/djangoapp/add_review", data).status_code, 400)
        data["purchase"] = False
        self.assertEqual(self.post("/djangoapp/add_review", data).status_code, 201)
        self.assertEqual(post.call_args.args[0]["car_make"], "")
        data["purchase"] = "false"
        self.assertEqual(self.post("/djangoapp/add_review", data).status_code, 400)

    @patch("djangoapp.views.get_request", side_effect=BackendUnavailable)
    def test_backend_outage_has_explicit_status(self, get):
        self.assertEqual(self.client.get("/djangoapp/get_dealers").status_code, 503)

    def test_catalog_seed_is_idempotent_and_model_year_is_validated(self):
        initiate()
        self.assertEqual(CarMake.objects.count(), 5)
        self.assertEqual(CarModel.objects.count(), 15)
        self.model.year = 2030
        with self.assertRaises(ValidationError):
            self.model.full_clean()
        self.assertEqual(len(self.client.get("/djangoapp/get_cars").json()["CarModels"]), 15)

    def test_static_pages_show_current_navigation(self):
        response = self.client.get("/about/")
        self.assertContains(response, 'aria-current="page">About Us')
        self.assertContains(response, "Maya Chen")
        self.assertContains(self.client.get("/contact/"), "support@bestcars.example")
