FROM node:22-bookworm-slim AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend ./
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 DJANGO_DB_PATH=/data/db.sqlite3
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY djangoapp ./djangoapp
COPY djangoproj ./djangoproj
COPY manage.py entrypoint.sh ./
COPY frontend/static ./frontend/static
COPY --from=frontend /frontend/build ./frontend/build
RUN DJANGO_DEBUG=1 python manage.py collectstatic --noinput && \
    mkdir /data && chgrp -R 0 /data /app && chmod -R g=u /data /app && \
    chmod +x /app/entrypoint.sh
USER 1001
EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "djangoproj.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", "--access-logfile", "-"]
