FROM mcr.microsoft.com/playwright:v1.61.1-noble

WORKDIR /work

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# config/config.json is gitignored/dockerignored (holds a dev's local overrides);
# fall back to the committed public-demo-credential template so the image runs standalone.
RUN cp config/config.example.json config/config.json

CMD ["npx", "playwright", "test"]
