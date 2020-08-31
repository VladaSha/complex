# Build phase #
FROM node:alpine
WORKDIR '/app'
COPY package*.json ./
RUN npm install
COPY . .
# /app/build #
RUN npm run build

# Run phase #
FROM nginx
EXPOSE 3000
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
