#!/usr/bin/env python3
"""
Lembrete de Mensalidade - Velhos Parceiros F.C.
Envia mensagem de cobrança para todos os membros do grupo,
excluindo membros específicos.

Agendado para rodar todo dia 06 às 10:00 via crontab.
"""

import json
import subprocess
import time
import random
import logging
from datetime import datetime

# === CONFIGURAÇÃO ===

API_URL = "https://ecoup.uazapi.com"
TOKEN = "eba67094-fa57-4e77-8b8e-8a952614a9cd"
GROUP_JID = "555499591730-1606008393@g.us"

# Membros excluídos do envio
EXCLUIDOS = {
    "555181471350",   # Acassio
    "555196606437",   # Otavio
    "555192495160",
    "555184252267",
    "555199149487",
    "555499591732",
    "353832084343",
    "555189691315",
    "555195214481",
    "33695086929",    # Felipe Rosa
    "555195877046",   # Jonathan (você - não enviar pra si mesmo)
    "555181375778",   # Vagner Velhos
}

# Delay entre mensagens (segundos)
DELAY_MIN = 3
DELAY_MAX = 5

# Mensagem
MENSAGEM = """Fala, meu querido! Tudo bem? ⚽

Aqui é o Jonathan, do financeiro do *Velhos Parceiros F.C*.

Passando pra lembrar da mensalidade do time:

🏃 *Jogador*: R$ 60,00
🤝 *Sócio*: R$ 20,00

📅 Vencimento: *dia 15* deste mês.

⚠️ Após o dia 15, o valor do jogador passa para *R$ 65,00*.

💳 *PIX*: pix@velhosparceiros.com.br

Se já pagou, pode desconsiderar essa mensagem!

Qualquer dúvida, é só chamar. Valeu! 💪

_Esta é uma mensagem automática enviada todo dia 06._"""

# === LOGGING ===

LOG_FILE = "/home/projects/Whatsapp-Velhos/lembrete_mensalidade.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)


def buscar_membros_grupo():
    """Busca os membros atuais do grupo via API."""
    payload = json.dumps({"groupjid": GROUP_JID})
    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST", f"{API_URL}/group/info",
            "-H", f"token: {TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", payload,
        ],
        capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    participantes = data.get("Participants", [])
    numeros = []
    for p in participantes:
        phone = (p.get("PhoneNumber") or "").replace("@s.whatsapp.net", "")
        if phone and phone not in EXCLUIDOS:
            numeros.append(phone)
    return numeros


def enviar_mensagem(numero):
    """Envia a mensagem para um número."""
    payload = json.dumps({"number": numero, "text": MENSAGEM})
    result = subprocess.run(
        [
            "curl", "-s", "-X", "POST", f"{API_URL}/send/text",
            "-H", f"token: {TOKEN}",
            "-H", "Content-Type: application/json",
            "-d", payload,
        ],
        capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    return data


def main():
    log.info("=" * 50)
    log.info(f"Iniciando envio de lembretes - {datetime.now().strftime('%d/%m/%Y %H:%M')}")

    # Buscar membros atualizados do grupo
    membros = buscar_membros_grupo()
    log.info(f"Membros para envio: {len(membros)} (excluídos: {len(EXCLUIDOS)})")

    enviados = 0
    erros = 0

    for i, numero in enumerate(membros, 1):
        try:
            resp = enviar_mensagem(numero)
            msg_id = resp.get("messageid", "")
            error = resp.get("error", "")

            if error:
                log.error(f"  [{i}/{len(membros)}] {numero} - ERRO: {error}")
                erros += 1
            else:
                log.info(f"  [{i}/{len(membros)}] {numero} - OK (id: {msg_id})")
                enviados += 1
        except Exception as e:
            log.error(f"  [{i}/{len(membros)}] {numero} - EXCEÇÃO: {e}")
            erros += 1

        # Delay entre mensagens (exceto após a última)
        if i < len(membros):
            delay = random.uniform(DELAY_MIN, DELAY_MAX)
            log.info(f"  Aguardando {delay:.1f}s...")
            time.sleep(delay)

    log.info(f"Concluído: {enviados} enviados, {erros} erros, {len(membros)} total")
    log.info("=" * 50)


if __name__ == "__main__":
    main()
