# Deploy Best Cars

Build and push the three images from their Dockerfiles. Use distinct names for this capstone so earlier course projects are not replaced:

- `best-cars-web`: context `server`
- `best-cars-api`: context `server/database`
- `best-cars-sentiment`: context `server/djangoapp/microservices`

The main image builds React and collects Django static files. It does not contain a database, environment file or credentials.

## Kubernetes / OpenShift

The initial Django deployment, service and PVC are in `server/deployment.yaml`. Replace the image namespace, create the referenced ConfigMap and Secret, and use the namespace-appropriate volume security context before applying. Include `localhost` among allowed hosts so health probes can reach the app.

The deployment must have:
1. MongoDB with a persistent data volume and internal service.
2. Express with `MONGO_URL`, a shared `REVIEW_API_KEY` secret, and internal service.
3. Django with a persistent SQLite volume, `DJANGO_DEBUG=0`, a random `DJANGO_SECRET_KEY`, the same `REVIEW_API_KEY`, exact `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`, `BACKEND_URL`, and `SENTIMENT_URL`.
4. A trusted HTTPS ingress or OpenShift route for Django. Set `TRUST_PROXY=1` only when the ingress overwrites forwarding headers.
5. HTTP readiness and liveness probes at `/healthz`.
6. One Django replica with a Recreate strategy because this educational deployment uses a single SQLite volume.

Django migrations and the idempotent catalog seed run at container startup. Create the administrator with `python manage.py createsuperuser` inside the running container. The image supports an arbitrary OpenShift UID with group 0. Mount the data volume with the namespace's permitted file-system group.

Do not expose MongoDB to the internet. Express reads contain only sample public data, but its write endpoint still requires the server-only key.

## IBM Code Engine sentiment service

Deploy the sentiment image on port 5000 using the lab's registry secret. Validate:

```sh
curl --fail 'https://YOUR-SENTIMENT-URL/analyze/Fantastic%20services'
```

The response must report `positive`. Set that HTTPS origin as Django's `SENTIMENT_URL`. The VADER lexicon is bundled, so the running service needs no download.

## Persistence and scope

Restarting the API does not erase reviews. SQLite and MongoDB data belong on persistent volumes. Do not put credentials in the repository or bake a database into an image. This is a course demonstration, not a production dealership system; a production rollout would also need PostgreSQL, rate limiting, backups, observability and a reviewed privacy policy.
