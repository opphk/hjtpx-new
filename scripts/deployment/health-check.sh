#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

CHECK_INTERVAL="${CHECK_INTERVAL:-30}"
MAX_RESPONSE_TIME=5000

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICES=(
    "http://localhost:3000"
    "http://localhost:3001"
)

log_info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')][INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')][SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')][WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')][ERROR]${NC} $1"
}

check_service() {
    local url=$1
    local service_name=$2
    
    local start_time=$(date +%s%3N)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
        if [ $response_time -le $MAX_RESPONSE_TIME ]; then
            log_success "$service_name: OK (HTTP $http_code, ${response_time}ms)"
            return 0
        else
            log_warning "$service_name: SLOW (HTTP $http_code, ${response_time}ms)"
            return 1
        fi
    else
        log_error "$service_name: FAIL (HTTP $http_code)"
        return 2
    fi
}

check_database() {
    log_info "Checking database connection..."
    
    if command -v psql &> /dev/null; then
        if PGPASSWORD="$DB_PASSWORD" psql -h "${DB_HOST:-localhost}" -U "${DB_USER:-postgres}" -d "${DB_NAME:-hjtpx}" -c "SELECT 1" &> /dev/null; then
            log_success "Database: OK"
            return 0
        else
            log_error "Database: FAIL"
            return 1
        fi
    else
        log_warning "PostgreSQL client not found, skipping database check"
        return 0
    fi
}

check_redis() {
    log_info "Checking Redis connection..."
    
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h "${REDIS_HOST:-localhost}" -p "${REDIS_PORT:-6379}" ping &> /dev/null; then
            log_success "Redis: OK"
            return 0
        else
            log_error "Redis: FAIL"
            return 1
        fi
    else
        log_warning "Redis client not found, skipping Redis check"
        return 0
    fi
}

check_docker_containers() {
    log_info "Checking Docker containers..."
    
    if ! command -v docker &> /dev/null; then
        log_warning "Docker not found, skipping container check"
        return 0
    fi
    
    local running_containers=$(docker ps --format "{{.Names}}" 2>/dev/null | wc -l)
    
    if [ $running_containers -gt 0 ]; then
        log_success "Docker containers: OK ($running_containers running)"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        return 0
    else
        log_warning "No running Docker containers"
        return 1
    fi
}

check_disk_space() {
    log_info "Checking disk space..."
    
    local usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -lt 80 ]; then
        log_success "Disk space: OK ($usage% used)"
        return 0
    elif [ "$usage" -lt 90 ]; then
        log_warning "Disk space: WARNING ($usage% used)"
        return 1
    else
        log_error "Disk space: CRITICAL ($usage% used)"
        return 2
    fi
}

check_memory() {
    log_info "Checking memory usage..."
    
    if command -v free &> /dev/null; then
        local usage=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
        
        if [ "$usage" -lt 70 ]; then
            log_success "Memory: OK ($usage% used)"
            return 0
        elif [ "$usage" -lt 85 ]; then
            log_warning "Memory: WARNING ($usage% used)"
            return 1
        else
            log_error "Memory: CRITICAL ($usage% used)"
            return 2
        fi
    else
        log_warning "free command not found, skipping memory check"
        return 0
    fi
}

check_cpu() {
    log_info "Checking CPU usage..."
    
    if command -v top &> /dev/null; then
        local usage=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\100/" | awk '{printf "%.0f", 100 - $1}')
        
        if [ "$usage" -lt 70 ]; then
            log_success "CPU: OK ($usage% used)"
            return 0
        elif [ "$usage" -lt 90 ]; then
            log_warning "CPU: WARNING ($usage% used)"
            return 1
        else
            log_error "CPU: CRITICAL ($usage% used)"
            return 2
        fi
    else
        log_warning "top command not found, skipping CPU check"
        return 0
    fi
}

