# home-rest-api

Central API server for controlling stuff at home

TODO: Figure out K3s + Prometheus for monitoring and React DOM (no Nextjs) for webpage control panel

## Dependencies

| Software | Package Name | Version |
| ------------- | ------------- | ------------- |
| [Node.js](https://nodejs.org/en) | `node` | `>=v18.*.*` |

Node package versions in `package.json`

Install binaries

```bash
sudo apt install fping wakeonlan

```

If using Digital Ocean for a VPS like in this project, follow the [doctl docs](https://docs.digitalocean.com/reference/doctl/) for info on installing `doctl`

If using Docker for remote container management (like remote Minecraft server control), follow the [official docker script instructions](https://get.docker.com) for info on installing `docker`

## Deployment

Clone the repo:

```bash
git clone https://github.com/KevinFham/home-rest-api.git
cd home-rest-api
pnpm install
```

Set up nginx proxy to route `http://<HOST_NAME>/api` traffic to port `<PORT>`

```bash
# Startup nginx if it isn't already
sudo systemctl enable nginx.service
sudo systemctl start nginx.service

# Edit api-server.conf, change $HOST_NAME to the machine's hostname and $PORT to the port that this server will listen to
cp nginx-config/example-api-server.conf nginx-config/api-server.conf

# Link to nginx
sudo ln -s <ABSOLUTE_PATH_TO_API_SERVER_CONF> /etc/nginx/sites-available/
sudo ln -s <ABSOLUTE_PATH_TO_API_SERVER_CONF> /etc/nginx/sites-enabled/
sudo nginx -s reload 
```

Rename `.example-env` to `.env` and set all values. Rename `example-config.yml` to `config.yml` and set all values.

### Configure `config.yml`

`machines` - Register of all LAN devices acessible to the server

`mcServer` - Values assume the server runs a [`docker-minecraft-server`](https://github.com/itzg/docker-minecraft-server) container.

`vps` - Assumes using Digital Ocean for VPS

### Configure remote `docker` control

TODO:

### PM2 Deployment

Build and daemonize the server:

```bash
pnpm run build
pnpm run deploy
```

The server will run on the port `SERVER_PORT` specified by `.env`

### Dockerfile Deployment

TODO:

## APIs
See `http://localhost:<SERVER_PORT>/api-docs` for further documentation

`/api/machine` - LAN Device control

`/api/mc-server` - Minecraft Server home control

`/api/vps` - Virtual Private Server remote control
