# Deploy Best Cars

Three Docker images implement the application:

- `best-cars-web`: build context `server`; React, Django, WhiteNoise and Gunicorn.
- `best-cars-api`: build context `server/database`; Express and MongoDB access.
- `best-cars-sentiment`: build context `server/djangoapp/microservices`; Flask and bundled VADER lexicon.

The images contain neither databases nor credentials. The application image revision used for the course demonstration is `4c2af33` in the `us.icr.io/sn-labs-bettywhitec7` registry namespace.

## IBM Code Engine

The sentiment service was deployed with:

```sh
ibmcloud ce application create --name best-cars-sentiment \
  --image us.icr.io/sn-labs-bettywhitec7/best-cars-sentiment:4c2af33 \
  --registry-secret icr-secret --port 5000 --min-scale 1 --max-scale 1
curl --fail 'https://best-cars-sentiment.2gjtwx6eao4a.us-south.codeengine.appdomain.cloud/analyze/Fantastic%20services'
```

The verified response was `{"score":0.5574,"sentiment":"positive"}`.

## Kubernetes

`server/deployment.yaml` defines the three deployments, internal services, persistent volume claims and health probes. `scripts/deploy_kubernetes.py` fills the image tag, registry namespace, storage class and exact HTTPS origins. It creates random server secrets once and retains them on subsequent runs. No credentials are printed or stored in Git.

```sh
python3 scripts/deploy_kubernetes.py \
  --namespace sn-labs-bettywhitec7 --tag 4c2af33 \
  --origin https://bettywhitec7-8000.theiadockernext-0-labs-prod-theiak8s-4-tor01.proxy.cognitiveclass.ai \
  --sentiment-url https://best-cars-sentiment.2gjtwx6eao4a.us-south.codeengine.appdomain.cloud \
  --skip-network-policies --ephemeral-lab-storage
kubectl rollout status deployment/best-cars-web
kubectl rollout status deployment/best-cars-mongo
kubectl rollout status deployment/best-cars-api
kubectl port-forward --address 0.0.0.0 service/best-cars-web 8000:8000
```

Open port 8000 through Skills Network's **Launch Application** panel. The HTTPS proxy supplies the public application URL. Only use `TRUST_PROXY=1` behind this trusted proxy or an ingress that overwrites forwarding headers.

### Actual lab restrictions

This course's Kubernetes service account cannot create NetworkPolicy objects. Its quota permits a `skills-network-learner` storage class, but the cluster reports that class does not exist; other storage classes have zero quota. The two explicit flags above select the supported demonstration setup:

- `--ephemeral-lab-storage` uses `emptyDir` volumes. Container restarts retain data; replacing a Django or MongoDB pod discards that pod's database. The local Docker Compose environment uses persistent volumes.
- `--skip-network-policies` omits optional network policies. MongoDB and Express use internal ClusterIP services; only Django is port-forwarded. Express write requests require a server-only secret. MongoDB contains sample public dealership data and fictional demonstration reviews, so do not put real customer data in this restricted lab setup.

For a cluster with persistent storage and NetworkPolicy permissions, omit both flags and pass a valid `--storage-class`. Review namespace-specific UID and filesystem-group requirements before adapting the manifest to OpenShift. The included security context targets this Kubernetes lab, not every OpenShift namespace.

Django migrations and catalog seeding run at startup. The single Django replica and Recreate strategy avoid sharing SQLite across replicas. Create a superuser inside the running container with `python manage.py createsuperuser` if needed.

The lab's external URLs and resources are temporary. A production deployment would additionally require PostgreSQL, authenticated MongoDB, backups, rate limiting and monitoring.
