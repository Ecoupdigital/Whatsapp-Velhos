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
            return {
                "connected": data.get("status") == "connected" or data.get("connected", False),
                "phone_number": data.get("phone_number", "555195877046"),
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
