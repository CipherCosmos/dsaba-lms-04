#!/bin/bash

# DSABA LMS Kubernetes Monitoring Script
# This script provides comprehensive monitoring of the deployed application

set -e

# Configuration
NAMESPACE="dsaba-lms"

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
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed."
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        log_error "Unable to connect to Kubernetes cluster."
        exit 1
    fi
}

# Show cluster status
show_cluster_status() {
    log_info "Cluster Status:"
    echo "==============="
    kubectl cluster-info
    echo ""
    kubectl get nodes
    echo ""
}

# Show namespace status
show_namespace_status() {
    log_info "Namespace Status ($NAMESPACE):"
    echo "================================"
    kubectl get all -n $NAMESPACE
    echo ""
}

# Show pod status with details
show_pod_status() {
    log_info "Pod Status:"
    echo "============"

    # Get all pods with detailed status
    kubectl get pods -n $NAMESPACE -o wide --show-labels

    echo ""
    log_info "Pod Details:"
    echo "============="

    # Show pod status details
    PODS=$(kubectl get pods -n $NAMESPACE --no-headers -o custom-columns=":metadata.name")

    for POD in $PODS; do
        echo "Pod: $POD"
        STATUS=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.phase}')
        READY=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
        RESTARTS=$(kubectl get pod $POD -n $NAMESPACE -o jsonpath='{.status.containerStatuses[0].restartCount}')

        echo "  Status: $STATUS | Ready: $READY | Restarts: $RESTARTS"

        # Show recent logs if pod is not ready
        if [ "$READY" != "True" ]; then
            log_warning "Pod $POD is not ready. Recent logs:"
            kubectl logs $POD -n $NAMESPACE --tail=10 --timestamps
        fi
        echo ""
    done
}

# Show resource usage
show_resource_usage() {
    log_info "Resource Usage:"
    echo "================"

    # Show node resource usage
    echo "Node Resources:"
    kubectl top nodes 2>/dev/null || echo "Metrics server not available for node metrics"

    echo ""
    echo "Pod Resources:"
    kubectl top pods -n $NAMESPACE 2>/dev/null || echo "Metrics server not available for pod metrics"

    echo ""
    echo "Persistent Volume Claims:"
    kubectl get pvc -n $NAMESPACE
    echo ""
}

# Check service health
check_service_health() {
    log_info "Service Health Checks:"
    echo "======================="

    # Backend health check
    echo "Backend Health:"
    BACKEND_PODS=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-backend --no-headers -o custom-columns=":metadata.name")

    for POD in $BACKEND_PODS; do
        echo -n "  $POD: "
        if kubectl exec -n $NAMESPACE $POD -- curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Healthy${NC}"
        else
            echo -e "${RED}✗ Unhealthy${NC}"
        fi
    done

    # Frontend health check
    echo ""
    echo "Frontend Health:"
    FRONTEND_PODS=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-frontend --no-headers -o custom-columns=":metadata.name")

    for POD in $FRONTEND_PODS; do
        echo -n "  $POD: "
        if kubectl exec -n $NAMESPACE $POD -- wget --quiet --tries=1 --spider http://localhost/ > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Healthy${NC}"
        else
            echo -e "${RED}✗ Unhealthy${NC}"
        fi
    done

    # Database connectivity check
    echo ""
    echo "Database Connectivity:"
    BACKEND_POD=$(kubectl get pods -n $NAMESPACE -l app=dsaba-lms-backend -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ ! -z "$BACKEND_POD" ]; then
        echo -n "  Backend to Postgres: "
        if kubectl exec -n $NAMESPACE $BACKEND_POD -- python -c "
import os
import psycopg2
try:
    conn = psycopg2.connect(
        host='dsaba-lms-postgres',
        database=os.environ.get('POSTGRES_DB'),
        user=os.environ.get('POSTGRES_USER'),
        password=os.environ.get('POSTGRES_PASSWORD')
    )
    conn.close()
    print('Connected')
except Exception as e:
    print(f'Failed: {e}')
    exit(1)
" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Connected${NC}"
        else
            echo -e "${RED}✗ Failed${NC}"
        fi
    fi

    echo ""
}

# Show ingress status
show_ingress_status() {
    log_info "Ingress Status:"
    echo "==============="
    kubectl get ingress -n $NAMESPACE
    echo ""

    # Show ingress details
    INGRESS=$(kubectl get ingress -n $NAMESPACE --no-headers -o custom-columns=":metadata.name" 2>/dev/null)
    if [ ! -z "$INGRESS" ]; then
        kubectl describe ingress $INGRESS -n $NAMESPACE
    fi
    echo ""
}

# Show autoscaling status
show_autoscaling_status() {
    log_info "Autoscaling Status:"
    echo "===================="
    kubectl get hpa -n $NAMESPACE
    echo ""

    # Show HPA details
    HPA=$(kubectl get hpa -n $NAMESPACE --no-headers -o custom-columns=":metadata.name" 2>/dev/null)
    if [ ! -z "$HPA" ]; then
        kubectl describe hpa $HPA -n $NAMESPACE
    fi
    echo ""
}

# Show recent events
show_recent_events() {
    log_info "Recent Events (last 30 minutes):"
    echo "==================================="
    kubectl get events -n $NAMESPACE --sort-by='.lastTimestamp' | tail -20
    echo ""
}

# Continuous monitoring mode
continuous_monitoring() {
    log_info "Starting continuous monitoring (Ctrl+C to stop)..."
    echo "Press Ctrl+C to stop monitoring"
    echo ""

    while true; do
        clear
        echo "DSABA LMS Monitoring Dashboard - $(date)"
        echo "========================================"
        echo ""

        show_pod_status
        show_resource_usage
        check_service_health

        echo "Refreshing in 30 seconds... (Ctrl+C to stop)"
        sleep 30
    done
}

# Main monitoring function
main() {
    check_prerequisites

    if [ "$CONTINUOUS" = "true" ]; then
        continuous_monitoring
    else
        show_cluster_status
        show_namespace_status
        show_pod_status
        show_resource_usage
        check_service_health
        show_ingress_status
        show_autoscaling_status
        show_recent_events
    fi
}

# Handle command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --continuous|-c)
            CONTINUOUS=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --continuous, -c    Continuous monitoring mode"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main