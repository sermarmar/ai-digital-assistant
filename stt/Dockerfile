FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Usuario sin privilegios; /models es donde se guarda el modelo descargado (volumen)
RUN useradd --create-home stt && mkdir -p /models && chown stt /models
USER stt

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
