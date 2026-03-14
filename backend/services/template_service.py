from datetime import datetime

MESES_PT = {
    1: "Janeiro",
    2: "Fevereiro",
    3: "Marco",
    4: "Abril",
    5: "Maio",
    6: "Junho",
    7: "Julho",
    8: "Agosto",
    9: "Setembro",
    10: "Outubro",
    11: "Novembro",
    12: "Dezembro",
}


def mes_por_extenso(mes_referencia: str | None = None) -> str:
    """Retorna o mes por extenso a partir de 'YYYY-MM' ou da data atual."""
    if mes_referencia:
        try:
            parts = mes_referencia.split("-")
            mes_num = int(parts[1])
            ano = parts[0]
            return f"{MESES_PT[mes_num]} {ano}"
        except (IndexError, ValueError, KeyError):
            pass
    now = datetime.now()
    return f"{MESES_PT[now.month]} {now.year}"


def render_template(template_text: str, context: dict) -> str:
    """Renderiza um template substituindo placeholders pelo contexto fornecido.

    Placeholders suportados:
        {nome}          - apelido ou nome do jogador
        {nome_completo} - nome completo do jogador
        {valor}         - valor da mensalidade formatado (ex: 60,00)
        {valor_multa}   - valor com multa (ex: 65,00)
        {mes}           - mes por extenso (ex: Marco 2026)
        {vencimento}    - dia de vencimento (ex: 15)
        {pix}           - chave PIX
        {time}          - nome do time
    """
    replacements = {
        "{nome}": str(context.get("nome", "")),
        "{nome_completo}": str(context.get("nome_completo", "")),
        "{valor}": str(context.get("valor", "60,00")),
        "{valor_multa}": str(context.get("valor_multa", "65,00")),
        "{mes}": str(context.get("mes", mes_por_extenso())),
        "{vencimento}": str(context.get("vencimento", "15")),
        "{pix}": str(context.get("pix", "pix@velhosparceiros.com.br")),
        "{time}": str(context.get("time", "Velhos Parceiros F.C.")),
    }

    result = template_text
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)
    return result


def get_default_templates() -> dict[str, str]:
    """Retorna os templates padrao para cada tipo de mensagem."""
    return {
        "template_lembrete_dia6": (
            "Fala, {nome}! Tudo bem?\n\n"
            "Passando pra lembrar da mensalidade de *{mes}* do *{time}*.\n\n"
            "Valor: *R$ {valor}*\n"
            "Vencimento: *dia {vencimento}*\n"
            "PIX: *{pix}*\n\n"
            "Qualquer duvida, so chamar!\n\n"
            "_Mensagem automatica - {time}_"
        ),
        "template_aviso_dia14": (
            "E ai, {nome}! Tudo certo?\n\n"
            "Amanha vence a mensalidade de *{mes}*.\n\n"
            "Valor: *R$ {valor}*\n"
            "PIX: *{pix}*\n\n"
            "Apos o vencimento, o valor passa para *R$ {valor_multa}*.\n\n"
            "Se ja pagou, pode desconsiderar!\n\n"
            "_Mensagem automatica - {time}_"
        ),
        "template_cobranca_dia20": (
            "Fala, {nome}!\n\n"
            "A mensalidade de *{mes}* venceu no dia *{vencimento}* e ainda consta como pendente.\n\n"
            "Valor atualizado: *R$ {valor_multa}*\n"
            "PIX: *{pix}*\n\n"
            "Por favor, regularize o quanto antes pra manter tudo em dia com o *{time}*.\n\n"
            "Se ja pagou, manda o comprovante pra gente atualizar!\n\n"
            "_Mensagem automatica - {time}_"
        ),
        "template_cobranca_manual": (
            "Fala, {nome}! Tudo bem?\n\n"
            "Passando pra lembrar da mensalidade do time:\n\n"
            "Valor: *R$ {valor}*\n"
            "Referencia: *{mes}*\n"
            "Vencimento: *dia {vencimento}*\n\n"
            "Apos o dia {vencimento}, o valor do jogador passa para *R$ {valor_multa}*.\n\n"
            "PIX: *{pix}*\n\n"
            "Se ja pagou, pode desconsiderar essa mensagem!\n\n"
            "_Mensagem enviada pelo sistema {time}_"
        ),
    }
