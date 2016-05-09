FROM gcr.io/linnarsson-lab/loom-server:v1
CMD GOOGLE_APPLICATION_CREDENTIALS="/loom-server.serviceaccount.json" python python/loom_pipeline.py
