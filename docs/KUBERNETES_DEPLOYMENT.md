# Kubernetes Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the DSABA LMS application to a Kubernetes cluster using the provided manifests and automation scripts.

## Prerequisites

### Required Tools
- `kubectl` configured to access your Kubernetes cluster
- `docker` for building and pushing images
- `helm` (optional, for advanced deployments)
- `kustomize` (optional, for manifest customization)

### Cluster Requirements
- Kubernetes 1.19+
- NGINX Ingress Controller installed
- cert-manager (for SSL certificates)
- Metrics Server (for HPA and monitoring)
- Storage class for persistent volumes

### Resource Requirements
- **CPU**: Minimum 4 cores, Recommended 8+ cores
- **Memory**: Minimum 8GB, Recommended 16GB+
- **Storage**: 100GB+ for database and logs

## Quick Start

### Automated Deployment

1. **Clone the repository and navigate to the project directory**
   ```bash
   git clone <repository-url>
   cd dsaba-lms-04
   ```

2. **Configure deployment settings**
   ```bash
   # Edit the deployment script variables or use command line options
   export DOCKER_REGISTRY="your-registry.com"
   export TAG="v1.0.0"
   ```

3. **Run the automated deployment**
   ```bash
   ./scripts/deploy-k8s.sh --registry=your-registry.com --tag=v1.0.0
   ```

4. **Monitor the deployment**
   ```bash
   ./scripts/monitor-k8s.sh
   ```

The deployment script will:
- Build and push Docker images
- Create Kubernetes resources
- Run database migrations
- Perform health checks
- Provide access URLs

## Manual Deployment

### Step 1: Build and Push Images

```bash
# Build backend image
docker build -t your-registry.com/dsaba-lms-backend:v1.0.0 ./backend
docker push your-registry.com/dsaba-lms-backend:v1.0.0

# Build frontend image
docker build -t your-registry.com/dsaba-lms-frontend:v1.0.0 ./frontend
docker push your-registry.com/dsaba-lms-frontend:v1.0.0
```

### Step 2: Update Image References

Update the image tags in the Kubernetes manifests:

```bash
# Update backend deployment
sed -i 's|dsaba-lms-backend:latest|your-registry.com/dsaba-lms-backend:v1.0.0|g' k8s/backend-deployment.yaml

# Update frontend deployment
sed -i 's|dsaba-lms-frontend:latest|your-registry.com/dsaba-lms-frontend:v1.0.0|g' k8s/frontend-deployment.yaml
```

### Step 3: Configure Secrets

Create the secrets with your actual values:

```bash
# Generate base64 encoded secrets
echo -n "your-jwt-secret-key" | base64
echo -n "your-database-password" | base64

# Update k8s/secret.yaml with the encoded values
```

### Step 4: Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy configuration
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml

# Deploy storage
kubectl apply -f k8s/pvc.yaml

# Deploy infrastructure
kubectl apply -f k8s/postgres-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# Wait for infrastructure
kubectl wait --for=condition=available --timeout=300s deployment/dsaba-lms-postgres -n dsaba-lms
kubectl wait --for=condition=available --timeout=300s deployment/dsaba-lms-redis -n dsaba-lms

# Deploy application
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/celery-deployment.yaml

# Deploy autoscaling
kubectl apply -f k8s/hpa.yaml
```

### Step 5: Run Database Migrations

```bash
# Create a migration job
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: dsaba-lms
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: your-registry.com/dsaba-lms-backend:v1.0.0
        command: ["alembic", "upgrade", "head"]
        envFrom:
        - configMapRef:
            name: dsaba-lms-config
        - secretRef:
            name: dsaba-lms-secrets
        env:
        - name: DATABASE_URL
          value: "postgresql://\$(POSTGRES_USER):\$(POSTGRES_PASSWORD)@dsaba-lms-postgres:5432/\$(POSTGRES_DB)"
      restartPolicy: Never
EOF

