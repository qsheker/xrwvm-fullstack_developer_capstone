from urllib.parse import quote
import requests
from django.conf import settings


class BackendUnavailable(Exception):
    pass


class BackendNotFound(Exception):
    pass


def call_service(method, url, **kwargs):
    try:
        response = requests.request(method, url, timeout=(3, 10), **kwargs)
        if response.status_code == 404:
            raise BackendNotFound()
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        raise BackendUnavailable("A supporting service is unavailable.") from exc


def get_request(endpoint, **kwargs):
    return call_service("GET", settings.BACKEND_URL + endpoint, params=kwargs)


def analyze_review_sentiments(text):
    return call_service(
        "GET", settings.SENTIMENT_URL + "/analyze/" + quote(text, safe="")
    )


def post_review(data_dict):
    return call_service(
        "POST", settings.BACKEND_URL + "/insert_review", json=data_dict,
        headers={"X-Review-Key": settings.REVIEW_API_KEY})
