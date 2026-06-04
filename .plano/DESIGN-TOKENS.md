# DESIGN-TOKENS: Portal de Transparência — Velhos Parceiros F.C.

> Tokens extraídos do `frontend/tailwind.config.ts` existente. O portal REUSA
> o tema do app (dark + vermelho), não introduz paleta nova. Valores concretos abaixo.

## Cores

| Token | Valor | Uso no portal |
|-------|-------|---------------|
| Primária (brand.red) | `#E31E24` | escudo, saldo herói, destaques, linha de entradas |
| Fundo (surface.dark) | `#0A0A0B` | fundo da página |
| Superfície de card | `surface.*` (variações escuras) | cards de caixa/eventos/jogos |
| Texto principal (txt.*) | claro sobre dark | títulos e números |
| Texto secundário (txt.*) | cinza | labels, carimbo "atualizado em" |
| Verde (positivo) | verde Tailwind (`green-500`/`emerald-400`) | líquido positivo, entradas |
| Vermelho (negativo) | `#E31E24` / `red-500` | líquido negativo, saídas, badges de atraso |

> Não criar cores fora da paleta. Se faltar um tom, usar a escala Tailwind padrão
> coerente com o dark existente.

## Tipografia

| Token | Família | Uso |
|-------|---------|-----|
| Display | `oswald` | título "Velhos Parceiros F.C.", "Prestação de Contas", número herói |
| Corpo | `dm-sans` | labels, descrições, texto dos cards |
| Mono | `jetbrains` | valores numéricos quando precisar alinhamento (opcional) |

## Espaçamento

- Escala Tailwind padrão (`4 / 8 / 12 / 16 / 24 / 32 px` via `gap`/`p`/`m`).
- Mobile-first: blocos empilham em coluna única; em `md+` cards em grid.
- Página em rolagem única, blocos separados por espaçamento vertical generoso.

## Border radius

- Cards: `rounded-xl` / `rounded-2xl` (consistente com telas internas existentes).
- Badges de atraso: `rounded-full`.

## Modo

- **Dark forçado** (o app já força `dark` no `<html>`). Sem light mode (fora de escopo).

## Diretrizes visuais (do BRIEFING)

- Hero: escudo (`public/icons/icon-192.svg`, "VP" vermelho) + nome + saldo em número herói + carimbo.
- Animação de entrada suave por bloco via `framer-motion` (fade/slide curto, sutil).
- Ícones `lucide-react` por bloco (ex: carteira, troféu, calendário).
- Líquido de evento colorido: verde positivo, vermelho negativo.
- Footer discreto.