# Wait for migration to complete
kubectl wait --for=condition=complete --timeout=300s job/db-migration -n dsaba-lms
```

## Configuration

### Environment Variables

#### Application Configuration (ConfigMap)
- `APP_NAME`: Application name
- `APP_VERSION`: Application version
- `ENVIRONMENT`: Environment (production/staging)
- `LOG_LEVEL`: Logging level (INFO/DEBUG/WARNING/ERROR)

#### Database Configuration
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database username
- `DATABASE_URL`: Full database connection string

#### Security Configuration (Secrets)
- `JWT_SECRET_KEY`: JWT signing key (base64 encoded)
- `POSTGRES_PASSWORD`: Database password (base64 encoded)
- `CORS_ORIGINS`: Allowed CORS origins (base64 encoded)

### Domain Configuration

Update the ingress resources with your domain:

```yaml
# In k8s/backend-deployment.yaml and k8s/frontend-deployment.yaml
spec:
  rules:
  - host: api.your-domain.com  # Change this
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dsaba-lms-backend
            port:
              number: 8000
  - host: your-domain.com  # Change this
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dsaba-lms-frontend
            port:
              number: 80
```

## SSL/TLS Configuration

The deployment includes cert-manager annotations for automatic SSL certificates:

```yaml
annotations:
  cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

Ensure you have:
1. cert-manager installed in your cluster
2. A ClusterIssuer configured for Let's Encrypt
3. DNS records pointing to your ingress IP

## Monitoring and Observability

### Health Checks

The application includes comprehensive health checks:

- **Backend**: `/health` endpoint checks database connectivity
- **Frontend**: Nginx serves static files
- **Database**: PostgreSQL readiness probe
- **Cache**: Redis connectivity check

### Metrics and Monitoring

Enable metrics collection:

```bash
# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Use the monitoring script
./scripts/monitor-k8s.sh --continuous
```

### Logging

Application logs are available via:

```bash
# Backend logs
kubectl logs -f deployment/dsaba-lms-backend -n dsaba-lms

# Frontend logs
kubectl logs -f deployment/dsaba-lms-frontend -n dsaba-lms

# Database logs
kubectl logs -f deployment/dsaba-lms-postgres -n dsaba-lms
```

## Scaling

### Horizontal Pod Autoscaling

The deployment includes HPA configurations:

- **Backend**: Scales based on CPU (70%) and memory (80%) utilization
- **Frontend**: Scales based on CPU (60%) and memory (70%) utilization

### Manual Scaling

```bash
# Scale backend
kubectl scale deployment dsaba-lms-backend --replicas=5 -n dsaba-lms

# Scale frontend
kubectl scale deployment dsaba-lms-frontend --replicas=3 -n dsaba-lms
```

### Database Scaling

For high-traffic deployments, consider:

1. **Read Replicas**: Configure PostgreSQL read replicas
2. **Connection Pooling**: Use PgBouncer
3. **Caching**: Increase Redis resources

## Backup and Recovery

### Database Backup

```bash
# Create database backup
kubectl exec -n dsaba-lms deployment/dsaba-lms-postgres -- pg_dump -U postgres exam_management > backup.sql

# Backup to persistent volume (recommended)
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: db-backup
  namespace: dsaba-lms
spec:
  template:
    spec:
      containers:
      - name: backup
        image: postgres:15-alpine
        command:
        - /bin/sh
        - -c
        - |
          pg_dump -h dsaba-lms-postgres -U postgres exam_management > /backup/backup-$(date +%Y%m%d-%H%M%S).sql
        env:
        - name: PGPASSWORD
          valueFrom:
            secretKeyRef:
              name: dsaba-lms-secrets
              key: POSTGRES_PASSWORD
        volumeMounts:
        - name: backup-storage
          mountPath: /backup
      volumes:
      - name: backup-storage
        persistentVolumeClaim:
          claimName: backup-pvc
      restartPolicy: Never
EOF
```

### Application Rollback

```bash
# Rollback to previous version
./scripts/rollback-k8s.sh

# Or manually rollback deployments
kubectl rollout undo deployment/dsaba-lms-backend -n dsaba-lms
kubectl rollout undo deployment/dsaba-lms-frontend -n dsaba-lms
```

## Troubleshooting

### Common Issues

