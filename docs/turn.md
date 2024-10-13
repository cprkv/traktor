## Turn server

> Small guide on how to setup turn server

```bash
apt install coturn

mkdir /var/log/coturn
chown -R turnserver:turnserver /var/log/coturn
chmod u+x /etc/turnserver
```

Setup coturn: [`/etc/turnserver.conf`](./turnserver.conf)
  ```bash
  mkdir /etc/turnserver
  chown -R turnserver:turnserver /etc/turnserver
  chmod u+x /etc/turnserver
  ```

Modify `coturn.service`:
  ```ini
  ExecStart=/usr/bin/turnserver -c /etc/turnserver.conf --pidfile=
  ```

Make domain and bind to server. Make server ports public:
- range: `49152`-`65535`
- `3478`
- `5349`

Make sertificates:
  ```bash
  certbot certonly --standalone --preferred-challenges http -d TURN_DOMAIN
  ```
Make deploy hook: [`/etc/letsencrypt/renewal-hooks/deploy/coturn_deploy_hook`](./coturn_deploy_hook)
  ```bash
  chmod +x /etc/letsencrypt/renewal-hooks/deploy/coturn_deploy_hook
  chmod 0755 /etc/letsencrypt/renewal-hooks/deploy/coturn_deploy_hook
  ```
