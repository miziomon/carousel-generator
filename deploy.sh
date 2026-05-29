#!/bin/bash
# =============================================
# Script di Deploy per carousel-generator
# =============================================
#
# Questo script esegue:
# 1. Guardie git (branch, working tree pulito, allineamento con origin)
# 2. Creazione tag annotato v<version> da package.json (se assente)
# 3. Build di produzione (npm run build)
# 4. Scrittura dist/version.json con commit/tag/data
# 5. Upload della cartella dist via rsync/pscp su server remoto
#
# Configurazione:
# Le credenziali sono lette dal file .env (non committato su git).
# Variabili richieste nel .env:
#   DEPLOY_USER=username
#   DEPLOY_HOST=server.com
#   DEPLOY_PATH=/path/remoto
#   DEPLOY_PORT=22       (default: 22)
#   DEPLOY_PASSWORD=password
#   DEPLOY_URL=https://your-app.example.com  (opzionale)
#
# Uso:
#   ./deploy.sh                      # Deploy completo
#   ./deploy.sh --skip-build         # Salta build, solo upload
#   ./deploy.sh --no-git-checks      # Salta guardie git (emergenza)
#   ./deploy.sh --skip-build --no-git-checks
#
# Prerequisiti su Windows: Git Bash (fornisce bash, tar, ssh, rsync o pscp/plink via PuTTY)
#
# =============================================

# =============================================
# COLORI PER OUTPUT
# =============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

# =============================================
# FUNZIONI DI LOGGING
# =============================================
log_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Funzione per leggere variabili dal .env
get_env_value() {
    local key=$1
    local value=""

    if [ -f ".env" ]; then
        value=$(grep "^${key}=" .env | cut -d '=' -f2- | sed 's/^["'\'']\|["'\'']$//g')
    fi

    echo "$value"
}

# =============================================
# HEADER
# =============================================
echo ""
echo -e "${BLUE}=============================================${NC}"
echo -e "${BLUE}   carousel-generator — Deploy Script        ${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# =============================================
# PARSING FLAG
# =============================================
SKIP_BUILD=false
NO_GIT_CHECKS=false

for arg in "$@"; do
    case $arg in
        --skip-build)    SKIP_BUILD=true ;;
        --no-git-checks) NO_GIT_CHECKS=true ;;
    esac
done

[ "$SKIP_BUILD" = true ]    && log_warning "Flag --skip-build attivo: la build verrà saltata"
[ "$NO_GIT_CHECKS" = true ] && log_warning "Flag --no-git-checks attivo: le guardie git verranno saltate"

# =============================================
# STEP 0: GUARDIE GIT
# =============================================
if [ "$NO_GIT_CHECKS" = false ]; then
    log_info "Step 0/4: Verifica stato git..."

    # Verifica che siamo su main o master
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ $? -ne 0 ]; then
        log_error "Questo comando deve essere eseguito dalla root di un repository git."
        exit 1
    fi

    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        log_error "Branch corrente: '${CURRENT_BRANCH}'. Il deploy è consentito solo da main/master."
        echo -e "${YELLOW}  → Esegui: git checkout master${NC}"
        echo -e "${YELLOW}  → Oppure usa --no-git-checks per un deploy d'emergenza${NC}"
        exit 1
    fi

    # Verifica working tree pulito
    GIT_STATUS=$(git status --porcelain 2>/dev/null)
    if [ -n "$GIT_STATUS" ]; then
        log_error "Working tree non pulito. Committa o fai stash delle modifiche prima di deployare."
        echo ""
        git status --short
        echo ""
        echo -e "${YELLOW}  → Esegui: git stash  oppure  git commit -am 'messaggio'${NC}"
        exit 1
    fi

    # Verifica allineamento con origin (non bloccante: solo warning se offline)
    log_info "Recupero aggiornamenti da origin..."
    git fetch origin 2>/dev/null
    if [ $? -eq 0 ]; then
        LOCAL=$(git rev-parse HEAD)
        REMOTE=$(git rev-parse "@{u}" 2>/dev/null)
        if [ -n "$REMOTE" ] && [ "$LOCAL" != "$REMOTE" ]; then
            log_warning "Il branch locale non è allineato con origin. Considera 'git pull' prima di deployare."
            echo ""
        fi
    else
        log_warning "Impossibile contattare origin (sei offline?). Procedendo comunque."
    fi

    log_success "Branch: ${CURRENT_BRANCH} — Working tree pulito"
fi

# =============================================
# LETTURA VERSIONE E GESTIONE TAG
# =============================================
VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
if [ -z "$VERSION" ]; then
    log_error "Impossibile leggere la versione da package.json."
    exit 1
