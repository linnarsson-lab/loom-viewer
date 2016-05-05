FROM gcr.io/linnarsson-lab/loom-server-base:v1
ADD python/*.py /python/
ADD static/ /python/static/
ADD docker/loom-server.serviceaccount.json /loom-server.serviceaccount.json
EXPOSE 80
CMD GOOGLE_APPLICATION_CREDENTIALS="/loom-server.serviceaccount.json" python python/loom_server.py
