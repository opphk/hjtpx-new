#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

DEPLOYMENT_ID="${1:-}"
TARGET_VERSION="${2:-}"

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
    log_info "Checking prerequisites for rollback..."
    
    if [ ! -d "$PROJECT_ROOT/backups" ]; then
        log_error "No backups directory found"
        exit 1
    fi
    
    LATEST_BACKUP=$(ls -t "$PROJECT_ROOT/backups" | head -1)
    if [ -z "$LATEST_BACKUP" ]; then
        log_error "No backup files found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

get_latest_backup() {
    ls -t "$PROJECT_ROOT/backups" | head -1
}

list_available_backups() {
    log_info "Available backups:"
    ls -1t "$PROJECT_ROOT/backups" | head -10
}

confirm_rollback() {
    log_warning "========================================="
    log_warning "  WARNING: Rollback Operation"
    log_warning "========================================="
    log_warning "This will revert the system to a previous version."
    log_warning "Current changes may be lost."
    log_warning ""
    
    if [ -n "$TARGET_VERSION" ]; then
        log_info "Target version: $TARGET_VERSION"
        log_info "Target backup: $TARGET_VERSION"
    else
        local latest_backup=$(get_latest_backup)
        log_info "Latest backup will be used: $latest_backup"
    fi
    
    log_warning "========================================="
    
    read -p "Are you sure you want to proceed with rollback? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_error "Rollback cancelled"
        exit 0
    fi
}

backup_current_state() {
    log_info "Backing up current state before rollback..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    PRE_ROLLBACK_DIR="$PROJECT_ROOT/backups/pre_rollback_$TIMESTAMP"
    mkdir -p "$PRE_ROLLBACK_DIR"
    
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        cp -r "$PROJECT_ROOT/node_modules" "$PRE_ROLLBACK_DIR/" 2>/dev/null || true
    fi
    
    cp -r "$PROJECT_ROOT/src" "$PRE_ROLLBACK_DIR/" 2>/dev/null || true
    cp "$PROJECT_ROOT/.env"* "$PRE_ROLLBACK_DIR/" 2>/dev/null || true
    
    log_success "Current state backed up to: $PRE_ROLLBACK_DIR"
}

restore_from_backup() {
    local backup_file=$1
    
    log_info "Restoring from backup: $backup_file"
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" down || true
    
    rm -rf "$PROJECT_ROOT/src" 2>/dev/null || true
    
    tar -xzf "$PROJECT_ROOT/backups/$backup_file" -C "$PROJECT_ROOT"
    
    log_success "Backup restored successfully"
}

rollback_docker_services() {
    log_info "Rolling back Docker services..."
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" pull
    
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d
    
    log_success "Docker services rolled back"
}

check_rollback_health() {
    log_info "Checking rollback health..."
    
    MAX_ATTEMPTS=30
    ATTEMPT=0
    
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if curl -f http://localhost:3000/health &> /dev/null; then
            log_success "Rollback health check passed"
            return 0
        fi
        
        ATTEMPT=$((ATTEMPT + 1))
        log_info "Health check attempt $ATTEMPT/$MAX_ATTEMPTS..."
        sleep 2
    done
    
    log_error "Health check failed after rollback"
    return 1
}

restore_dependencies() {
    log_info "Restoring dependencies..."
    
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        npm ci --production
    fi
    
    log_success "Dependencies restored"
}

notify_rollback() {
    local status=$1
    
    log_info "Sending rollback notification..."
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"Rollback $status at $(date)\"}" \
            2>/dev/null || true
    fi
}

rollback_complete() {
    local backup_used=$1
    
    log_success "========================================="
    log_success "  Rollback Completed Successfully"
    log_success "========================================="
    log_info "Backup used: $backup_used"
    log_info "Time: $(date)"
    log_info ""
    log_info "Next steps:"
    log_info "1. Verify the application is working correctly"
    log_info "2. Check logs for any errors"
    log_info "3. Run tests to ensure functionality"
    log_info "4. Monitor for any issues"
    log_success "========================================="
}

rollback_failed() {
    local error=$1
    
    log_error "========================================="
    log_error "  Rollback Failed!"
    log_error "========================================="
    log_error "Error: $error"
    log_error ""
    log_error "Manual intervention may be required."
    log_error "Check logs at: $PROJECT_ROOT/logs"
    log_error "========================================="
    
    notify_rollback "FAILED: $error"
    
    exit 1
}

main() {
    log_info "========================================="
    log_info "  Rollback Script Starting"
    log_info "========================================="
    
    if [ "$1" = "list" ]; then
        list_available_backups
        exit 0
    fi
    
    check_prerequisites
    
    if [ -z "$TARGET_VERSION" ]; then
        TARGET_VERSION=$(get_latest_backup)
    fi
    
    if [ ! -f "$PROJECT_ROOT/backups/$TARGET_VERSION" ]; then
        log_error "Backup not found: $TARGET_VERSION"
        list_available_backups
        exit 1
    fi
    
    confirm_rollback
    
    backup_current_state
    
    if ! restore_from_backup "$TARGET_VERSION"; then
        rollback_failed "Failed to restore from backup"
    fi
    
    restore_dependencies
    
    if ! rollback_docker_services; then
        rollback_failed "Failed to restart Docker services"
    fi
    
    if ! check_rollback_health; then
        rollback_failed "Health check failed after rollback"
    fi
    
    rollback_complete "$TARGET_VERSION"
    
    notify_rollback "SUCCESSFUL"
}

trap 'rollback_failed "Script interrupted"' INT TERM

if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [DEPLOYMENT_ID] [TARGET_VERSION]"
    echo ""
    echo "Options:"
    echo "  list              List available backups"
    echo "  DEPLOYMENT_ID     Specific deployment to rollback from"
    echo "  TARGET_VERSION    Specific backup version to restore"
    echo ""
    echo "Examples:"
    echo "  $0                              # Rollback to latest backup"
    echo "  $0 backup_20230515_120000.tar.gz  # Rollback to specific backup"
    echo "  $0 list                         # List available backups"
    exit 0
fi

main "$@"
