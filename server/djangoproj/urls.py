from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from djangoapp.views import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("djangoapp/", include("djangoapp.urls")),
    path("healthz", health),
    path("about/", TemplateView.as_view(template_name="About.html")),
    path("contact/", TemplateView.as_view(template_name="Contact.html")),
    path("", TemplateView.as_view(template_name="Home.html")),
    re_path(r"^(?:login|register|dealers)/?$",
            TemplateView.as_view(template_name="index.html")),
    re_path(r"^(?:dealer|postreview)/[0-9]+/?$",
            TemplateView.as_view(template_name="index.html")),
]
