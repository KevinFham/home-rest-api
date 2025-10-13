FROM node:20.19.4-alpine3.22
WORKDIR /app
ARG NODE_ENV=production

RUN echo "Installing binary dependencies..." \
    && apk add fping awake openssh doctl \
    && echo "awake \"\$@\"" > /usr/sbin/wakeonlan \
    && chmod +x /usr/sbin/wakeonlan

COPY src/ ./src
RUN mkdir ./build && find ./src/ -name '*.yml' -exec cp --parents -t ./build {} \; && mv ./build/src/* ./build && rmdir ./build/src
COPY \@types/ ./\@types
COPY package*.json ./
COPY tsconfig.json ./

RUN echo "Installing Node dependencies..." \
    && npm install -g pnpm \
    && npm add -g ts-patch typescript \
    && pnpm install

RUN echo "Building application..." \
    && ts-patch install -s \
    && tspc -p ./tsconfig.json

CMD ["node", "/app/build/main.js"]
