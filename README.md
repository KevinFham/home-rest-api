# home-rest-api

Central API server for controlling stuff at home

TODO: Figure out K3s + Prometheus for monitoring and React DOM (no Nextjs) for webpage control panel

## Dependencies

| Software | Package Name | Version |
| ------------- | ------------- | ------------- |
| [Node.js](https://nodejs.org/en) | `node` | `>=v18.*.*` |

Node package versions in `package.json`

## Deployment

Clone the repo:

```bash
git clone https://github.com/KevinFham/home-rest-api.git
cd home-rest-api
pnpm install
```

Rename `.example-env` to `.env` and set all values. Rename `example-config.yml` to `config.yml` and set all values.

### Configuration

`mcServer`

Values assume the server runs a [`docker-minecraft-server`](https://github.com/itzg/docker-minecraft-server) container.

### Deploy

Build and daemonize the server:

```bash
pnpm run build
pnpm run deploy
```

The server will run on the port `SERVER_PORT` specified by `.env`

## APIs

`/api/mc-server` - Minecraft Server home control

`/api/vps` - Virtual Private Server remote control
