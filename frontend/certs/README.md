# RoboPulse local HTTPS certificate

This directory is mounted into the frontend nginx container as `/etc/nginx/certs`.
The container generates a local CA and a server certificate on startup when they
are missing.

For mobile camera access, open the app through HTTPS:

```text
https://<LAN_IP>:8443
```

If the LAN IP changes, delete the generated `.crt` and `.key` files, update
`ROBO_PULSE_HTTPS_HOSTS`, then recreate the frontend container.

Install `robopulse.local-ca.crt` on mobile devices as a trusted CA if the browser
does not allow camera access after accepting the self-signed certificate warning.
