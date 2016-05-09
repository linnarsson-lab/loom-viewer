# docker build -t gcr.io/linnarsson-lab/bregression:v1 -f docker/bregression.dockerfile .
# gcloud docker push gcr.io/linnarsson-lab/bregression:v1
# kubectl run bregression --image=gcr.io/linnarsson-lab/bregression:v1 --port=80
# kubectl expose deployment bregression --type="LoadBalancer"
FROM gcr.io/linnarsson-lab/loom-server-base:v1
ADD python/ /python/
ADD docker/loom-server.serviceaccount.json /loom-server.serviceaccount.json
EXPOSE 80
CMD GOOGLE_APPLICATION_CREDENTIALS="/loom-server.serviceaccount.json" python python/bregression.py
