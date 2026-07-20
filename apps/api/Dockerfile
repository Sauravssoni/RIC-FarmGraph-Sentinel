# FarmGraph Rakshak demo API — single-node demo image.
# All data is SIMULATED; SQLite demo persistence lives at FGR_DB_PATH.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    FGR_DB_PATH=/data/fgr.db

WORKDIR /srv
COPY apps/api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# The repository reads seed + reference data from the repo root.
COPY apps/api/app ./app
COPY data ./data

RUN mkdir -p /data
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python3 -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/api/v1/health', timeout=2)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
