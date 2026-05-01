#!/bin/bash
# Setup do agendamento para o lembrete de mensalidade
# Roda todo dia 06 às 10:00

SCRIPT="/home/projects/Whatsapp-Velhos/lembrete_mensalidade.py"
CRON_JOB="0 10 6 * * /usr/bin/python3 $SCRIPT"

# Verificar se já existe
if crontab -l 2>/dev/null | grep -q "lembrete_mensalidade.py"; then
    echo "Cron job já existe. Removendo anterior..."
    crontab -l 2>/dev/null | grep -v "lembrete_mensalidade.py" | crontab -
fi

# Adicionar novo cron
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "Cron configurado com sucesso!"
echo ""
echo "Agendamento: Todo dia 06 às 10:00"
echo "Script: $SCRIPT"
echo ""
echo "Para verificar: crontab -l"
echo "Para remover:   crontab -l | grep -v lembrete_mensalidade | crontab -"