#### Pods Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n dsaba-lms

# Check logs
kubectl logs <pod-name> -n dsaba-lms

# Check events
kubectl get events -n dsaba-lms --sort-by='.lastTimestamp'
```

#### Database Connection Issues
```bash
# Check database pod
kubectl describe pod -l app=dsaba-lms-postgres -n dsaba-lms

# Test database connectivity
kubectl exec -it deployment/dsaba-lms-backend -n dsaba-lms -- python -c "
import psycopg2
import os
conn = psycopg2.connect(os.environ['DATABASE_URL'])
print('Database connected successfully')
"
```

#### Ingress Issues
```bash
# Check ingress status
kubectl describe ingress -n dsaba-lms

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Performance Issues

#### High CPU/Memory Usage
```bash
# Check resource usage
kubectl top pods -n dsaba-lms

# Check application metrics
kubectl exec deployment/dsaba-lms-backend -n dsaba-lms -- curl http://localhost:8000/metrics
```

#### Slow Database Queries
```bash
# Check database performance
kubectl exec deployment/dsaba-lms-postgres -n dsaba-lms -- psql -U postgres -d exam_management -c "SELECT * FROM pg_stat_activity;"

# Enable query logging in PostgreSQL config
```

## Security Considerations

### Network Security
- All services run in isolated namespace
- Network policies restrict pod-to-pod communication
- Ingress handles external access with TLS termination

### Secrets Management
- Use Kubernetes secrets for sensitive data
- Rotate secrets regularly
- Consider using external secret management (Vault, AWS Secrets Manager)

### Image Security
- Scan images for vulnerabilities before deployment
- Use minimal base images
- Keep images updated with security patches

## Maintenance

### Regular Tasks

#### Update Application
```bash
# Build new images
docker build -t your-registry.com/dsaba-lms-backend:v1.1.0 ./backend
docker push your-registry.com/dsaba-lms-backend:v1.1.0

# Update deployment
kubectl set image deployment/dsaba-lms-backend backend=your-registry.com/dsaba-lms-backend:v1.1.0 -n dsaba-lms

# Check rollout status
kubectl rollout status deployment/dsaba-lms-backend -n dsaba-lms
```

#### Database Maintenance
```bash
# Run VACUUM ANALYZE
kubectl exec deployment/dsaba-lms-postgres -n dsaba-lms -- psql -U postgres -d exam_management -c "VACUUM ANALYZE;"

# Check database size
kubectl exec deployment/dsaba-lms-postgres -n dsaba-lms -- psql -U postgres -d exam_management -c "SELECT pg_size_pretty(pg_database_size('exam_management'));"
```

#### Certificate Renewal
cert-manager handles automatic certificate renewal. Monitor certificate status:

```bash
kubectl get certificates -n dsaba-lms
kubectl describe certificate dsaba-lms-tls -n dsaba-lms
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review application logs
3. Check Kubernetes events
4. Contact the development team

## Appendix

### File Structure
```
k8s/
├── namespace.yaml              # Namespace definition
├── configmap.yaml              # Application configuration
├── secret.yaml                 # Sensitive configuration
├── pvc.yaml                    # Persistent volume claims
├── postgres-deployment.yaml    # PostgreSQL deployment
├── redis-deployment.yaml       # Redis deployment
├── backend-deployment.yaml     # Backend deployment
├── frontend-deployment.yaml    # Frontend deployment
├── celery-deployment.yaml      # Celery workers
└── hpa.yaml                    # Autoscaling rules

scripts/
├── deploy-k8s.sh              # Automated deployment
├── rollback-k8s.sh            # Rollback script
└── monitor-k8s.sh             # Monitoring script
```

### Resource Limits Reference

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Backend   | 250m        | 500m     | 512Mi          | 1Gi         |
| Frontend  | 100m        | 200m     | 128Mi          | 256Mi       |
| PostgreSQL| 250m        | 500m     | 512Mi          | 1Gi         |
| Redis     | 100m        | 200m     | 128Mi          | 256Mi       |
| Celery    | 100m        | 200m     | 256Mi          | 512Mi       |