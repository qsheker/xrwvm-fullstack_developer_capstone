# fullstack_developer_capstone

**Best Cars** is a full-stack dealership directory and review application built for IBM's Full Stack Application Development Capstone Project.

Visitors can browse 50 sample US dealerships, filter by state, search by dealer or city, read reviews, and open About Us and Contact Us. Registered users can log in, post a vehicle-purchase or visit review, and log out. Django administrators manage car makes and models. Reviews are labeled by a separate sentiment service.

## Architecture

- **React 18**: dealer list, state filter, details, review form, login and registration.
- **Django 5.2**: session authentication, CSRF protection, proxy APIs, SQLite car catalog and admin.
- **Express + MongoDB**: dealership data and persistent customer reviews.
- **Flask + NLTK VADER**: positive, negative and neutral sentiment.
- **Gunicorn + WhiteNoise**: application serving and compiled static assets.
- **Docker / Kubernetes**: separate services, health probes and configurable data volumes.
- **GitHub Actions**: Python lint, Django tests, Express/Mongo integration tests, sentiment tests, React build and container builds.

The browser calls Django on the same origin. Django calls the two supporting services. A server-only shared key protects Express review writes. Review authors are taken from the authenticated session, never from browser-supplied names.

## Run everything locally with Docker

Requirements: Docker with Compose, Git.

```sh
git clone https://github.com/qsheker/xrwvm-fullstack_developer_capstone.git
cd xrwvm-fullstack_developer_capstone
python3 -c 'import secrets; print("REVIEW_API_KEY="+secrets.token_hex(32))' > .env
docker compose up --build -d
docker compose exec web python manage.py createsuperuser
```

Open **http://localhost:8002**. The admin is **http://localhost:8002/admin/**. Create a regular user through Register.

MongoDB and SQLite use named volumes. Seeding uses stable IDs and never deletes existing reviews. To stop services without losing data, use `docker compose down`. Do not add `--volumes` unless you intend to remove your local data.

## Run with local development servers

Use Python 3.12 and Node 22. Start MongoDB on a private local port, for example:

```sh
docker run -d --name best-cars-dev-mongo -p 127.0.0.1:27029:27017 -v best-cars-dev-mongo:/data/db mongo:8.0
python3 -m venv .venv
. .venv/bin/activate
pip install -r server/requirements.txt -r server/djangoapp/microservices/requirements.txt flake8
cp server/.env.example server/.env
```

Set a random `REVIEW_API_KEY` in `server/.env`. Use the same value in the Express process environment. Keep all secrets out of Git.

```sh
cd server/database
npm ci
export REVIEW_API_KEY='your-locally-generated-key'
npm start
```

In a second terminal, with the virtual environment active:

```sh
cd server/djangoapp/microservices
gunicorn --bind 127.0.0.1:5003 app:app
```

Build React, migrate and seed the catalog, then run Django:

```sh
cd server/frontend
npm ci
npm run build
cd ..
python manage.py migrate
python manage.py seed_catalog
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8001
```

Open **http://127.0.0.1:8001**. The provided catalog uses model years **2015–2023** as required by the assignment.

## API routes

| Service | Method and route | Result |
| --- | --- | --- |
| Django | GET /djangoapp/session | Current user and CSRF token |
| Django | POST /djangoapp/register | Validate account, create user and session |
| Django | POST /djangoapp/login | Authenticate and establish session |
| Django | POST /djangoapp/logout | End session |
| Django | GET /djangoapp/get_dealers | All dealerships |
| Django | GET /djangoapp/get_dealers/Kansas | State-filtered dealerships |
| Django | GET /djangoapp/dealer/3 | Dealer details |
| Django | GET /djangoapp/reviews/dealer/3 | Reviews and sentiment |
| Django | GET /djangoapp/get_cars | Makes and models |
| Django | GET /djangoapp/get_car_makes | Makes |
| Django | GET /djangoapp/get_car_models | Catalog models |
| Django | POST /djangoapp/add_review | Add authenticated review |
| Express | GET /fetchDealers | All dealers |
| Express | GET /fetchDealers/:state | Dealers in one state |
| Express | GET /fetchDealer/:id | One dealer |
| Express | GET /fetchReviews | All reviews |
| Express | GET /fetchReviews/dealer/:id | Reviews for a dealer |
| Express | POST /insert_review | Internal authenticated review write |
| Sentiment | GET /analyze/Fantastic%20services | Sentiment classification |

All Django POST requests need the CSRF cookie and matching `X-CSRFToken` returned by `/djangoapp/session`. Logout is intentionally POST to prevent another page from logging out a user with an image or link.

Malformed inputs return 400, invalid login / anonymous review 401, missing dealers 404, and backend outages 503. If only sentiment is unavailable, existing reviews remain readable and are marked accordingly.

## Validation

```sh
flake8 server/djangoapp server/djangoproj scripts
python server/manage.py makemigrations --check --dry-run
python server/manage.py test djangoapp
(cd server/djangoapp/microservices && python -m unittest test_sentiment)
(cd server/database && npm run lint && npm test)
(cd server/frontend && CI=true npm run build)
docker build -t best-cars:local server
```

Express tests use and remove only a database named `best_cars_test`. Set `TEST_MONGO_URL` to its local MongoDB URI if needed. The tests cover state filtering, absent IDs, write authentication, malformed bodies, concurrent review IDs and preservation across initialization. Django tests cover CSRF, authentication, registration validation, catalog constraints, author spoofing, purchase validation and backend failures.

## Cloud deployment

See [deployment instructions](docs/deployment.md). The manifests support persistent volumes, non-root containers and internal services for MongoDB and Express. The actual Skills Network cluster has no usable storage class and denies NetworkPolicy creation, so its documented demonstration mode uses temporary volumes. Container restarts retain data; pod replacement and lab expiry do not. Local Docker Compose uses persistent volumes.

The [temporary course deployment](https://bettywhitec7-8000.theiadockernext-0-labs-prod-theiak8s-4-tor01.proxy.cognitiveclass.ai/) runs Django in Kubernetes and calls a [Code Engine sentiment service](https://best-cars-sentiment.2gjtwx6eao4a.us-south.codeengine.appdomain.cloud/healthz). Availability depends on the active Skills Network lab and port-forward session.

Publish only Django and the sentiment service required by the exercise. Set the exact HTTPS host and trusted origin and use a generated secret key; production configuration fails if secrets are missing. A configuration checksum rolls out Django when its environment changes.

## Course deliverables

- [About.html](server/frontend/static/About.html)
- [Contact.html](server/frontend/static/Contact.html)
- [Register.jsx](server/frontend/src/components/Register/Register.jsx)
- [CI workflow](.github/workflows/ci.yml)
- [Django container](server/Dockerfile)
- [Express container](server/database/Dockerfile)
- [Sentiment container](server/djangoapp/microservices/Dockerfile)

Runtime evidence is captured separately from real API responses and browser views. No credentials or fabricated screenshots are committed.

## Data and visual assets

IBM's starter supplies the dealership, review and vehicle fixtures, along with showroom/contact images. These are educational sample records, not verified live businesses. About Us profiles and contact details are fictional; email addresses use the reserved `.example` domain. Team portraits were generated with the built-in image generation tool for this project. See [design notes](docs/design-notes.md). The original Apache license is retained.
