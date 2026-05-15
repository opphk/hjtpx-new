#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

ENVIRONMENT="${1:-production}"
VERSION="${2:-latest}"
STRATEGY="${3:-rolling}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    if [ ! -f "$PROJECT_ROOT/.env.$ENVIRONMENT" ]; then
        log_warning "Environment file .env.$ENVIRONMENT not found, using .env"
    fi
    
    log_success "Prerequisites check passed"
}

backup_current_version() {
    log_info "Backing up current version..."
    
    BACKUP_DIR="$PROJECT_ROOT/backups"
    mkdir -p "$BACKUP_DIR"
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    
    tar -czf "$BACKUP_FILE" \
        -C "$PROJECT_ROOT" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='backups' \
        .
    
    log_success "Backup created: $BACKUP_FILE"
}

pull_artifacts() {
    log_info "Pulling artifacts for version $VERSION..."
    
    if command -v git &> /dev/null; then
        if [ "$VERSION" != "latest" ]; then
            git checkout "$VERSION" || {
                log_error "Failed to checkout version $VERSION"
                exit 1
            }
        else
            git pull origin main
        fi
    fi
    
    log_success "Artifacts pulled"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        npm ci --production
    fi
    
    log_success "Dependencies installed"
}

run_migrations() {
    log_info "Running database migrations..."
    
    if [ -f "$PROJECT_ROOT/scripts/migrate.js" ]; then
        node "$PROJECT_ROOT/scripts/migrate.js" up
    fi
    
    log_success "Migrations completed"
}

pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_warning "Service is already running on port 3000"
    fi
    
    if [ "$ENVIRONMENT" = "production" ]; then
        log_warning "Deploying to PRODUCTION environment"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi
    
    log_success "Pre-deployment checks passed"
}

deploy_using_strategy() {
    local strategy=$1
    
    case $strategy in
        rolling)
            deploy_rolling
            ;;
        blue_green)
            deploy_blue_green
            ;;
        canary)
            deploy_canary
            ;;
        *)
            log_error "Unknown deployment strategy: $strategy"
            exit 1
            ;;
    esac
}

deploy_rolling() {
    log_info "Deploying using rolling update strategy..."
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" down
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" build
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d
    
    log_success "Rolling deployment completed"
}

deploy_blue_green() {
    log_info "Deploying using blue-green strategy..."
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" -p "hjtpx-green" up -d
    
    sleep 10
    
    HEALTH_URL="http://localhost:3000/health"
    if curl -f "$HEALTH_URL" &> /dev/null; then
        log_success "New deployment healthy"
        
        docker-compose -p "hjtpx-blue" down || true
        
        docker-compose -p "hjtpx-blue" up -d
        
        docker-compose -p "hjtpx-green" down
    else
        log_error "Health check failed, rolling back..."
        docker-compose -p "hjtpx-green" down
        exit 1
    fi
    
    log_success "Blue-green deployment completed"
}

deploy_canary() {
    log_info "Deploying using canary strategy..."
    
    CANARY_REPLICAS="${CANARY_REPLICAS:-1}"
    TOTAL_REPLICAS="${TOTAL_REPLICAS:-5}"
    
    log_info "Deploying $CANARY_REPLICAS canary replicas out of $TOTAL_REPLICAS"
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d --scale app=$CANARY_REPLICAS
    
    sleep 15
    
    HEALTH_URL="http://localhost:3000/health"
    if curl -f "$HEALTH_URL" &> /dev/null; then
        log_info "Canary healthy, shifting all traffic..."
        
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d --scale app=$TOTAL_REPLICAS
    else
        log_error "Canary health check failed, rolling back..."
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" down
        exit 1
    fi
    
    log_success "Canary deployment completed"
}

health_check() {
    log_info "Running health checks..."
    
    MAX_ATTEMPTS=30
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if curl -f http://localhost:3000/health &> /dev/null; then
            log_success "Health check passed"
            return 0
        fi
        
        ATTEMPT=$((ATTEMPT + 1))
        log_info "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..."
        sleep 2
    done
    
    log_error "Health check failed after $MAX_ATTEMPTS attempts"
    return 1
}

post_deployment_tasks() {
    log_info "Running post-deployment tasks..."
    
    if [ -f "$PROJECT_ROOT/scripts/health-check.sh" ]; then
        bash "$PROJECT_ROOT/scripts/health-check.sh"
    fi
    
    log_success "Post-deployment tasks completed"
}

cleanup() {
    log_info "Cleaning up temporary files..."
    
    docker system prune -f
    
    log_success "Cleanup completed"
}

main() {
    log_info "========================================="
    log_info "  Deployment Script Starting"
    log_info "  Environment: $ENVIRONMENT"
    log_info "  Version: $VERSION"
    log_info "  Strategy: $STRATEGY"
    log_info "========================================="
    
    check_prerequisites
    backup_current_version
    pre_deployment_checks
    pull_artifacts
    install_dependencies
    run_migrations
    deploy_using_strategy "$STRATEGY"
    
    if health_check; then
        post_deployment_tasks
        cleanup
        log_success "========================================="
        log_success "  Deployment Successful!"
        log_success "========================================="
    else
        log_error "========================================="
        log_error "  Deployment Failed!"
        log_error "========================================="
        exit 1
    fi
}

trap 'log_error "Deployment interrupted"; exit 1' INT TERM

main