check_ssl_certificates() {
    log_info "Checking SSL certificates..."
    
    if [ -d "/etc/letsencrypt/live" ]; then
        for cert in /etc/letsencrypt/live/*/fullchain.pem; do
            if [ -f "$cert" ]; then
                local expiry=$(openssl x509 -enddate -noout -in "$cert" 2>/dev/null | cut -d= -f2)
                local expiry_epoch=$(date -d "$expiry" +%s 2>/dev/null || echo "9999999999")
                local current_epoch=$(date +%s)
                local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
                
                if [ $days_until_expiry -lt 0 ]; then
                    log_error "SSL Certificate EXPIRED: $cert"
                elif [ $days_until_expiry -lt 30 ]; then
                    log_warning "SSL Certificate expires in $days_until_expiry days: $cert"
                else
                    log_success "SSL Certificate OK ($days_until_expiry days until expiry): $cert"
                fi
            fi
        done
    else
        log_warning "No SSL certificates found in /etc/letsencrypt/live"
    fi
}

check_log_errors() {
    log_info "Checking recent error logs..."
    
    if [ -d "$PROJECT_ROOT/logs" ]; then
        local recent_errors=$(find "$PROJECT_ROOT/logs" -name "*.log" -mtime -1 -exec grep -l "ERROR" {} \; 2>/dev/null | wc -l)
        
        if [ $recent_errors -eq 0 ]; then
            log_success "No recent error logs found"
        else
            log_warning "Found $recent_errors log files with ERROR level"
        fi
    else
        log_warning "Logs directory not found"
    fi
}

check_dependencies() {
    log_info "Checking service dependencies..."
    
    local all_healthy=true
    
    for service in "${SERVICES[@]}"; do
        if ! check_service "$service/health" "$(basename $service)" > /dev/null 2>&1; then
            all_healthy=false
        fi
    done
    
    if $all_healthy; then
        log_success "All service dependencies are healthy"
        return 0
    else
        log_warning "Some service dependencies are unhealthy"
        return 1
    fi
}

run_health_check() {
    local overall_status=0
    
    log_info "========================================="
    log_info "  Starting Health Check"
    log_info "========================================="
    
    check_service "http://localhost:3000/health" "Main Service"
    ((overall_status += $?))
    
    echo ""
    
    check_database
    ((overall_status += $?))
    
    echo ""
    
    check_redis
    ((overall_status += $?))
    
    echo ""
    
    check_docker_containers
    ((overall_status += $?))
    
    echo ""
    
    check_disk_space
    ((overall_status += $?))
    
    echo ""
    
    check_memory
    ((overall_status += $?))
    
    echo ""
    
    check_cpu
    ((overall_status += $?))
    
    echo ""
    
    check_ssl_certificates
    ((overall_status += $?))
    
    echo ""
    
    check_log_errors
    ((overall_status += $?))
    
    echo ""
    
    check_dependencies
    ((overall_status += $?))
    
    echo ""
    
    log_info "========================================="
    if [ $overall_status -eq 0 ]; then
        log_success "  Overall Status: HEALTHY"
    elif [ $overall_status -le 3 ]; then
        log_warning "  Overall Status: DEGRADED (issues: $overall_status)"
    else
        log_error "  Overall Status: UNHEALTHY (issues: $overall_status)"
    fi
    log_info "========================================="
    
    return $overall_status
}

continuous_monitoring() {
    log_info "Starting continuous health monitoring (interval: ${CHECK_INTERVAL}s)"
    log_info "Press Ctrl+C to stop"
    
    while true; do
        run_health_check
        sleep $CHECK_INTERVAL
    done
}

main() {
    case "${1:-single}" in
        single)
            run_health_check
            exit $?
            ;;
        continuous|monitor)
            continuous_monitoring
            ;;
        docker)
            check_docker_containers
            ;;
        services)
            for service in "${SERVICES[@]}"; do
                check_service "$service/health" "$(basename $service)"
            done
            ;;
        system)
            check_disk_space
            check_memory
            check_cpu
            ;;
        *)
            echo "Usage: $0 [single|continuous|docker|services|system]"
            echo ""
            echo "Options:"
            echo "  single      Run health check once (default)"
            echo "  continuous  Run continuous monitoring"
            echo "  docker      Check Docker containers"
            echo "  services    Check all service endpoints"
            echo "  system      Check system resources"
            exit 1
            ;;
    esac
}

trap 'log_info "Health check interrupted"; exit 0' INT TERM

main "$@"