fi

TAG="v${VERSION}"
log_info "Versione: ${VERSION} — Tag: ${TAG}"

if [ "$NO_GIT_CHECKS" = false ]; then
    EXISTING_TAG_COMMIT=$(git rev-list -n 1 "$TAG" 2>/dev/null)
    HEAD_COMMIT=$(git rev-parse HEAD)

    if [ -z "$EXISTING_TAG_COMMIT" ]; then
        # Tag non esiste: crealo
        git tag -a "$TAG" -m "Release ${TAG}"
        if [ $? -ne 0 ]; then
            log_error "Creazione del tag ${TAG} fallita."
            exit 1
        fi
        log_success "Tag ${TAG} creato su $(git rev-parse --short HEAD)"
    elif [ "$EXISTING_TAG_COMMIT" = "$HEAD_COMMIT" ]; then
        # Tag esiste già su HEAD: ri-deploy della stessa versione, OK
        log_info "Tag ${TAG} già presente su questo commit — ri-deploy della stessa versione"
    else
        # Tag punta a un commit diverso da HEAD: versione non bumpata
        log_error "Il tag ${TAG} esiste già ma punta al commit $(git rev-parse --short "$EXISTING_TAG_COMMIT"), non a HEAD."
        echo ""
        echo -e "${YELLOW}  → Aggiorna il campo 'version' in package.json prima di deployare.${NC}"
        echo -e "${YELLOW}  → Oppure usa --no-git-checks per saltare il controllo (sconsigliato).${NC}"
        exit 1
    fi
fi

# =============================================
# LETTURA CONFIGURAZIONE DEPLOY DA .env
# =============================================
log_info "Lettura configurazione da .env..."

REMOTE_USER=$(get_env_value "DEPLOY_USER")
REMOTE_HOST=$(get_env_value "DEPLOY_HOST")
REMOTE_PATH=$(get_env_value "DEPLOY_PATH")
SSH_PORT=$(get_env_value "DEPLOY_PORT")
PASSWORD=$(get_env_value "DEPLOY_PASSWORD")
DEPLOY_URL=$(get_env_value "DEPLOY_URL")

[ -z "$SSH_PORT" ] && SSH_PORT="22"

MISSING=""
[ -z "$REMOTE_USER" ] && MISSING="$MISSING DEPLOY_USER"
[ -z "$REMOTE_HOST" ] && MISSING="$MISSING DEPLOY_HOST"
[ -z "$REMOTE_PATH" ] && MISSING="$MISSING DEPLOY_PATH"
[ -z "$PASSWORD" ]    && MISSING="$MISSING DEPLOY_PASSWORD"

if [ -n "$MISSING" ]; then
    log_error "Configurazione mancante nel file .env:"
    for key in $MISSING; do
        echo -e "  ${RED}- $key${NC}"
    done
    echo ""
    echo -e "${YELLOW}Aggiungi queste variabili al tuo file .env (vedi .env.example).${NC}"
    exit 1
fi

log_success "Configurazione caricata:"
echo -e "${GRAY}  User: $REMOTE_USER${NC}"
echo -e "${GRAY}  Host: $REMOTE_HOST${NC}"
echo -e "${GRAY}  Path: $REMOTE_PATH${NC}"
echo -e "${GRAY}  Port: $SSH_PORT${NC}"
echo ""

# =============================================
# STEP 1: BUILD
# =============================================
if [ "$SKIP_BUILD" = false ]; then
    log_info "Step 1/4: Esecuzione build di produzione..."
    npm run build

    if [ $? -ne 0 ]; then
        log_error "Build fallita! Interrompo il deploy."
        exit 1
    fi
    log_success "Build completata con successo!"
else
    log_info "Step 1/4: Build saltata"
fi

# Verifica che la cartella dist esista
if [ ! -d "dist" ]; then
    log_error "Cartella 'dist' non trovata. Esegui prima 'npm run build'."
    exit 1
fi

# =============================================
# STEP 2: VERSION MARKER
# =============================================
log_info "Step 2/4: Scrittura dist/version.json..."

COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
DEPLOYED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > dist/version.json << EOF
{
  "version": "${VERSION}",
  "tag": "${TAG}",
  "commit": "${COMMIT}",
  "deployedAt": "${DEPLOYED_AT}"
}
EOF

log_success "version.json: versione=${VERSION} tag=${TAG} commit=${COMMIT}"

