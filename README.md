# 🚀 Astra Store — Deploy no Railway

## Arquivos do projeto
```
astra-railway/
├── server.js          ← servidor Node.js
├── package.json       ← dependências
├── .gitignore
└── public/
    └── index.html     ← sua loja
```

---

## Passo a passo para subir no Railway

### 1. Colocar no GitHub
1. Acesse **github.com** e crie um repositório novo (ex: `astra-store`)
2. Faça upload de todos esses arquivos para o repositório
   - Arrasta a pasta inteira ou usa o botão "Add file > Upload files"
   - **IMPORTANTE**: mantenha a pasta `public/` com o `index.html` dentro

### 2. Subir no Railway
1. Acesse **railway.app** e faça login
2. Clique em **"New Project"**
3. Escolha **"Deploy from GitHub repo"**
4. Selecione seu repositório `astra-store`
5. Railway vai detectar o `package.json` e subir automaticamente

### 3. Gerar domínio público
1. No painel do Railway, clique no seu serviço
2. Vá em **"Settings" → "Networking"**
3. Clique em **"Generate Domain"**
4. Seu site vai estar em algo como `astra-store.up.railway.app`

### 4. Configurar sua chave PIX e senha admin
Depois que subir, acesse o admin da loja:
- Abra seu site
- Clique no ícone de admin (rodapé ou URL `?admin=1`)
- Senha padrão: **admin123**
- Vá em Configurações e troque:
  - Chave PIX
  - Senha do admin

---

## ✅ Por que não dá mais 502?

O erro 502 anterior era porque o servidor não tinha a linha correta da porta.
Agora o `server.js` usa:
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, ...)
```
O Railway injeta a variável `PORT` automaticamente — isso resolve o 502.

---

## Dados salvos no banco de dados

Agora todos os dados ficam no banco SQLite no Railway:
- ✅ Jogos cadastrados no admin
- ✅ Usuários cadastrados
- ✅ Pedidos
- ✅ Cupons

**Nada mais some quando fecha o navegador!**
