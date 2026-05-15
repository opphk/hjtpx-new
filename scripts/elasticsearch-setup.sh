#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ES_VERSION="${ELASTICSEARCH_VERSION:-8.15.0}"
ES_HOME="${ES_HOME:-./elasticsearch}"
ES_PORT="${ES_PORT:-9200}"
ES_CLUSTER_NAME="${ES_CLUSTER_NAME:-hjtpx-cluster}"
ES_NODE_NAME="${ES_NODE_NAME:-hjtpx-node-1}"
ES_HEAP_SIZE="${ES_HEAP_SIZE:-2g}"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Elasticsearch Setup Script${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo "Version: $ES_VERSION"
echo "Port: $ES_PORT"
echo "Cluster: $ES_CLUSTER_NAME"
echo ""

download_elasticsearch() {
    echo -e "${YELLOW}Downloading Elasticsearch...${NC}"
    
    if [ -d "$ES_HOME" ]; then
        echo -e "${YELLOW}Elasticsearch directory already exists. Removing...${NC}"
        rm -rf "$ES_HOME"
    fi
    
    mkdir -p "$ES_HOME"
    
    local DOWNLOAD_URL="https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-${ES_VERSION}-linux-x86_64.tar.gz"
    
    echo "Downloading from: $DOWNLOAD_URL"
    
    if command -v curl &> /dev/null; then
        curl -L -o "$ES_HOME/elasticsearch.tar.gz" "$DOWNLOAD_URL" --progress-bar
    elif command -v wget &> /dev/null; then
        wget -O "$ES_HOME/elasticsearch.tar.gz" "$DOWNLOAD_URL" --show-progress
    else
        echo -e "${RED}Error: curl or wget is required to download Elasticsearch${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Extracting Elasticsearch...${NC}"
    tar -xzf "$ES_HOME/elasticsearch.tar.gz" -C "$ES_HOME"
    mv "$ES_HOME/elasticsearch-${ES_VERSION}"/* "$ES_HOME/"
    rm -f "$ES_HOME/elasticsearch.tar.gz"
    
    echo -e "${GREEN}Elasticsearch downloaded and extracted successfully!${NC}"
}

configure_elasticsearch() {
    echo -e "${YELLOW}Configuring Elasticsearch...${NC}"
    
    local ES_CONFIG="$ES_HOME/config/elasticsearch.yml"
    
    cat > "$ES_CONFIG" << EOF
cluster.name: $ES_CLUSTER_NAME
node.name: $ES_NODE_NAME
node.roles: master,data,ingest
path.data: $ES_HOME/data
path.logs: $ES_HOME/logs
path.repo: $ES_HOME/backup
network.host: 127.0.0.1
http.port: $ES_PORT
transport.port: 9300
discovery.type: single-node
xpack.security.enabled: true
xpack.security.enrollment.enabled: true
xpack.security.http.ssl:
  enabled: false
xpack.security.transport.ssl:
  enabled: false
bootstrap.memory_lock: true
action.destructive_requires_name: true
indices.lifecycle.poll_interval: 1m
EOF

    local ES_JVM_CONFIG="$ES_HOME/config/jvm.options.d/jvm.options"
    mkdir -p "$ES_HOME/config/jvm.options.d"
    
    cat > "$ES_JVM_CONFIG" << EOF
-Xms$ES_HEAP_SIZE
-Xmx$ES_HEAP_SIZE
-XX:+UseG1GC
-XX:G1ReservePercent=25
-XX:InitiatingHeapOccupancyPercent=30
-XX:MaxGCPauseMillis=500
-Djava.io.tmpdir=\${ES_TEMP_DIR}
-XX:+HeapDumpOnOutOfMemoryError
-XX:+ExitOnOutOfMemoryError
-XX:HeapDumpPath=$ES_HOME/logs/heap_dump.hprof
-XX:ErrorFile=$ES_HOME/logs/hs_err_pid%p.log
EOF

    mkdir -p "$ES_HOME/data" "$ES_HOME/logs" "$ES_HOME/backup"
    chmod 755 "$ES_HOME/data" "$ES_HOME/logs" "$ES_HOME/backup"
    
    echo -e "${GREEN}Elasticsearch configured successfully!${NC}"
}

start_elasticsearch() {
    echo -e "${YELLOW}Starting Elasticsearch...${NC}"
    
    if pgrep -f "elasticsearch" > /dev/null; then
        echo -e "${YELLOW}Elasticsearch is already running. Stopping...${NC}"
        stop_elasticsearch
    fi
    
    mkdir -p "$ES_HOME/data" "$ES_HOME/logs"
    chown -R $(whoami) "$ES_HOME" 2>/dev/null || true
    
    export ES_JAVA_HOME="$ES_HOME/jdk"
    export ES_PATH_CONF="$ES_HOME/config"
    
    if [ -d "$ES_HOME/jdk" ]; then
        "$ES_HOME/bin/elasticsearch" -d -p "$ES_HOME/es.pid"
    else
        if command -v java &> /dev/null; then
            ES_JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java))))
            export ES_JAVA_HOME
            "$ES_HOME/bin/elasticsearch" -d -p "$ES_HOME/es.pid"
        else
            echo -e "${RED}Error: Java is not installed or JAVA_HOME is not set${NC}"
            exit 1
        fi
    fi
    
    echo "Waiting for Elasticsearch to start..."
    sleep 10
    
    for i in {1..30}; do
        if curl -s "http://127.0.0.1:$ES_PORT" > /dev/null 2>&1; then
            echo -e "${GREEN}Elasticsearch started successfully!${NC}"
            return 0
        fi
        echo "Waiting... ($i/30)"
        sleep 2
    done
    
    echo -e "${RED}Elasticsearch failed to start within timeout${NC}"
    return 1
}

stop_elasticsearch() {
    echo -e "${YELLOW}Stopping Elasticsearch...${NC}"
    
    if [ -f "$ES_HOME/es.pid" ]; then
        kill $(cat "$ES_HOME/es.pid") 2>/dev/null || true
        rm -f "$ES_HOME/es.pid"
    fi
    
    pkill -f "elasticsearch" 2>/dev/null || true
    
    echo -e "${GREEN}Elasticsearch stopped${NC}"
}

check_elasticsearch() {
    echo -e "${YELLOW}Checking Elasticsearch status...${NC}"
    
    local STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$ES_PORT" 2>/dev/null || echo "000")
    
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}Elasticsearch is running!${NC}"
        echo ""
        curl -s "http://127.0.0.1:$ES_PORT/_cluster/health?pretty" | head -20
        return 0
    else
        echo -e "${RED}Elasticsearch is not responding (HTTP $STATUS)${NC}"
        return 1
    fi
}

install_plugins() {
    echo -e "${YELLOW}Installing Elasticsearch plugins...${NC}"
    
    local plugins=(
        "analysis-icu"
        "analysis-pinyin"
    )
    
    for plugin in "${plugins[@]}"; do
        echo "Installing $plugin..."
        "$ES_HOME/bin/elasticsearch-plugin" install --batch "$plugin" 2>/dev/null || \
            echo "Plugin $plugin may already be installed or installation failed"
    done
    
    echo -e "${GREEN}Plugins installed${NC}"
}

generate_passwords() {
    echo -e "${YELLOW}Generating security passwords...${NC}"
    
    if [ -f "$ES_HOME/bin/elasticsearch-setup-passwords" ]; then
        "$ES_HOME/bin/elasticsearch-setup-passwords" auto --batch 2>/dev/null || \
            echo "Password setup may require manual configuration"
    fi
}

create_indices() {
    echo -e "${YELLOW}Creating Elasticsearch indices...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Node.js is required to create indices${NC}"
        return 1
    fi
    
    node -e "
        const { indexManager } = require('./config/elasticsearch/index-manager');
        async function init() {
            try {
                await indexManager.initializeAllIndices();
                console.log('Indices created successfully');
            } catch (e) {
                console.error('Failed to create indices:', e.message);
                process.exit(1);
            }
        }
        init();
    "
}

usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  download     Download and extract Elasticsearch"
    echo "  configure    Configure Elasticsearch"
    echo "  install      Download and configure Elasticsearch"
    echo "  start        Start Elasticsearch"
    echo "  stop         Stop Elasticsearch"
    echo "  restart      Restart Elasticsearch"
    echo "  status       Check Elasticsearch status"
    echo "  plugins       Install Elasticsearch plugins"
    echo "  indices       Create indices"
    echo "  setup         Full setup (download + configure + install plugins + create indices)"
    echo "  help          Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  ELASTICSEARCH_VERSION   Elasticsearch version (default: 8.15.0)"
    echo "  ES_HOME                 Installation directory (default: ./elasticsearch)"
    echo "  ES_PORT                 HTTP port (default: 9200)"
    echo "  ES_HEAP_SIZE            JVM heap size (default: 2g)"
}

case "$1" in
    download)
        download_elasticsearch
        ;;
    configure)
        configure_elasticsearch
        ;;
    install)
        download_elasticsearch
        configure_elasticsearch
        ;;
    start)
        start_elasticsearch
        ;;
    stop)
        stop_elasticsearch
        ;;
    restart)
        stop_elasticsearch
        sleep 2
        start_elasticsearch
        ;;
    status)
        check_elasticsearch
        ;;
    plugins)
        install_plugins
        ;;
    indices)
        create_indices
        ;;
    setup)
        download_elasticsearch
        configure_elasticsearch
        install_plugins
        create_indices
        start_elasticsearch
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        usage
        exit 1
        ;;
esac
