# Followuper

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

## Variáveis de ambiente

Crie um `.env.local` para desenvolvimento:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-public
```

No Vercel, cadastre as mesmas variáveis em Project Settings > Environment Variables.
