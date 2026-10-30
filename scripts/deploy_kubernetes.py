"""Deploy this demonstration into the selected, pre-authorized lab namespace."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import secrets
import subprocess
from urllib.parse import urlparse


def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--namespace", required=True)
parser.add_argument("--tag", required=True)
parser.add_argument("--origin", required=True)
parser.add_argument("--sentiment-url", required=True)
parser.add_argument("--storage-class", default="skills-network-learner")
parser.add_argument("--skip-network-policies", action="store_true",
                    help="For restricted course clusters that deny NetworkPolicy creation.")
parser.add_argument("--ephemeral-lab-storage", action="store_true",
                    help="Use emptyDir when the course cluster has no usable storage class.")
options = parser.parse_args()
for value in (options.namespace, options.tag, options.storage_class):
    if not re.fullmatch(r"[A-Za-z0-9._-]+", value):
        parser.error("Namespace, tag and storage class must be simple identifiers.")
origin = urlparse(options.origin)
sentiment = urlparse(options.sentiment_url)
for url in (origin, sentiment):
    if (url.scheme != "https" or not url.hostname or url.username or url.password
            or url.path not in ("", "/") or url.query or url.fragment):
        parser.error("Supply HTTPS origins without credentials, paths or queries.")
command = ["kubectl", "--namespace", options.namespace]


def apply(document):
    run(*command, "apply", "-f", "-", input=json.dumps(document))


# Generate only on the first deployment. Never print or rotate existing secrets.
existing = run(*command, "get", "secret", "best-cars-secrets", "--ignore-not-found",
               "-o", "name", capture_output=True).stdout.strip()
if not existing:
    apply({"apiVersion": "v1", "kind": "Secret",
           "metadata": {"name": "best-cars-secrets"}, "type": "Opaque",
           "stringData": {"DJANGO_SECRET_KEY": secrets.token_urlsafe(48),
                          "REVIEW_API_KEY": secrets.token_urlsafe(48)}})
config = {"apiVersion": "v1", "kind": "ConfigMap",
          "metadata": {"name": "best-cars-config"}, "data": {
           "DJANGO_DEBUG": "0", "DJANGO_ALLOWED_HOSTS": origin.hostname + ",localhost",
           "DJANGO_CSRF_TRUSTED_ORIGINS": options.origin.rstrip("/"),
           "BACKEND_URL": "http://best-cars-api:3030",
           "SENTIMENT_URL": options.sentiment_url.rstrip("/"),
           "TRUST_PROXY": "1"}}
apply(config)
config_hash = hashlib.sha256(json.dumps(config["data"], sort_keys=True).encode()).hexdigest()
manifest = (Path(__file__).resolve().parents[1] / "server/deployment.yaml").read_text()
for placeholder, value in {"REPLACE_NAMESPACE": options.namespace,
                           "REPLACE_TAG": options.tag,
                           "REPLACE_CONFIG_HASH": config_hash,
                           "REPLACE_STORAGE_CLASS": options.storage_class}.items():
    manifest = manifest.replace(placeholder, value)
if options.ephemeral_lab_storage:
    manifest = "\n---\n".join(
        document for document in manifest.split("\n---\n")
        if "kind: PersistentVolumeClaim\n" not in document)
    for claim in ("best-cars-django-data", "best-cars-mongo-data"):
        manifest = manifest.replace(
            "persistentVolumeClaim:\n            claimName: " + claim, "emptyDir: {}")
    print("Lab storage is temporary: replacing a pod discards its database.")
run(*command, "apply", "-f", "-", input=manifest)
if not options.skip_network_policies:
    policy = Path(__file__).resolve().parents[1] / "server/network-policies.yaml"
    run(*command, "apply", "-f", str(policy))
else:
    print("Lab restriction: backend Services remain cluster-internal; NetworkPolicies omitted.")
print("Applied. Check rollout status; port-forward best-cars-web to lab port 8000.")
