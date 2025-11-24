#!/bin/bash

# DSABA LMS Kubernetes Deployment Script
# This script deploys the entire application to a Kubernetes cluster

set -e

# Configuration
NAMESPACE="dsaba-lms"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-your-registry.com}"
BACKEND_IMAGE="${DOCKER_REGISTRY}/dsaba-lms-backend:${TAG:-latest}"
FRONTEND_IMAGE="${DOCKER_REGISTRY}/dsaba-lms-frontend:${TAG:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install it first."
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        log_error "docker is not installed. Please install it first."
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Unable to connect to Kubernetes cluster."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create namespace
create_namespace() {
    log_info "Creating namespace: $NAMESPACE"
    kubectl apply -f k8s/namespace.yaml
    log_success "Namespace created"
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."

    # Build backend image
    log_info "Building backend image: $BACKEND_IMAGE"
    docker build -t "$BACKEND_IMAGE" ./backend
    docker push "$BACKEND_IMAGE"

    # Build frontend image
    log_info "Building frontend image: $FRONTEND_IMAGE"
    docker build -t "$FRONTEND_IMAGE" ./frontend
    docker push "$FRONTEND_IMAGE"

    log_success "Images built and pushed"
}

# Update image tags in Kubernetes manifests
update_image_tags() {
    log_info "Updating image tags in Kubernetes manifests..."

    # Update backend deployment
    sed -i.bak "s|dsaba-lms-backend:latest|$BACKEND_IMAGE|g" k8s/backend-deployment.yaml
    sed -i.bak "s|dsaba-lms-backend:latest|$BACKEND_IMAGE|g" k8s/celery-deployment.yaml

    # Update frontend deployment
    sed -i.bak "s|dsaba-lms-frontend:latest|$FRONTEND_IMAGE|g" k8s/frontend-deployment.yaml

    log_success "Image tags updated"
}

# Deploy infrastructure components
deploy_infrastructure() {
    log_info "Deploying infrastructure components..."

    # ConfigMap and Secret
    kubectl apply -f k8s/configmap.yaml
    kubectl apply -f k8s/secret.yaml

    # Persistent Volume Claims
    kubectl apply -f k8s/pvc.yaml

    # PostgreSQL
    kubectl apply -f k8s/postgres-deployment.yaml
    log_info "Waiting for PostgreSQL to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/dsaba-lms-postgres -n $NAMESPACE

    # Redis
    kubectl apply -f k8s/redis-deployment.yaml
    log_info "Waiting for Redis to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/dsaba-lms-redis -n $NAMESPACE

    log_success "Infrastructure deployed"
}

# Deploy application components
deploy_application() {
    log_info "Deploying application components..."

    # Backend
    kubectl apply -f k8s/backend-deployment.yaml
    log_info "Waiting for backend to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/dsaba-lms-backend -n $NAMESPACE

    # Celery workers
    kubectl apply -f k8s/celery-deployment.yaml

    # Frontend
    kubectl apply -f k8s/frontend-deployment.yaml
    log_info "Waiting for frontend to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/dsaba-lms-frontend -n $NAMESPACE

    log_success "Application deployed"
}

# Deploy autoscaling
deploy_autoscaling() {
    log_info "Deploying autoscaling rules..."
    kubectl apply -f k8s/hpa.yaml
    log_success "Autoscaling deployed"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # Wait for backend to be fully ready
    sleep 30

    # Run migrations using a job
    cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-${TAG:-latest}
  namespace: $NAMESPACE
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: $BACKEND_IMAGE
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

    # Wait for migration job to complete
    log_info "Waiting for database migration to complete..."
    kubectl wait --for=condition=complete --timeout=300s job/db-migration-${TAG:-latest} -n $NAMESPACE

    # Clean up migration job
    kubectl delete job db-migration-${TAG:-latest} -n $NAMESPACE

    log_success "Database migrations completed"
}

# Health check
health_check() {
    log_info "Performing health checks..."

    # Check backend health
    BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-backend -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n $NAMESPACE $BACKEND_POD -- curl -f http://localhost:8000/health

    # Check frontend health
    FRONTEND_POD=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-frontend -o jsonpath='{.items[0].metadata.name}')
    kubectl exec -n $NAMESPACE $FRONTEND_POD -- wget --quiet --tries=1 --spider http://localhost/

    log_success "Health checks passed"
}

# Show deployment status
show_status() {
    log_info "Deployment status:"
    echo ""
    kubectl get all -n $NAMESPACE
    echo ""
    log_info "Ingress resources:"
    kubectl get ingress -n $NAMESPACE
}

# Main deployment function
main() {
    log_info "Starting DSABA LMS deployment to Kubernetes"
    echo "Namespace: $NAMESPACE"
    echo "Backend Image: $BACKEND_IMAGE"
    echo "Frontend Image: $FRONTEND_IMAGE"
    echo ""

    check_prerequisites
    create_namespace

    if [ "$SKIP_BUILD" != "true" ]; then
        build_and_push_images
    fi

    update_image_tags
    deploy_infrastructure
    deploy_application
    deploy_autoscaling
    run_migrations
    health_check
    show_status

    log_success "DSABA LMS deployment completed successfully!"
    log_info "Application should be available at:"
    log_info "  Frontend: https://your-domain.com"
    log_info "  API: https://api.your-domain.com/api/v1"
    log_info "  Health: https://api.your-domain.com/health"
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --tag=*)
            TAG="${1#*=}"
            shift
            ;;
        --registry=*)
            DOCKER_REGISTRY="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-build     Skip building and pushing Docker images"
            echo "  --tag=TAG        Docker image tag (default: latest)"
            echo "  --registry=REG   Docker registry URL"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Update image variables after parsing arguments
BACKEND_IMAGE="${DOCKER_REGISTRY}/dsaba-lms-backend:${TAG:-latest}"
FRONTEND_IMAGE="${DOCKER_REGISTRY}/dsaba-lms-frontend:${TAG:-latest}"

main