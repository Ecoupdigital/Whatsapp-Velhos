"""Importacao de extrato bancario (linhas ja extraidas pelo agente).

Fluxo: previa (nao grava nada, sugere jogador e mensalidade) -> confirmar (grava em
lote, com trava de duplicado) -> desfazer lote (apaga o que o lote lancou e devolve
as mensalidades ao estado anterior).

Trava de duplicado: cada linha vira uma impressao digital
sha256(conta | data | tipo | valor em centavos | descricao normalizada | ocorrencia).
"ocorrencia" e a posicao da linha entre as identicas do mesmo envio (1, 2, ...): dois
Pix iguais no mesmo dia continuam sendo dois, e reimportar o mesmo extrato da as
mesmas impressoes. extrato_linhas.impressao_digital e UNIQUE no banco.
"""
import hashlib
import json
import re
import unicodedata
from datetime import datetime
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import Conta, ExtratoLinha, ImportacaoExtrato, Jogador, Mensalidade, Transacao
from services.mensalidade_service import sincronizar_transacao_mensalidade

STATUS_EM_ABERTO = ("pendente", "atrasado")
CAMPOS_MENSALIDADE = ("status", "valor_pago", "data_pagamento", "forma_pagto", "conta_id")
TOLERANCIA = 0.005


class ExtratoErro(ValueError):
    """Erro de regra numa linha (vira 'erro' na resposta, nao derruba o lote)."""


# ─── Normalizacao e impressao digital ───────────────────────────────────────