# =============================================
# STEP 3: CONTENUTO DIST
# =============================================
log_info "Step 3/4: Contenuto cartella dist:"
ls -la dist/
echo ""

# =============================================
# STEP 4: UPLOAD (sshpass+rsync → pscp/plink → interattivo)
# =============================================
log_info "Step 4/4: Upload su ${REMOTE_HOST}${REMOTE_PATH}..."

if command -v sshpass &> /dev/null; then
    # Metodo 1: sshpass (Linux/macOS e Git Bash con sshpass installato)
    log_info "Usando sshpass per il trasferimento con password automatica..."

    if command -v rsync &> /dev/null; then
        log_info "Esecuzione: rsync via sshpass..."
        sshpass -p "$PASSWORD" rsync -avz --delete --progress \
            -e "ssh -p $SSH_PORT -o StrictHostKeyChecking=no" \
            dist/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
    else
        log_info "Esecuzione: scp via sshpass..."
        sshpass -p "$PASSWORD" scp -P "$SSH_PORT" -o StrictHostKeyChecking=no \
            -r dist/* ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
    fi

elif command -v pscp &> /dev/null && command -v plink &> /dev/null; then
    # Metodo 2: pscp + plink (PuTTY — disponibile su Windows)
    log_info "Usando pscp/plink (PuTTY) per il trasferimento..."

    TEMP_ARCHIVE="/tmp/carousel_generator_deploy_$(date +%s).tar.gz"
    log_info "Compressione cartella dist: ${TEMP_ARCHIVE}..."
    tar czf "$TEMP_ARCHIVE" -C dist .

    if [ $? -ne 0 ]; then
        log_error "Errore nella creazione dell'archivio!"
        exit 1
    fi

    # Accetta la host key in cache se non ancora presente (prima connessione al server)
    log_info "Verifica/accettazione host key del server..."
    echo "y" | plink -pw "$PASSWORD" -P "$SSH_PORT" \
        "${REMOTE_USER}@${REMOTE_HOST}" "exit" > /dev/null 2>&1 || true

    log_info "Upload archivio sul server..."
    pscp -pw "$PASSWORD" -P "$SSH_PORT" -batch \
        "$TEMP_ARCHIVE" "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/"

    UPLOAD_STATUS=$?
    ARCHIVE_NAME=$(basename "$TEMP_ARCHIVE")
    rm -f "$TEMP_ARCHIVE"

    if [ $UPLOAD_STATUS -ne 0 ]; then
        log_error "Upload archivio fallito!"
        exit 1
    fi

    log_info "Estrazione e pulizia sul server..."
    plink -pw "$PASSWORD" -P "$SSH_PORT" -batch "${REMOTE_USER}@${REMOTE_HOST}" \
        "cd \"${REMOTE_PATH}\" && tar xzf \"${ARCHIVE_NAME}\" && rm -f \"${ARCHIVE_NAME}\""

else
    # Metodo 3: fallback interattivo (password richiesta manualmente)
    log_warning "sshpass e pscp/plink non trovati. La password verrà richiesta manualmente."
    echo ""
    echo -e "${YELLOW}Per il deploy automatico senza inserire password, installa sshpass:${NC}"
    echo -e "${GRAY}  Ubuntu/Debian: sudo apt install sshpass${NC}"
    echo -e "${GRAY}  macOS:         brew install hudochenkov/sshpass/sshpass${NC}"
    echo -e "${GRAY}  Windows:       winget install PuTTY.PuTTY  (fornisce pscp + plink)${NC}"
    echo ""

    if command -v rsync &> /dev/null; then
        rsync -avz --delete --progress \
            -e "ssh -p $SSH_PORT -o StrictHostKeyChecking=no" \
            dist/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
    else
        scp -P "$SSH_PORT" -o StrictHostKeyChecking=no \
            -r dist/* ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
    fi
fi

if [ $? -ne 0 ]; then
    log_error "Upload fallito!"
    exit 1
fi

log_success "Upload completato con successo!"

# =============================================
# RIEPILOGO FINALE
# =============================================
echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}   Deploy completato!                        ${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""

APP_URL="${DEPLOY_URL:-https://${REMOTE_HOST}}"
echo -e "  Versione: ${YELLOW}${TAG}${NC}  (commit: ${COMMIT})"
echo -e "  URL:      ${YELLOW}${APP_URL}${NC}"
echo ""

if [ "$NO_GIT_CHECKS" = false ]; then
    echo -e "${YELLOW}Prossimo passo: pubblica il tag su GitHub con:${NC}"
    echo -e "  ${GRAY}git push origin ${TAG}${NC}"
    echo ""
fi
