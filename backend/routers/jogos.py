import re
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Jogo
from schemas import (
    JogoCreate, JogoUpdate, JogoOut, JogoEstatisticas,
    RankingsOut, RankingEntry,
)
from auth import get_current_user

router = APIRouter(prefix="/api/jogos", tags=["jogos"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[JogoOut])
def listar(
    tipo: str | None = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Jogo)
    if tipo:
        q = q.filter(Jogo.tipo == tipo)
    return q.order_by(Jogo.data.asc()).all()


@router.post("", response_model=JogoOut, status_code=201)
def criar(data: JogoCreate, db: Session = Depends(get_db)):
    j = Jogo(**data.model_dump())
    db.add(j)
    db.commit()
    db.refresh(j)
    return j


@router.get("/estatisticas", response_model=JogoEstatisticas)
def estatisticas(db: Session = Depends(get_db)):
    jogos = db.query(Jogo).filter(Jogo.realizado == 1).all()
    vitorias = sum(1 for j in jogos if j.gols_favor > j.gols_contra)
    empates = sum(1 for j in jogos if j.gols_favor == j.gols_contra)
    derrotas = sum(1 for j in jogos if j.gols_favor < j.gols_contra)
    gols_m = sum(j.gols_favor for j in jogos)
    gols_s = sum(j.gols_contra for j in jogos)

    return JogoEstatisticas(
        total=len(jogos),
        vitorias=vitorias,
        empates=empates,
        derrotas=derrotas,
        gols_marcados=gols_m,
        gols_sofridos=gols_s,
    )


def _parse_entries(text: str) -> dict[str, int]:
    """Parse a comma-separated string of names with optional (N) counts.

    Examples:
        "Carlao (2), Pedrinho" -> {"Carlao": 2, "Pedrinho": 1}
        "Michel, Silver"       -> {"Michel": 1, "Silver": 1}
    """
    result: dict[str, int] = {}
    if not text or not text.strip():
        return result
    for entry in text.split(","):
        entry = entry.strip()
        if not entry:
            continue
        match = re.match(r"^(.+?)\s*\((\d+)\)\s*$", entry)
        if match:
            name = match.group(1).strip()
            count = int(match.group(2))
        else:
            name = entry
            count = 1
        if name:
            result[name] = result.get(name, 0) + count
    return result


@router.get("/rankings", response_model=RankingsOut)
def rankings(db: Session = Depends(get_db)):
    jogos = db.query(Jogo).filter(Jogo.realizado == 1).all()

    artilharia: dict[str, int] = defaultdict(int)
    assist: dict[str, int] = defaultdict(int)
    destaques: dict[str, int] = defaultdict(int)

    for jogo in jogos:
        for nome, qtd in _parse_entries(jogo.gols_descricao or "").items():
            artilharia[nome] += qtd
        for nome, qtd in _parse_entries(jogo.assistencias or "").items():
            assist[nome] += qtd
        if jogo.destaque and jogo.destaque.strip():
            destaques[jogo.destaque.strip()] += 1

    def to_ranking(d: dict[str, int]) -> list[RankingEntry]:
        return sorted(
            [RankingEntry(nome=k, quantidade=v) for k, v in d.items()],
            key=lambda r: r.quantidade,
            reverse=True,
        )

    return RankingsOut(
        artilharia=to_ranking(artilharia),
        assistencias=to_ranking(assist),
        destaques=to_ranking(destaques),
    )


@router.put("/{jogo_id}", response_model=JogoOut)
def atualizar(jogo_id: int, data: JogoUpdate, db: Session = Depends(get_db)):
    j = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Jogo nao encontrado")
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(j, field, value)
    # Auto-set realizado when score is provided
    gf = updates.get("gols_favor", j.gols_favor)
    gc = updates.get("gols_contra", j.gols_contra)
    if gf is not None and gc is not None and (gf > 0 or gc > 0):
        j.realizado = 1
    db.commit()
    db.refresh(j)
    return j


@router.delete("/{jogo_id}")
def remover(jogo_id: int, db: Session = Depends(get_db)):
    j = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not j:
        raise HTTPException(status_code=404, detail="Jogo nao encontrado")
    db.delete(j)
    db.commit()
    return {"ok": True}