def normalizar_texto(texto: Optional[str]) -> str:
    """Minusculo, sem acento, sem pontuacao, espacos unicos."""
    if not texto:
        return ""
    t = unicodedata.normalize("NFKD", texto)
    t = "".join(c for c in t if not unicodedata.combining(c)).lower()
    t = re.sub(r"[^a-z0-9 ]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def normalizar_nome_pessoa(texto: Optional[str]) -> str:
    """Nome do extrato sem numeros soltos (CNPJ de MEI, ex.: '49.370.706 Luciano ...')."""
    return " ".join(p for p in normalizar_texto(texto).split() if not p.isdigit())


def centavos(valor: float) -> int:
    return int(round(abs(valor) * 100))


def impressoes_digitais(linhas: list[dict]) -> list[str]:
    """Uma impressao por linha, contando ocorrencias de linhas identicas no envio."""
    vistas: dict[tuple, int] = {}
    out = []
    for ln in linhas:
        chave = (
            int(ln["conta_id"]),
            ln["data"],
            ln["tipo"],
            centavos(ln["valor"]),
            normalizar_texto(ln.get("descricao")),
        )
        vistas[chave] = vistas.get(chave, 0) + 1
        bruto = "|".join(str(p) for p in chave) + f"|{vistas[chave]}"
        out.append(hashlib.sha256(bruto.encode("utf-8")).hexdigest())
    return out


# ─── Validacao de linha ─────────────────────────────────────────────────────

def validar_linha(ln: dict, conta_padrao: Optional[int], contas_validas: set[int]) -> dict:
    """Devolve a linha normalizada (conta_id, data AAAA-MM-DD, tipo, valor > 0)."""
    conta_id = ln.get("conta_id") or conta_padrao
    if conta_id is None:
        raise ExtratoErro("conta_id ausente (na linha ou no pedido)")
    if int(conta_id) not in contas_validas:
        raise ExtratoErro(f"conta {conta_id} nao existe ou esta inativa")
    try:
        datetime.strptime(ln["data"], "%Y-%m-%d")
    except (KeyError, TypeError, ValueError):
        raise ExtratoErro("data invalida (use AAAA-MM-DD)")
    tipo = ln.get("tipo")
    if tipo not in ("entrada", "saida"):
        raise ExtratoErro("tipo deve ser 'entrada' ou 'saida'")
    valor = ln.get("valor")
    if not isinstance(valor, (int, float)) or abs(valor) < 0.01:
        raise ExtratoErro("valor invalido")
    return {**ln, "conta_id": int(conta_id), "valor": round(abs(float(valor)), 2), "tipo": tipo}


def contas_ativas(db: Session) -> set[int]:
    return {c.id for c in db.query(Conta).filter(Conta.ativo == 1).all()}


# ─── Sugestao de jogador e mensalidade ──────────────────────────────────────

def sugerir_jogador(nome_extrato: str, jogadores: list[Jogador]) -> Optional[dict]:
    """Casa o nome do extrato com o cadastro.

    alta: nome completo igual (sem acento/caixa) ou apelido igual.
    media: primeiro e ultimo nome iguais e unico jogador nessa condicao.
    Sem casamento ou empate: None (o agente decide).
    """
    alvo = normalizar_nome_pessoa(nome_extrato)
    if not alvo:
        return None
    exatos = [j for j in jogadores if alvo in (normalizar_nome_pessoa(j.nome), normalizar_nome_pessoa(j.apelido))]
    if len(exatos) == 1:
        return {"jogador": exatos[0], "confianca": "alta"}
    if len(exatos) > 1:
        return None
    partes = alvo.split()
    if len(partes) < 2:
        return None
    parecidos = []
    for j in jogadores:
        pj = normalizar_nome_pessoa(j.nome).split()
        if len(pj) >= 2 and pj[0] == partes[0] and pj[-1] == partes[-1]:
            parecidos.append(j)
    if len(parecidos) == 1:
        return {"jogador": parecidos[0], "confianca": "media"}
    return None


def mensalidades_em_aberto(db: Session, jogador_id: int) -> list[Mensalidade]:
    return (
        db.query(Mensalidade)
        .filter(Mensalidade.jogador_id == jogador_id, Mensalidade.status.in_(STATUS_EM_ABERTO))
        .order_by(Mensalidade.mes_referencia)
        .all()
    )


def sugerir_mensalidades(valor: float, abertas: list[Mensalidade]) -> list[int]:
    """Mais antigas primeiro: a que vale exatamente o valor, ou as k mais antigas que somam o valor."""
    for m in abertas:
        if abs(m.valor - valor) < TOLERANCIA:
            return [m.id]
    soma = 0.0
    ids = []
    for m in abertas:
        soma += m.valor
        ids.append(m.id)
        if abs(soma - valor) < TOLERANCIA:
            return ids
        if soma > valor:
            break
    return []


# ─── Previa ─────────────────────────────────────────────────────────────────

def previa(db: Session, conta_padrao: Optional[int], linhas: list[dict]) -> dict:
    """Nao grava nada. Diz o que e novo, o que ja foi importado e sugere vinculos."""
    contas = contas_ativas(db)
    jogadores = db.query(Jogador).all()
    validas: list[tuple[int, dict]] = []
    saida = []
    for i, ln in enumerate(linhas):
        try:
            validas.append((i, validar_linha(ln, conta_padrao, contas)))
            saida.append(None)
        except ExtratoErro as e:
            saida.append({"indice": i, "status": "erro", "erro": str(e)})

    impressoes = impressoes_digitais([v for _, v in validas])
    ja_importadas = {
        r.impressao_digital: r.lote_id
        for r in db.query(ExtratoLinha).filter(ExtratoLinha.impressao_digital.in_(impressoes)).all()
    } if impressoes else {}

    for (i, ln), imp in zip(validas, impressoes):
        item = {
            "indice": i,
            "impressao_digital": imp,
            "conta_id": ln["conta_id"],
            "data": ln["data"],
            "tipo": ln["tipo"],
            "valor": ln["valor"],
            "descricao": ln.get("descricao"),
            "status": "duplicada" if imp in ja_importadas else "nova",
            "lote_existente_id": ja_importadas.get(imp),
            "sugestao": None,
        }
        if ln["tipo"] == "entrada":
            s = sugerir_jogador(ln.get("descricao") or "", jogadores)
            if s:
                j = s["jogador"]
                abertas = mensalidades_em_aberto(db, j.id)
                sugeridas = sugerir_mensalidades(ln["valor"], abertas)
                item["sugestao"] = {
                    "jogador_id": j.id,
                    "jogador_nome": j.nome,
                    "confianca": s["confianca"],
                    "mensalidades_em_aberto": [
                        {"id": m.id, "mes_referencia": m.mes_referencia, "valor": m.valor, "status": m.status}
                        for m in abertas
                    ],
                    "mensalidade_ids_sugeridas": sugeridas,
                    "acao_sugerida": "mensalidade" if sugeridas else "transacao",
                }
        saida[i] = item

    resumo = {
        "total": len(linhas),
        "novas": sum(1 for x in saida if x["status"] == "nova"),
        "duplicadas": sum(1 for x in saida if x["status"] == "duplicada"),
        "erros": sum(1 for x in saida if x["status"] == "erro"),
        "com_sugestao": sum(1 for x in saida if x.get("sugestao")),
    }
    return {"resumo": resumo, "linhas": saida}


# ─── Confirmar ──────────────────────────────────────────────────────────────

def _quitar_mensalidades(db: Session, ln: dict, lote: ImportacaoExtrato) -> tuple[list[int], list[dict]]:
    """Quita as mensalidades da linha pela regra do app. Devolve (transacao_ids, estado_anterior)."""
    ids = ln.get("mensalidade_ids") or []
    if not ids:
        raise ExtratoErro("acao 'mensalidade' precisa de mensalidade_ids")
    if ln["tipo"] != "entrada":
        raise ExtratoErro("mensalidade so pode ser quitada com linha de entrada")
    ms = db.query(Mensalidade).filter(Mensalidade.id.in_(ids)).all()
    if len(ms) != len(set(ids)):
        raise ExtratoErro("mensalidade inexistente na lista")
    if any(m.status not in STATUS_EM_ABERTO for m in ms):
        raise ExtratoErro("mensalidade ja quitada ou isenta na lista")
    if len({m.jogador_id for m in ms}) > 1:
        raise ExtratoErro("mensalidades de jogadores diferentes na mesma linha")

    # Uma mensalidade: recebe o valor da linha (ex.: 65 com multa). Varias: a soma
    # dos valores tem que bater com a linha, e cada uma recebe o proprio valor.
    if len(ms) == 1:
        valores = {ms[0].id: ln["valor"]}
    else:
        if abs(sum(m.valor for m in ms) - ln["valor"]) >= TOLERANCIA:
            raise ExtratoErro("soma das mensalidades diferente do valor da linha")
        valores = {m.id: m.valor for m in ms}

    anteriores = [{"id": m.id, **{c: getattr(m, c) for c in CAMPOS_MENSALIDADE}} for m in ms]
    tx_ids = []
    for m in sorted(ms, key=lambda x: x.mes_referencia):
        m.status = "pago"
        m.valor_pago = valores[m.id]
        m.data_pagamento = ln["data"]
        m.forma_pagto = ln.get("forma_pagto") or "pix"
        m.conta_id = ln["conta_id"]
        tx = sincronizar_transacao_mensalidade(db, m)
        tx.origem = "importacao"
        tx.importacao_lote_id = lote.id
        db.flush()
        tx_ids.append(tx.id)
    return tx_ids, anteriores


def _lancar_transacao(db: Session, ln: dict, lote: ImportacaoExtrato) -> list[int]:
    categoria = ln.get("categoria")
    if not categoria:
        raise ExtratoErro("acao 'transacao' precisa de categoria")
    tx = Transacao(
        tipo=ln["tipo"],
        categoria=categoria,
        descricao=ln.get("descricao_lancamento") or ln.get("descricao"),
        valor=ln["valor"],
        data=ln["data"],
        jogador_id=ln.get("jogador_id"),
        evento_id=ln.get("evento_id"),
        conta_id=ln["conta_id"],
        origem="importacao",
        importacao_lote_id=lote.id,
    )
    db.add(tx)
    db.flush()
    return [tx.id]


def confirmar(
    db: Session,
    conta_padrao: Optional[int],
    linhas: list[dict],
    usuario_id: Optional[int],
    origem: str,
    observacao: Optional[str] = None,
) -> dict:
    """Grava o lote. Linha ja importada, com erro ou 'ignorar' nao lanca nada.

    Cada linha roda num savepoint: erro numa linha nao desfaz as outras.
    A impressao digital e calculada sobre TODAS as linhas validas do envio (iguais a
    previa), entao mandar o extrato inteiro com acoes por linha da o mesmo resultado.
    """
    contas = contas_ativas(db)
    lote = ImportacaoExtrato(
        conta_id=conta_padrao, usuario_id=usuario_id, origem=origem,
        observacao=observacao, total_linhas=len(linhas), status="confirmado",
    )
    db.add(lote)
    db.flush()

    resultado: list[Optional[dict]] = [None] * len(linhas)
    validas: list[tuple[int, dict]] = []
    for i, ln in enumerate(linhas):
        try:
            validas.append((i, validar_linha(ln, conta_padrao, contas)))
        except ExtratoErro as e:
            resultado[i] = {"indice": i, "status": "erro", "erro": str(e)}
    impressoes = impressoes_digitais([v for _, v in validas])

    gravadas = 0
    for (i, ln), imp in zip(validas, impressoes):
        acao = ln.get("acao")
        if acao == "ignorar":
            resultado[i] = {"indice": i, "status": "ignorada", "impressao_digital": imp}
            continue
        if acao not in ("mensalidade", "transacao"):
            resultado[i] = {"indice": i, "status": "erro", "erro": "acao deve ser mensalidade, transacao ou ignorar"}
            continue
        if db.query(ExtratoLinha.id).filter(ExtratoLinha.impressao_digital == imp).first():
            resultado[i] = {"indice": i, "status": "duplicada", "impressao_digital": imp}
            continue

        sp = db.begin_nested()
        try:
            if acao == "mensalidade":
                tx_ids, anteriores = _quitar_mensalidades(db, ln, lote)
            else:
                tx_ids, anteriores = _lancar_transacao(db, ln, lote), None
            db.add(ExtratoLinha(
                lote_id=lote.id, conta_id=ln["conta_id"], data=ln["data"], tipo=ln["tipo"],
                valor=ln["valor"], descricao=ln.get("descricao"), impressao_digital=imp, acao=acao,
                transacao_ids=json.dumps(tx_ids),
                mensalidades_anteriores=json.dumps(anteriores) if anteriores else None,
            ))
            db.flush()
            sp.commit()
            gravadas += 1
            resultado[i] = {"indice": i, "status": "gravada", "impressao_digital": imp, "transacao_ids": tx_ids}
        except ExtratoErro as e:
            sp.rollback()
            resultado[i] = {"indice": i, "status": "erro", "erro": str(e), "impressao_digital": imp}
        except IntegrityError:
            # Outra importacao gravou a mesma linha ao mesmo tempo: a constraint segura.
            sp.rollback()
            resultado[i] = {"indice": i, "status": "duplicada", "impressao_digital": imp}

    lote.linhas_gravadas = gravadas
    db.commit()
    return {
        "lote_id": lote.id,
        "resumo": {
            "total": len(linhas),
            "gravadas": gravadas,
            "duplicadas": sum(1 for r in resultado if r and r["status"] == "duplicada"),
            "ignoradas": sum(1 for r in resultado if r and r["status"] == "ignorada"),
            "erros": sum(1 for r in resultado if r and r["status"] == "erro"),
        },
        "linhas": resultado,
    }


# ─── Desfazer ───────────────────────────────────────────────────────────────

def desfazer(db: Session, lote_id: int) -> dict:
    """Apaga as transacoes do lote, devolve as mensalidades ao estado anterior e libera
    as impressoes digitais (o extrato pode ser importado de novo)."""
    lote = db.query(ImportacaoExtrato).filter(ImportacaoExtrato.id == lote_id).first()
    if lote is None:
        raise LookupError("lote nao encontrado")
    if lote.status == "desfeito":
        raise ExtratoErro("lote ja desfeito")

    linhas = db.query(ExtratoLinha).filter(ExtratoLinha.lote_id == lote.id).all()
    mensalidades_restauradas = 0
    for ln in linhas:
        for anterior in json.loads(ln.mensalidades_anteriores or "[]"):
            m = db.query(Mensalidade).filter(Mensalidade.id == anterior["id"]).first()
            if m is None:
                continue
            for c in CAMPOS_MENSALIDADE:
                setattr(m, c, anterior[c])
            sincronizar_transacao_mensalidade(db, m)  # saiu de pago: estorna pela regra do app
            mensalidades_restauradas += 1
        db.delete(ln)
    db.flush()

    # Sobra: transacoes do lote que nao eram de mensalidade (ou editadas depois).
    removidas = db.query(Transacao).filter(Transacao.importacao_lote_id == lote.id).delete(
        synchronize_session=False
    )
    lote.status = "desfeito"
    lote.desfeito_em = datetime.now().isoformat()
    db.commit()
    return {
        "lote_id": lote.id,
        "linhas_liberadas": len(linhas),
        "mensalidades_restauradas": mensalidades_restauradas,
        "transacoes_removidas_extra": removidas,
    }
