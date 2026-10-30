from django.db import transaction
from .models import CarMake, CarModel

CATALOG = {
    "Nissan": [("Pathfinder", "SUV"), ("Qashqai", "SUV"), ("X-Trail", "SUV")],
    "Mercedes-Benz": [("A-Class", "SEDAN"), ("C-Class", "SEDAN"), ("E-Class", "SEDAN")],
    "Audi": [("A4", "SEDAN"), ("A5", "SEDAN"), ("A6", "SEDAN")],
    "Kia": [("Sorento", "SUV"), ("Carnival", "VAN"), ("Cerato", "SEDAN")],
    "Toyota": [("Corolla", "SEDAN"), ("Camry", "SEDAN"), ("Kluger", "SUV")],
}


@transaction.atomic
def initiate():
    """Idempotent explicit seed; reads never modify the catalog."""
    for make_name, models in CATALOG.items():
        make, _ = CarMake.objects.get_or_create(
            name=make_name,
            defaults={"description": f"{make_name} vehicles in the Best Cars catalog."})
        for name, body_type in models:
            CarModel.objects.get_or_create(
                car_make=make, name=name, year=2023, dealer_id=1,
                defaults={"type": body_type})
