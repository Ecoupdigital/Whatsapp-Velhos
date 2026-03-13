from sqlalchemy import Column, Integer, Text, Float, ForeignKey, Index
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    nome = Column(Text, nullable=False)
    role = Column(Text, nullable=False, default="admin")
    created_at = Column(Text, default=lambda: datetime.now().isoformat())


class Jogador(Base):
    __tablename__ = "jogadores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    nome = Column(Text, nullable=False)
    apelido = Column(Text)
    telefone = Column(Text)
    tipo = Column(Text, nullable=False, default="jogador")  # jogador | socio
    posicao = Column(Text)
    numero_camisa = Column(Integer)
    data_nascimento = Column(Text)
    data_entrada = Column(Text)
    ativo = Column(Integer, default=1)
    excluido_envio = Column(Integer, default=0)
    observacoes = Column(Text)
    created_at = Column(Text, default=lambda: datetime.now().isoformat())
    updated_at = Column(Text, default=lambda: datetime.now().isoformat(), onupdate=lambda: datetime.now().isoformat())

    mensalidades = relationship("Mensalidade", back_populates="jogador")
    cartoes = relationship("CartaoBaile", back_populates="jogador")
    participacoes = relationship("EventoParticipante", back_populates="jogador")


class Mensalidade(Base):
    __tablename__ = "mensalidades"
    __table_args__ = (
        Index("ix_mensalidade_jogador_mes", "jogador_id", "mes_referencia", unique=True),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    jogador_id = Column(Integer, ForeignKey("jogadores.id"), nullable=False)
    mes_referencia = Column(Text, nullable=False)  # "2026-03"
    valor = Column(Float, nullable=False)
    valor_pago = Column(Float, default=0)
    status = Column(Text, nullable=False, default="pendente")  # pendente | pago | atrasado | isento
    data_pagamento = Column(Text)
    forma_pagto = Column(Text)  # pix | dinheiro | transferencia
    observacoes = Column(Text)
    created_at = Column(Text, default=lambda: datetime.now().isoformat())

    jogador = relationship("Jogador", back_populates="mensalidades")


class Transacao(Base):
    __tablename__ = "transacoes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo = Column(Text, nullable=False)  # entrada | saida
    categoria = Column(Text, nullable=False)
    descricao = Column(Text)
    valor = Column(Float, nullable=False)
    data = Column(Text, nullable=False)
    jogador_id = Column(Integer, ForeignKey("jogadores.id"))
    evento_id = Column(Integer, ForeignKey("eventos.id"))
    comprovante = Column(Text)
    created_at = Column(Text, default=lambda: datetime.now().isoformat())


class Evento(Base):
    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    tipo = Column(Text, nullable=False)  # viagem | baile | confraternizacao | torneio | outro
    titulo = Column(Text, nullable=False)
    descricao = Column(Text)
    data_inicio = Column(Text)
    data_fim = Column(Text)
    local = Column(Text)
    custo_estimado = Column(Float, default=0)
    custo_real = Column(Float, default=0)
    status = Column(Text, default="planejado")  # planejado | em_andamento | concluido | cancelado
    created_at = Column(Text, default=lambda: datetime.now().isoformat())

    participantes = relationship("EventoParticipante", back_populates="evento")
    cartoes = relationship("CartaoBaile", back_populates="evento")


class EventoParticipante(Base):
    __tablename__ = "evento_participantes"
    __table_args__ = (
        Index("ix_evento_part", "evento_id", "jogador_id", unique=True),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False)
    jogador_id = Column(Integer, ForeignKey("jogadores.id"), nullable=False)
    status = Column(Text, default="pendente")  # confirmado | recusado | pendente | talvez
    pago = Column(Integer, default=0)
    valor = Column(Float, default=0)
    observacoes = Column(Text)

    evento = relationship("Evento", back_populates="participantes")
    jogador = relationship("Jogador", back_populates="participacoes")


class Jogo(Base):
    __tablename__ = "jogos"

    id = Column(Integer, primary_key=True, autoincrement=True)
    data = Column(Text, nullable=False)
    horario = Column(Text)
    local = Column(Text)
    adversario = Column(Text, nullable=False)
    gols_favor = Column(Integer, default=0)
    gols_contra = Column(Integer, default=0)
    tipo = Column(Text, default="amistoso")  # amistoso | campeonato | torneio
    observacoes = Column(Text)
    created_at = Column(Text, default=lambda: datetime.now().isoformat())


class CartaoBaile(Base):
    __tablename__ = "cartoes_baile"

    id = Column(Integer, primary_key=True, autoincrement=True)
    evento_id = Column(Integer, ForeignKey("eventos.id"), nullable=False)
    jogador_id = Column(Integer, ForeignKey("jogadores.id"), nullable=False)
    numero_inicio = Column(Integer, nullable=False)
    numero_fim = Column(Integer, nullable=False)
    quantidade = Column(Integer, nullable=False)
    vendidos = Column(Integer, default=0)
    valor_unitario = Column(Float, nullable=False)
    valor_acertado = Column(Float, default=0)
    status = Column(Text, default="em_posse")  # em_posse | acertado | parcial
    created_at = Column(Text, default=lambda: datetime.now().isoformat())

    evento = relationship("Evento", back_populates="cartoes")
    jogador = relationship("Jogador", back_populates="cartoes")


class Promocao(Base):
    __tablename__ = "promocoes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    titulo = Column(Text, nullable=False)
    descricao = Column(Text)
    tipo = Column(Text, nullable=False)  # desconto_mensalidade | evento | produto | outro
    valor_desconto = Column(Float, default=0)
    data_inicio = Column(Text)
    data_fim = Column(Text)
    ativa = Column(Integer, default=1)
    created_at = Column(Text, default=lambda: datetime.now().isoformat())


class MensagemLog(Base):
    __tablename__ = "mensagens_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    jogador_id = Column(Integer, ForeignKey("jogadores.id"))
    telefone = Column(Text)
    tipo_mensagem = Column(Text)  # lembrete_dia6 | aviso_dia14 | cobranca_dia20 | manual | promocao
    conteudo = Column(Text)
    status = Column(Text, default="pendente")  # enviado | erro | pendente
    message_id = Column(Text)
    erro_detalhe = Column(Text)
    enviado_em = Column(Text)


class Configuracao(Base):
    __tablename__ = "configuracoes"

    chave = Column(Text, primary_key=True)
    valor = Column(Text)
