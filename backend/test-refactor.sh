#!/bin/bash

# GodsPlan Scraper Refactor - Test Script
# Usage: ./test-refactor.sh [phase]
# Phases: fixtures | memory | staging | full

set -e

echo "🌟 GodsPlan Scraper Refactor Test Script"
echo "========================================"
echo ""

PHASE="${1:-help}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if in correct directory
if [ ! -f "package.json" ]; then
    error "Not in backend directory. Please cd to GodsPlan/backend"
    exit 1
fi

# Check if dependencies installed
if [ ! -d "node_modules" ]; then
    warning "Dependencies not installed. Running npm install..."
    npm install
fi

# Phase: Help
if [ "$PHASE" == "help" ]; then
    echo "Usage: ./test-refactor.sh [phase]"
    echo ""
    echo "Phases:"
    echo "  fixtures  - Test with fixtures (no real scraping)"
    echo "  memory    - Test for memory leaks"
    echo "  staging   - Test on staging with limited scope"
    echo "  full      - Full production scrape"
    echo "  install   - Install required dependencies"
    echo ""
    echo "Examples:"
    echo "  ./test-refactor.sh fixtures"
    echo "  ./test-refactor.sh memory"
    echo ""
    exit 0
fi

# Phase: Install
if [ "$PHASE" == "install" ]; then
    info "Installing dependencies..."
    
    if ! npm list p-limit &>/dev/null; then
        npm install p-limit
        success "Installed p-limit"
    else
        success "p-limit already installed"
    fi
    
    if ! npm list --dev jest &>/dev/null; then
        warning "Test dependencies not installed"
        echo "Install with: npm install --save-dev jest @types/jest ts-jest"
    else
        success "Test dependencies installed"
    fi
    
    success "All dependencies ready"
    exit 0
fi

# Phase: Fixtures
if [ "$PHASE" == "fixtures" ]; then
    info "Testing with fixtures (no real scraping)..."
    echo ""
    
    info "Building TypeScript..."
    npm run build || {
        error "Build failed. Fix TypeScript errors first."
        exit 1
    }
    
    success "Build successful"
    echo ""
    
    info "Running scraper with fixtures (limit 5)..."
    npm run scrape -- --fixtures --google-only --limit 5 || {
        error "Scraper failed with fixtures"
        exit 1
    }
    
    success "Fixtures test passed!"
    echo ""
    success "✅ Phase 1 (fixtures) complete"
    echo ""
    info "Next: ./test-refactor.sh memory"
    exit 0
fi

# Phase: Memory
if [ "$PHASE" == "memory" ]; then
    info "Testing for memory leaks..."
    echo ""
    
    # Check if --expose-gc is available
    if ! node --expose-gc --version &>/dev/null; then
        error "Node.js doesn't support --expose-gc flag"
        exit 1
    fi
    
    info "Building TypeScript..."
    npm run build || {
        error "Build failed"
        exit 1
    }
    
    success "Build successful"
    echo ""
    
    warning "Running with heap snapshots (this may take a while)..."
    echo ""
    
    # Run with garbage collection exposed
    node --expose-gc --max-old-space-size=512 dist/scrapers/index.js \
        --fixtures --google-only --limit 10 || {
        error "Memory test failed"
        exit 1
    }
    
    success "Memory test passed!"
    echo ""
    info "Check logs for memory usage patterns"
    info "Peak memory should be <400 MB"
    echo ""
    success "✅ Phase 2 (memory) complete"
    echo ""
    info "Next: ./test-refactor.sh staging"
    exit 0
fi

# Phase: Staging
if [ "$PHASE" == "staging" ]; then
    info "Running staging test (limited scope)..."
    echo ""
    
    # Confirm with user
    warning "This will scrape REAL data (limit 10 churches)"
    read -p "Continue? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Aborted by user"
        exit 0
    fi
    
    info "Building TypeScript..."
    npm run build || {
        error "Build failed"
        exit 1
    }
    
    success "Build successful"
    echo ""
    
    info "Running scraper with Google enrichment (limit 10)..."
    npm run scrape -- --google-only --limit 10 || {
        error "Staging test failed"
        exit 1
    }
    
    success "Staging test passed!"
    echo ""
    info "Review GOOGLE_ENRICHMENT_REPORT.md for results"
    echo ""
    success "✅ Phase 3 (staging) complete"
    echo ""
    info "Next: ./test-refactor.sh full (production-ready)"
    exit 0
fi

# Phase: Full
if [ "$PHASE" == "full" ]; then
    info "Running FULL production scrape..."
    echo ""
    
    # Strong warning
    error "⚠️  WARNING: This will scrape ALL churches (no limit)"
    warning "Estimated time: ~15 minutes"
    warning "Memory usage: ~350 MB peak"
    warning "API calls: ~400+ requests"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Aborted by user"
        exit 0
    fi
    
    info "Building TypeScript..."
    npm run build || {
        error "Build failed"
        exit 1
    }
    
    success "Build successful"
    echo ""
    
    info "Starting full scrape with messes.info + Google enrichment..."
    echo ""
    
    START_TIME=$(date +%s)
    
    npm run scrape -- --with-messes || {
        error "Full scrape failed"
        exit 1
    }
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    MINUTES=$((DURATION / 60))
    SECONDS=$((DURATION % 60))
    
    success "Full scrape completed!"
    echo ""
    info "Duration: ${MINUTES}m ${SECONDS}s"
    info "Report: GOOGLE_ENRICHMENT_REPORT.md"
    echo ""
    success "✅ Phase 4 (full) complete - Production Ready!"
    exit 0
fi

# Unknown phase
error "Unknown phase: $PHASE"
echo ""
echo "Usage: ./test-refactor.sh [phase]"
echo "Run './test-refactor.sh help' for available phases"
exit 1
