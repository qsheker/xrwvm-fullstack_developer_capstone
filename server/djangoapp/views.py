import json
import logging
from datetime import date
from functools import wraps
from urllib.parse import quote

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, connection, transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.http import require_GET, require_POST

from .models import CarMake, CarModel
from .restapis import (
    BackendNotFound, BackendUnavailable, analyze_review_sentiments, get_request, post_review,
)

logger = logging.getLogger(__name__)


def error(message, status=400):
    return JsonResponse({"status": status, "message": message}, status=status)


def json_body(request):
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError) as exc:
        raise ValueError("Enter a valid JSON object.") from exc
    if not isinstance(data, dict):
        raise ValueError("Enter a valid JSON object.")
    return data


def text_field(data, key, maximum, required=True, strip=True):
    value = data.get(key, "")
    if not isinstance(value, str):
        raise ValueError(f"{key} must be text.")
    if strip:
        value = value.strip()
    if (required and not value) or len(value) > maximum:
        raise ValueError(f"{key} must contain 1–{maximum} characters.")
    return value


def api_errors(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        try:
            return view(*args, **kwargs)
        except (ValueError, ValidationError) as exc:
            message = " ".join(exc.messages) if isinstance(exc, ValidationError) else str(exc)
            return error(message)
        except BackendNotFound:
            return error("Dealer not found.", 404)
        except BackendUnavailable:
            logger.warning("A supporting service could not complete a request.")
            return error("The service is temporarily unavailable. Please try again.", 503)
    return wrapped


def user_data(user):
    return {"userName": user.username, "firstName": user.first_name,
            "lastName": user.last_name}


@require_GET
def session(request):
    return JsonResponse({
        "authenticated": request.user.is_authenticated,
        "user": user_data(request.user) if request.user.is_authenticated else None,
        "csrfToken": get_token(request)})


@require_POST
@api_errors
def login_user(request):
    data = json_body(request)
    user = authenticate(
        request, username=text_field(data, "userName", 150),
        password=text_field(data, "password", 256, strip=False))
    if user is None:
        return error("The username or password is incorrect.", 401)
    login(request, user)
    return JsonResponse({**user_data(user), "status": "Authenticated"})


@require_POST
def logout_request(request):
    logout(request)
    return JsonResponse({"userName": "", "status": "Logged out"})


@require_POST
@api_errors
def registration(request):
    data = json_body(request)
    username = text_field(data, "userName", 150)
    first_name = text_field(data, "firstName", 150)
    last_name = text_field(data, "lastName", 150)
    email = text_field(data, "email", 254)
    password = text_field(data, "password", 256, strip=False)
    validate_email(email)
    User._meta.get_field("username").run_validators(username)
    user = User(username=username, first_name=first_name,
                last_name=last_name, email=email)
    validate_password(password, user)
    try:
        with transaction.atomic():
            user.set_password(password)
            user.save()
    except IntegrityError:
        return error("That username is already registered.", 409)
    login(request, user)
    return JsonResponse({**user_data(user), "status": "Authenticated"}, status=201)


@require_GET
@api_errors
def get_dealerships(request, state="All"):
    endpoint = "/fetchDealers"
    if state and state != "All":
        endpoint += "/" + quote(state, safe="")
    return JsonResponse({"status": 200, "dealers": get_request(endpoint)})


@require_GET
@api_errors
def get_dealer_details(request, dealer_id):
    return JsonResponse({"status": 200,
                         "dealer": get_request(f"/fetchDealer/{dealer_id}")})


@require_GET
@api_errors
def get_dealer_reviews(request, dealer_id):
    reviews = get_request(f"/fetchReviews/dealer/{dealer_id}")
    for review in reviews:
        if not review.get("sentiment"):
            try:
                result = analyze_review_sentiments(review["review"])
                review["sentiment"] = result["sentiment"]
            except BackendUnavailable:
                review["sentiment"] = "unavailable"
    return JsonResponse({"status": 200, "reviews": reviews})


@require_GET
def get_cars(request):
    cars = [{"id": model.id, "CarMake": model.car_make.name,
             "CarModel": model.name, "type": model.type, "year": model.year,
             "dealer_id": model.dealer_id}
            for model in CarModel.objects.select_related("car_make")]
    return JsonResponse({"CarMakes": list(CarMake.objects.values(
        "id", "name", "description")), "CarModels": cars})


@require_GET
def get_car_makes(request):
    return JsonResponse({"CarMakes": list(CarMake.objects.values(
        "id", "name", "description"))})


@require_POST
@api_errors
def add_review(request):
    if not request.user.is_authenticated:
        return error("Log in before posting a review.", 401)
    data = json_body(request)
    dealer_id = data.get("dealership")
    if type(dealer_id) is not int or dealer_id < 1:
        return error("Select a valid dealer.")
    get_request(f"/fetchDealer/{dealer_id}")
    review = text_field(data, "review", 2000)
    purchase = data.get("purchase")
    if type(purchase) is not bool:
        return error("Specify whether you purchased a vehicle.")
    payload = {
        "name": request.user.get_full_name() or request.user.username,
        "username": request.user.username, "dealership": dealer_id,
        "review": review, "purchase": purchase,
        "purchase_date": "", "car_make": "", "car_model": "", "car_year": None,
        "created_at": timezone.now().isoformat(),
    }
    if purchase:
        model_id = data.get("car_model_id")
        if type(model_id) is not int:
            return error("Select a valid car model.")
        try:
            model = CarModel.objects.select_related("car_make").get(pk=model_id)
        except CarModel.DoesNotExist:
            return error("Select a valid car model.")
        year = data.get("car_year")
        if type(year) is not int or not 2015 <= year <= 2023:
            return error("Car year must be between 2015 and 2023.")
        purchase_date = date.fromisoformat(text_field(data, "purchase_date", 10))
        if purchase_date > timezone.localdate() or purchase_date.year < year:
            return error("Purchase date must follow the model year and cannot be in the future.")
        payload.update(purchase_date=purchase_date.isoformat(),
                       car_make=model.car_make.name, car_model=model.name,
                       car_year=year)
    try:
        payload["sentiment"] = analyze_review_sentiments(review)["sentiment"]
    except BackendUnavailable:
        payload["sentiment"] = ""
    saved = post_review(payload)
    return JsonResponse({"status": 200, "review": saved}, status=201)


@require_GET
def health(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return JsonResponse({"status": "ok", "service": "Best Cars"})
