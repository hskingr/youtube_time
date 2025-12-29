FROM nginx:stable-alpine
COPY . /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/nginx.conf
# COPY health-check.conf /etc/nginx/conf.d/health-check.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
