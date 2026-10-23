# Contas da Família

App web para o controle financeiro mensal da casa: contas fixas, cartões, parcelas,
leitura de fatura (PDF, CSV, OFX, Excel ou texto) e análise de hábitos de gasto.

- HTML + JavaScript puro, sem build. Instalável no celular (PWA) e funciona sem internet.
- **Nenhum dado fica neste repositório.** Os lançamentos ficam no aparelho e, se configurado,
  no Firebase da família (protegido por login Google e regras que só aceitam os e-mails autorizados).

## Rodar localmente
```
python -m http.server 8765
```
e abrir http://localhost:8765.

## Sincronização
Preencha `js/config.js` com a configuração do app web do Firebase (Firestore + Authentication/Google).
