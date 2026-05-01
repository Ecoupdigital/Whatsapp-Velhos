import httpx
import logging
from datetime import datetime

log = logging.getLogger(__name__)

API_URL = "https://ecoup.uazapi.com"
TOKEN = "eba67094-fa57-4e77-8b8e-8a952614a9cd"


async def get_instance_status() -> dict:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{API_URL}/instance/status",
                headers={"token": TOKEN},
                timeout=10,
            )
            data = resp.json()
            instance = data.get("instance", data)
            return {
                "connected": instance.get("status") == "connected",
                "phone_number": instance.get("owner", "555195877046"),
            }
        except Exception as e:
            log.error(f"Erro ao verificar status WhatsApp: {e}")
            return {"connected": False, "phone_number": None}


async def send_text_message(number: str, text: str) -> dict:
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{API_URL}/send/text",
                headers={"token": TOKEN, "Content-Type": "application/json"},
                json={"number": number, "text": text},
                timeout=30,
            )
            data = resp.json()
            return {
                "success": not data.get("error"),
                "message_id": data.get("messageid", ""),
                "error": data.get("error", ""),
            }
        except Exception as e:
            log.error(f"Erro ao enviar mensagem para {number}: {e}")
            return {"success": False, "message_id": "", "error": str(e)}


async def get_group_participants(group_jid: str) -> list[dict]:
    """Retorna lista de participantes do grupo. Cada item: {phone, name}."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{API_URL}/group/info",
                headers={"token": TOKEN, "Content-Type": "application/json"},
                json={"groupjid": group_jid},
                timeout=15,
            )
            data = resp.json()
            participantes = data.get("Participants", []) or []
            result = []
            for p in participantes:
                phone = (p.get("PhoneNumber") or "").replace("@s.whatsapp.net", "")
                if phone:
                    result.append({
                        "phone": phone,
                        "name": p.get("PushName") or p.get("FullName") or "",
                    })
            return result
        except Exception as e:
            log.error(f"Erro ao buscar participantes do grupo: {e}")
            return []
