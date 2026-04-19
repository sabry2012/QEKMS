# ── Stage 1: Build ─────────────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

RUN mkdir -p /tmp && chmod 777 /tmp

# Install system build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libc-dev \
    python3-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ───────────────────────────────────────────────────
FROM python:3.11-slim AS runner

# Create a non-privileged user
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appgroup && useradd -r -g appgroup -u 1001 appuser

WORKDIR /app

# Copy only installed packages from builder
COPY --from=builder /root/.local /home/appuser/.local
COPY src/ ./src/
COPY requirements.txt .

# Set environment variables for the non-root user
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV TMPDIR=/tmp
ENV TEMP=/tmp
ENV TMP=/tmp
ENV XDG_CACHE_HOME=/tmp/.cache
ENV MPLCONFIGDIR=/tmp/matplotlib
ENV SERVER_EC_KEY_PATH=/app/keys/server_ec_private.pem

# Create required directories and set ownership
RUN mkdir -p logs uploads keys /tmp \
    && chmod 1777 /tmp \
    && chown -R appuser:appgroup /app

# Hardening: Run as non-root
USER appuser

# Hardening: Export port
EXPOSE 8000

# Healthcheck for container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health', timeout=3).read()" || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
