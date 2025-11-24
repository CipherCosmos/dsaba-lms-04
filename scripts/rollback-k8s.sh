#!/bin/bash

# DSABA LMS Kubernetes Rollback Script
# This script rolls back the application to a previous version

set -e

# Configuration
NAMESPACE="dsaba-lms"
ROLLBACK_TAG="${ROLLBACK_TAG:-previous}"

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
        log_error "kubectl is not installed."
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Unable to connect to Kubernetes cluster."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Get current deployment information
get_current_deployment_info() {
    log_info "Getting current deployment information..."

    CURRENT_BACKEND_IMAGE=$(kubectl get deployment dsaba-lms-backend -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')
    CURRENT_FRONTEND_IMAGE=$(kubectl get deployment dsaba-lms-frontend -n $NAMESPACE -o jsonpath='{.spec.template.spec.containers[0].image}')

    log_info "Current backend image: $CURRENT_BACKEND_IMAGE"
    log_info "Current frontend image: $CURRENT_FRONTEND_IMAGE"
}

# Rollback backend deployment
rollback_backend() {
    log_info "Rolling back backend deployment..."

    # Get the previous revision
    kubectl rollout undo deployment/dsaba-lms-backend -n $NAMESPACE

    # Wait for rollout to complete
    kubectl rollout status deployment/dsaba-lms-backend -n $NAMESPACE --timeout=300s

    log_success "Backend rollback completed"
}

# Rollback frontend deployment
rollback_frontend() {
    log_info "Rolling back frontend deployment..."

    # Get the previous revision
    kubectl rollout undo deployment/dsaba-lms-frontend -n $NAMESPACE

    # Wait for rollout to complete
    kubectl rollout status deployment/dsaba-lms-frontend -n $NAMESPACE --timeout=300s

    log_success "Frontend rollback completed"
}

# Rollback Celery deployment
rollback_celery() {
    log_info "Rolling back Celery deployment..."

    kubectl rollout undo deployment/dsaba-lms-celery -n $NAMESPACE
    kubectl rollout status deployment/dsaba-lms-celery -n $NAMESPACE --timeout=300s

    kubectl rollout undo deployment/dsaba-lms-celery-beat -n $NAMESPACE
    kubectl rollout status deployment/dsaba-lms-celery-beat -n $NAMESPACE --timeout=300s

    log_success "Celery rollback completed"
}

# Health check after rollback
health_check() {
    log_info "Performing health checks after rollback..."

    # Wait a bit for services to stabilize
    sleep 30

    # Check backend health
    BACKEND_READY=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-backend -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -o "True" | wc -l)
    BACKEND_COUNT=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-backend --no-headers | wc -l)

    if [ "$BACKEND_READY" -eq "$BACKEND_COUNT" ]; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        exit 1
    fi

    # Check frontend health
    FRONTEND_READY=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-frontend -o jsonpath='{.items[*].status.conditions[?(@.type=="Ready")].status}' | grep -o "True" | wc -l)
    FRONTEND_COUNT=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-frontend --no-headers | wc -l)

    if [ "$FRONTEND_READY" -eq "$FRONTEND_COUNT" ]; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        exit 1
    fi
}

# Show rollback status
show_rollback_status() {
    log_info "Rollback status:"
    echo ""
    kubectl get deployments -n $NAMESPACE
    echo ""
    kubectl get pods -n $NAMESPACE
}

# Main rollback function
main() {
    log_info "Starting DSABA LMS rollback"
    echo "Namespace: $NAMESPACE"
    echo ""

    check_prerequisites
    get_current_deployment_info

    echo ""
    log_warning "This will rollback the application to the previous version."
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Rollback cancelled."
        exit 0
    fi

    rollback_backend
    rollback_frontend
    rollback_celery
    health_check
    show_rollback_status

    log_success "DSABA LMS rollback completed successfully!"
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --tag=*)
            ROLLBACK_TAG="${1#*=}"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --tag=TAG        Specific tag to rollback to (default: previous)"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main