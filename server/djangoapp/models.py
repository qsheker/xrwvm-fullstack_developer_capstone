from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class CarMake(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField()

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class CarModel(models.Model):
    CAR_TYPES = [("SEDAN", "Sedan"), ("SUV", "SUV"), ("WAGON", "Wagon"),
                 ("VAN", "Van")]
    car_make = models.ForeignKey(CarMake, on_delete=models.CASCADE,
                                 related_name="models")
    dealer_id = models.PositiveIntegerField(default=1)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=CAR_TYPES, default="SUV")
    year = models.IntegerField(
        default=2023, validators=[MinValueValidator(2015), MaxValueValidator(2023)]
    )

    class Meta:
        ordering = ["car_make__name", "name", "year"]
        constraints = [models.UniqueConstraint(
            fields=["car_make", "name", "year", "dealer_id"],
            name="unique_dealer_car_model")]

    def __str__(self):
        return f"{self.car_make.name} {self.name} ({self.year})"
