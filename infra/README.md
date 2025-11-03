### 🚀 Kubernetes 배포 (Deployment)

```bash
# docker 이미지 빌드
docker build -t trading-manage-app/backend-java:latest .
docker build -t trading-manage-app/backend-python:latest .
docker build -t trading-manage-app/frontend:latest .

# 1회 최초 설치
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# 클러스터에 서비스 배포
kubectl apply -f ./infra/
kubectl get pods
kubectl get ingress
```