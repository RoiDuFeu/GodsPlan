#!/bin/bash
# 
# DEPLOY_CLUSTERING.sh
# Automated deployment script for map clustering implementation
#
# Usage:
#   ./DEPLOY_CLUSTERING.sh [--dry-run] [--rollback]
#
# Options:
#   --dry-run   : Show what would be done without making changes
#   --rollback  : Restore original files from .legacy backups
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_DIR="$SCRIPT_DIR/web"
SRC_DIR="$WEB_DIR/src"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DRY_RUN=false
ROLLBACK=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --rollback)
      ROLLBACK=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $arg${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
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

# Check if we're in the right directory
if [[ ! -f "$WEB_DIR/package.json" ]]; then
  log_error "Not in GodsPlan project root. Expected web/package.json to exist."
  exit 1
fi

# ══════════════════════════════════════════════════════════════════════
# ROLLBACK MODE
# ══════════════════════════════════════════════════════════════════════
if [[ "$ROLLBACK" == true ]]; then
  log_warning "Rolling back to original (non-clustered) implementation..."
  
  # Restore from .legacy backups
  if [[ -f "$SRC_DIR/components/Map.legacy.tsx" ]]; then
    cp "$SRC_DIR/components/Map.legacy.tsx" "$SRC_DIR/components/Map.tsx"
    log_success "Restored Map.tsx"
  else
    log_warning "No Map.legacy.tsx backup found"
  fi
  
  if [[ -f "$SRC_DIR/components/admin/ChurchesMap.legacy.tsx" ]]; then
    cp "$SRC_DIR/components/admin/ChurchesMap.legacy.tsx" "$SRC_DIR/components/admin/ChurchesMap.tsx"
    log_success "Restored ChurchesMap.tsx"
  else
    log_warning "No ChurchesMap.legacy.tsx backup found"
  fi
  
  if [[ -f "$SRC_DIR/lib/mapUtils.legacy.ts" ]]; then
    cp "$SRC_DIR/lib/mapUtils.legacy.ts" "$SRC_DIR/lib/mapUtils.ts"
    log_success "Restored mapUtils.ts"
  else
    log_warning "No mapUtils.legacy.ts backup found"
  fi
  
  log_success "Rollback complete. Restart dev server to see changes."
  exit 0
fi

# ══════════════════════════════════════════════════════════════════════
# DEPLOYMENT MODE
# ══════════════════════════════════════════════════════════════════════

log_info "Starting map clustering deployment..."

# Step 1: Check if clustered versions exist
log_info "Step 1: Checking for clustered implementation files..."
MISSING_FILES=false

if [[ ! -f "$SRC_DIR/components/Map.clustered.tsx" ]]; then
  log_error "Map.clustered.tsx not found"
  MISSING_FILES=true
fi

if [[ ! -f "$SRC_DIR/components/admin/ChurchesMap.clustered.tsx" ]]; then
  log_error "ChurchesMap.clustered.tsx not found"
  MISSING_FILES=true
fi

if [[ ! -f "$SRC_DIR/lib/mapUtils.clustered.ts" ]]; then
  log_error "mapUtils.clustered.ts not found"
  MISSING_FILES=true
fi

if [[ "$MISSING_FILES" == true ]]; then
  log_error "Missing required clustered implementation files. Aborting."
  exit 1
fi

log_success "All clustered files found"

# Step 2: Install dependencies
log_info "Step 2: Installing clustering dependencies..."

if [[ "$DRY_RUN" == true ]]; then
  log_info "[DRY RUN] Would run: npm install leaflet.markercluster @types/leaflet.markercluster react-leaflet-cluster"
else
  cd "$WEB_DIR"
  npm install leaflet.markercluster @types/leaflet.markercluster react-leaflet-cluster || {
    log_error "Failed to install dependencies"
    exit 1
  }
  log_success "Dependencies installed"
fi

# Step 3: Backup existing files
log_info "Step 3: Backing up current implementation..."

backup_file() {
  local src=$1
  local dest="${src%.tsx}.legacy.tsx"
  dest="${dest%.ts}.legacy.ts"
  
  if [[ -f "$src" ]]; then
    if [[ "$DRY_RUN" == true ]]; then
      log_info "[DRY RUN] Would backup: $src -> $dest"
    else
      cp "$src" "$dest"
      log_success "Backed up: $(basename "$src")"
    fi
  else
    log_warning "File not found (skip backup): $src"
  fi
}

backup_file "$SRC_DIR/components/Map.tsx"
backup_file "$SRC_DIR/components/admin/ChurchesMap.tsx"
backup_file "$SRC_DIR/lib/mapUtils.ts"

# Step 4: Deploy clustered versions
log_info "Step 4: Deploying clustered implementations..."

deploy_file() {
  local src=$1
  local dest=$2
  
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would deploy: $src -> $dest"
  else
    cp "$src" "$dest"
    log_success "Deployed: $(basename "$dest")"
  fi
}

deploy_file "$SRC_DIR/components/Map.clustered.tsx" "$SRC_DIR/components/Map.tsx"
deploy_file "$SRC_DIR/components/admin/ChurchesMap.clustered.tsx" "$SRC_DIR/components/admin/ChurchesMap.tsx"
deploy_file "$SRC_DIR/lib/mapUtils.clustered.ts" "$SRC_DIR/lib/mapUtils.ts"

# Step 5: Summary
log_info "═══════════════════════════════════════════════════════════"
log_success "Map clustering deployment complete!"
log_info "═══════════════════════════════════════════════════════════"
echo ""
log_info "Next steps:"
echo "  1. Restart your dev server: npm run dev"
echo "  2. Test with varying church counts (10, 50, 200, 1000)"
echo "  3. Verify clustering behavior at different zoom levels"
echo "  4. Check both user map and admin map"
echo ""
log_info "To rollback:"
echo "  ./DEPLOY_CLUSTERING.sh --rollback"
echo ""
log_info "Deployment log saved to: deployment-$(date +%Y%m%d-%H%M%S).log"

if [[ "$DRY_RUN" == true ]]; then
  echo ""
  log_warning "This was a DRY RUN. No files were modified."
  log_info "Run without --dry-run to apply changes."
fi
