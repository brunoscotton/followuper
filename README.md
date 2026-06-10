# FollowUper

Dashboard para acompanhamento de cotações, follow-ups e mudanças de status.

## Como rodar

```bash
npm install
npm run dev
```

Sem variáveis de ambiente, o app salva as cotações no armazenamento local do navegador.
Com Supabase configurado, o app exige login e salva tudo no banco.

## Supabase

1. Crie um projeto no Supabase.
2. Abra SQL Editor e execute `supabase/schema.sql`.
3. Em Authentication > Providers, deixe Email habilitado.
4. Em Authentication > Users, crie os usuários que poderão acessar o sistema.
5. Em Project Settings > API, copie a Project URL e a anon public key.

Sempre que `supabase/schema.sql` mudar, execute o arquivo novamente no SQL Editor. Ele e idempotente e tambem habilita realtime para inclusoes, alteracoes e exclusoes.

O schema cria tres tabelas:

- `quotes`: cotações e dados de fechamento.
- `tracking_entries`: rastreios gerados automaticamente quando uma cotação e finalizada, alem de rastreios avulsos.
- `info_blocks`: blocos do Painel de informacoes, com texto, titulo, listas, alternantes e divisores.

As cotações usam campos de follow-up por unidade (`days`, `hours`, `minutes`) e arquivamento. Depois de atualizar o projeto, execute o schema antes de usar o deploy em produção.

## Variáveis de ambiente

Crie um `.env.local` para desenvolvimento:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-public
```

No Vercel, cadastre as mesmas variáveis em Project Settings > Environment Variables.

## Correios

O botao `Atualizar Status Correio` usa uma rota serverless em `/api/correios/update-tracking`. Configure as variaveis abaixo no Vercel para consultar a API Rastro sem expor credenciais no navegador:

```bash
CORREIOS_USERNAME=seu_usuario_cws
CORREIOS_ACCESS_CODE=sua_chave_de_acesso_cws
CORREIOS_POST_CARD=seu_cartao_de_postagem
CORREIOS_CONTRACT=seu_numero_de_contrato
CORREIOS_DR=sua_dr_ou_superintendencia
```

Por padrao, o sistema usa `CORREIOS_AUTH_MODE=cartaopostagem`, enviando o cartao de postagem e, se configurados, tambem contrato e DR. Se os Correios liberarem por contrato, use:

```bash
CORREIOS_AUTH_MODE=contrato
CORREIOS_CONTRACT=seu_numero_de_contrato
CORREIOS_DR=sua_dr_ou_superintendencia
```

Se a API Rastro estiver liberada diretamente para o usuario idCorreios, use:

```bash
CORREIOS_AUTH_MODE=usuario
```

Opcionalmente, para testes com token ja emitido:

```bash
CORREIOS_API_TOKEN=token_bearer_dos_correios
```

Endpoints padrao usados pela integracao:

```bash
CORREIOS_BASE_URL=https://api.correios.com.br
CORREIOS_TOKEN_ENDPOINT=https://api.correios.com.br/token/v1/autentica/cartaopostagem
CORREIOS_RASTRO_ENDPOINT=https://api.correios.com.br/srorastro/v1/objetos
```

Se o contrato usar endpoint diferente no CWS, cadastre `CORREIOS_TOKEN_ENDPOINT` e `CORREIOS_RASTRO_ENDPOINT` conforme o Swagger liberado pelos Correios.
