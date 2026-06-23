#!/bin/sh
set -eu

CERT_DIR="${ROBO_PULSE_CERT_DIR:-/etc/nginx/certs}"
CERT_KEY="${ROBO_PULSE_SSL_KEY:-$CERT_DIR/robopulse.local.key}"
CERT_CRT="${ROBO_PULSE_SSL_CERT:-$CERT_DIR/robopulse.local.crt}"
CA_KEY="${ROBO_PULSE_CA_KEY:-$CERT_DIR/robopulse.local-ca.key}"
CA_CRT="${ROBO_PULSE_CA_CRT:-$CERT_DIR/robopulse.local-ca.crt}"
CERT_DAYS="${ROBO_PULSE_CERT_DAYS:-825}"
CA_DAYS="${ROBO_PULSE_CA_DAYS:-3650}"
CERT_HOSTS="${ROBO_PULSE_HTTPS_HOSTS:-localhost,127.0.0.1}"

mkdir -p "$CERT_DIR"

if [ -s "$CERT_KEY" ] && [ -s "$CERT_CRT" ] && [ -s "$CA_CRT" ]; then
  exit 0
fi

CA_CONF="$(mktemp)"
SERVER_CONF="$(mktemp)"
SERVER_CSR="$(mktemp)"
SERVER_LEAF="$(mktemp)"
trap 'rm -f "$CA_CONF" "$SERVER_CONF" "$SERVER_CSR" "$SERVER_LEAF"' EXIT

cat > "$CA_CONF" <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
x509_extensions = v3_ca

[req_distinguished_name]
CN = RoboPulse Local Development CA

[v3_ca]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical,CA:TRUE,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
EOF

cat > "$SERVER_CONF" <<'EOF'
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req

[req_distinguished_name]
CN = RoboPulse Local

[v3_req]
subjectAltName = @alt_names
keyUsage = critical,digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
basicConstraints = critical,CA:FALSE
subjectKeyIdentifier = hash

[alt_names]
EOF

if [ ! -s "$CA_KEY" ] || [ ! -s "$CA_CRT" ]; then
  openssl req \
    -x509 \
    -nodes \
    -days "$CA_DAYS" \
    -newkey rsa:2048 \
    -sha256 \
    -keyout "$CA_KEY" \
    -out "$CA_CRT" \
    -config "$CA_CONF"
fi

dns_index=1
ip_index=1
OLD_IFS="$IFS"
IFS=","
for raw_host in $CERT_HOSTS; do
  host="$(echo "$raw_host" | tr -d '[:space:]')"
  [ -n "$host" ] || continue

  case "$host" in
    *:*)
      echo "IP.$ip_index = $host" >> "$SERVER_CONF"
      ip_index=$((ip_index + 1))
      ;;
    *[!0-9.]*)
      echo "DNS.$dns_index = $host" >> "$SERVER_CONF"
      dns_index=$((dns_index + 1))
      ;;
    *)
      echo "IP.$ip_index = $host" >> "$SERVER_CONF"
      ip_index=$((ip_index + 1))
      ;;
  esac
done
IFS="$OLD_IFS"

openssl req \
  -nodes \
  -newkey rsa:2048 \
  -sha256 \
  -keyout "$CERT_KEY" \
  -out "$SERVER_CSR" \
  -config "$SERVER_CONF"

openssl x509 \
  -req \
  -in "$SERVER_CSR" \
  -CA "$CA_CRT" \
  -CAkey "$CA_KEY" \
  -CAcreateserial \
  -days "$CERT_DAYS" \
  -sha256 \
  -out "$SERVER_LEAF" \
  -extfile "$SERVER_CONF" \
  -extensions v3_req

cat "$SERVER_LEAF" "$CA_CRT" > "$CERT_CRT"

chmod 600 "$CERT_KEY" || true
chmod 600 "$CA_KEY" || true
chmod 644 "$CERT_CRT" || true
chmod 644 "$CA_CRT" || true
