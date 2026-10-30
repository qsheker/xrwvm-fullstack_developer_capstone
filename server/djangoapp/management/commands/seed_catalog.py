from django.core.management.base import BaseCommand
from djangoapp.populate import initiate


class Command(BaseCommand):
    help = "Create the sample car catalog without deleting or replacing data."

    def handle(self, *args, **options):
        initiate()
        self.stdout.write(self.style.SUCCESS("Car catalog is ready."))
