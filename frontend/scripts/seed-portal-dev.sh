#!/usr/bin/env bash
# Verifica o backend da Fase 01 antes da prova visual do portal.
# Uso: BACKEND_URL=http://localhost:8000 bash frontend/scripts/seed-portal-dev.sh
set -euo pipefail
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
echo "Checando ${BACKEND_URL}/api/portal ..."
RESP="$(curl -s -o /dev/null -w '%{http_code}' "${BACKEND_URL}/api/portal" || echo 000)"
if [ "$RESP" != "200" ]; then
  echo "FALHA: /api/portal retornou HTTP ${RESP}. Suba a Fase 01 antes da prova visual."
  exit 1
fi
echo "OK: /api/portal responde 200 sem token."
BODY="$(curl -s "${BACKEND_URL}/api/portal")"
echo "$BODY" | head -c 400
echo ""
# Sinaliza se ha conteudo (so informativo; estados vazios sao validos).
echo "$BODY" | grep -q '"eventos":\[\]' && echo "[info] sem eventos -> bloco Eventos mostrara estado vazio" || true
echo "$BODY" | grep -q '"fluxo_12m":\[\]' && echo "[info] sem fluxo -> grafico mostrara estado vazio" || true
