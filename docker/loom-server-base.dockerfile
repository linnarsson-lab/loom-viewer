# docker build -t gcr.io/linnarsson-lab/loom-server-base:v1 -f docker/loom-server-base.dockerfile .
# gcloud docker push gcr.io/linnarsson-lab/loom-server-base:v1
FROM continuumio/anaconda
RUN export DEBIAN_FRONTEND=noninteractive
RUN apt-get -y install build-essential
ADD python/requirements.txt /python/requirements.txt
ADD cache/ /python/cache/
RUN pip install -r python/requirements.txt


