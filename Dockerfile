FROM nginx:alpine

RUN rm -rf /usr/share/nginx/html/*

# copiar los archivos del juego
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/

# configurar permisos
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
