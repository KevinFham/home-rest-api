# home-rest-api

Central API server for controlling stuff at home

TODO: Figure out K3s (in tandem with Prometheus) for monitoring and React DOM (no Nextjs) for webpage control panel

## Dependencies

| Software | Package Name | Version |
| ------------- | ------------- | ------------- |
| [Node.js](https://nodejs.org/en) | `node` | `>=v18.*.*` |
| [Docker](https://www.docker.com) (Optional) | `docker` | `idk` |
| [Digital Ocean CLI](https://docs.digitalocean.com/reference/doctl/) (Optional) | `doctl` | `idk` |

> If using Digital Ocean for a VPS like in this project, follow the [doctl docs](https://docs.digitalocean.com/reference/doctl/) for info on installing `doctl`

> If using Docker for remote container management (like remote Minecraft server control), follow the [official docker script instructions](https://get.docker.com) for info on installing `docker`

### Install binaries

```bash
sudo apt install fping wakeonlan
```

# Configuration

Rename `.example-env` to `.env` and set all values. Rename `example-config.yml` to `config.yml` and set all values.

## Configure `config.yml`

`machines` - Register of all LAN devices acessible to the server

`mcServer` - Values assume the hosting server runs [`docker-minecraft-server`](https://github.com/itzg/docker-minecraft-server) container(s).

`vps` - Developed mainly using Digital Ocean for VPS control

## Configure `docker` control

> This project utilizes `docker context` to access containers of different machines, especially for Minecraft server control. 

> In `config.yml`, change the `serverHostName` fields (e.g., mcServer.serverHostName) to `'localhost'` and `tlsProtection` fields to `false` where container control is situated on the same machine as the API server.

Setting up docker access on a different host will depend on your needs. By default, the docker daemon will be accessed via TCP on port `2376`.

### Access Without TLS encryption 

Copy `openssl/expose-docker-socket.conf` to the docker hosting machine. 

Go into `config.yml` and set the related `tlsProtection` fields to `false`. Set the related `serverHostName` field to the hostname of the docker hosting machine.

```bash
# On the docker hosting machine
sudo cp expose-docker-socket.conf /etc/systemd/system/docker.service.d/expose-docker-socket.conf
sudo systemctl daemon-reload; sudo systemctl restart docker

# Allow traffic if using ufw
sudo ufw allow 2376
```

### Access With TLS encryption

Run the `openssl/gen-certs.sh` script to generate the certificates necessary for TLS. Copy these files to both the API server machine and docker hosting machine.

```bash
cd home-rest-api

# Generate certificates for both the API server and docker host
./openssl/gen-certs.sh -v <docker-machine-host-name>
# - OR -
# Generate certificates for multiple docker hosts
./openssl/gen-certs.sh -v <host-name-1> <host-name-2> <host-name-3>

# (OPTIONAL) Copy the API server certificate to another location (you'll have to modify config.yml accordingly)
#mkdir -p /usr/local/ssl
#cp ./openssl/ca-cert.pem /usr/local/ssl
#cp ./openssl/home-rest-api-cert.pem /usr/local/ssl
#cp ./openssl/home-rest-api-cert.key /usr/local/ssl

# Copy the Docker host machine certificate(s)
mkdir -p /usr/local/ssl
cp ./openssl/ca-cert.pem /usr/local/ssl
cp ./openssl/docker-<hostname>-cert.pem /usr/local/ssl
cp ./openssl/docker-<hostname>-cert.key /usr/local/ssl
```

Copy `openssl/expose-docker-socket-tls.conf` to the docker hosting machine. 

Go into `config.yml` and set the related `tlsProtection` fields to `true`. Set the related `serverHostName` field to the hostname of the docker hosting machine.

```bash
# On the docker hosting machine
sudo cp expose-docker-socket-tls.conf /etc/systemd/system/docker.service.d/expose-docker-socket-tls.conf     # Edit file paths and change <hostname> to the machine's hostname
sudo systemctl daemon-reload; sudo systemctl restart docker

# Allow traffic if using ufw
sudo ufw allow 2376
```

# Deployment

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

Follow the [Configuration](https://github.com/KevinFham/home-rest-api/tree/main?tab=readme-ov-file#configuration) instructions before continuing to deploy 

### PM2 Deployment

Build and daemonize the server:

```bash
pnpm run test
pnpm run build
pnpm run deploy
```

> The server will run on the port `SERVER_PORT` specified by `.env`

### Docker Compose Deployment

Either pull the latest build from the GitHub Container Repository:

```bash
sudo docker pull ghcr.io/kevinfham/home-rest-api:latest
sudo docker compose up -d
```

...or build the container yourself (you'll have to modify `docker-compose.yml`):
```bash
sudo docker build -t kevinfham:latest .
sudo docker compose up -d
```

# APIs
See `http://localhost:<SERVER_PORT>/api-docs` for further documentation

`/api/machine` - LAN Device control

`/api/mc-server` - Minecraft Server home control

`/api/vps` - Virtual Private Server remote control


# Resources

[OpenSSL Configuration Examples](https://www.ibm.com/docs/en/hpvs/1.2.x?topic=reference-openssl-configuration-examples)
