const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Banco de dados ──────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'astra.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

// ── Criar tabelas ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id        INTEGER PRIMARY KEY,
    nome      TEXT    NOT NULL,
    preco     REAL    NOT NULL,
    promo     REAL,
    cat       TEXT,
    tag       TEXT,
    img       TEXT,
    link      TEXT,
    estoque   INTEGER DEFAULT 999,
    desc_txt  TEXT,
    ativo     INTEGER DEFAULT 1,
    criado_em TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    nome      TEXT    NOT NULL,
    email     TEXT    NOT NULL UNIQUE,
    senha     TEXT    NOT NULL,
    criado_em TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER,
    c_nome    TEXT,
    c_email   TEXT,
    j_nome    TEXT,
    itens     TEXT,
    valor     REAL,
    status    TEXT    DEFAULT 'pendente',
    token     TEXT    UNIQUE,
    usado     INTEGER DEFAULT 0,
    mp_id     TEXT,
    data      TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    cod   TEXT    NOT NULL UNIQUE,
    desc  INTEGER NOT NULL,
    usos  INTEGER DEFAULT 0,
    max   INTEGER DEFAULT 100,
    ativo INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Adicionar coluna mp_id se não existir (migração)
try { db.exec('ALTER TABLE orders ADD COLUMN mp_id TEXT'); } catch(e) {}

// ── Dados padrão ────────────────────────────────────────────────────────────
const settingsDefaults = [
  ['pix',        'sua-chave-pix-aqui'],
  ['adminPass',  'admin123'],
  ['storeName',  'Astra Store'],
  ['discord',    'https://discord.gg/M4r4wuNk2h'],
];
const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
settingsDefaults.forEach(([k, v]) => insertSetting.run(k, v));

db.prepare("INSERT OR IGNORE INTO coupons (cod, desc, usos, max, ativo) VALUES ('ASTRA10', 10, 0, 100, 1)").run();

const DEFAULT_GAMES = [
  {id:1,  nome:"Elden Ring",                           preco:24.99, cat:"⚔️ RPG & Souls"},
  {id:2,  nome:"Sekiro: Shadows Die Twice",             preco:19.99, cat:"⚔️ RPG & Souls"},
  {id:3,  nome:"Dark Souls III",                        preco:17.99, cat:"⚔️ RPG & Souls"},
  {id:4,  nome:"Lies of P",                             preco:24.99, cat:"⚔️ RPG & Souls"},
  {id:5,  nome:"Black Myth: Wukong",                   preco:29.99, cat:"⚔️ RPG & Souls"},
  {id:6,  nome:"Diablo IV",                             preco:19.99, cat:"⚔️ RPG & Souls"},
  {id:7,  nome:"The Witcher 3 Wild Hunt",               preco:24.99, cat:"⚔️ RPG & Souls"},
  {id:8,  nome:"Persona 5 Royal",                       preco:24.99, cat:"⚔️ RPG & Souls"},
  {id:9,  nome:"Nier Automata",                         preco:19.99, cat:"⚔️ RPG & Souls"},
  {id:10, nome:"Hades",                                 preco:17.99, cat:"⚔️ RPG & Souls"},
  {id:11, nome:"Cyberpunk 2077",                        preco:24.99, cat:"🌍 Mundo Aberto"},
  {id:12, nome:"Red Dead Redemption",                   preco:24.99, cat:"🌍 Mundo Aberto"},
  {id:13, nome:"Grand Theft Auto V",                    preco:19.99, cat:"🌍 Mundo Aberto"},
  {id:14, nome:"Ghost of Tsushima",                     preco:24.99, cat:"🌍 Mundo Aberto"},
  {id:15, nome:"Assassin's Creed Mirage",               preco:24.99, cat:"🌍 Mundo Aberto"},
  {id:16, nome:"Assassin's Creed Valhalla",             preco:24.99, cat:"🌍 Mundo Aberto"},
  {id:17, nome:"Assassin's Creed Odyssey",              preco:19.99, cat:"🌍 Mundo Aberto"},
  {id:18, nome:"Days Gone",                             preco:19.99, cat:"🌍 Mundo Aberto"},
  {id:19, nome:"Sleeping Dogs Definitive Edition",      preco:9.99,  cat:"🌍 Mundo Aberto"},
  {id:20, nome:"Mafia Definitive Edition",              preco:14.99, cat:"🌍 Mundo Aberto"},
  {id:21, nome:"God of War 2018",                       preco:24.99, cat:"🎮 Ação & Aventura"},
  {id:22, nome:"God of War Ragnarok",                   preco:29.99, cat:"🎮 Ação & Aventura"},
  {id:23, nome:"Marvel's Spider-Man Remastered",        preco:24.99, cat:"🎮 Ação & Aventura"},
  {id:24, nome:"Spider-Man Miles Morales",              preco:19.99, cat:"🎮 Ação & Aventura"},
  {id:25, nome:"Batman Arkham Knight",                  preco:14.99, cat:"🎮 Ação & Aventura"},
  {id:26, nome:"Batman Arkham Collection",              preco:19.99, cat:"🎮 Ação & Aventura", tag:"top"},
  {id:27, nome:"Star Wars Jedi Survivor",               preco:24.99, cat:"🎮 Ação & Aventura"},
  {id:28, nome:"Star Wars Jedi Fallen Order",           preco:14.99, cat:"🎮 Ação & Aventura"},
  {id:29, nome:"Devil May Cry 5",                       preco:17.99, cat:"🎮 Ação & Aventura"},
  {id:30, nome:"Hitman World of Assassination",         preco:24.99, cat:"🎮 Ação & Aventura"},
  {id:31, nome:"Middle-earth Shadow of War",            preco:14.99, cat:"🎮 Ação & Aventura"},
  {id:32, nome:"Middle-earth Shadow of Mordor",         preco:9.99,  cat:"🎮 Ação & Aventura"},
  {id:33, nome:"Tomb Raider Definitive Survivor Trilogy",preco:24.99,cat:"🎮 Ação & Aventura"},
  {id:34, nome:"Tomb Raider",                           preco:14.99, cat:"🎮 Ação & Aventura"},
  {id:35, nome:"Resident Evil 4 Remake",                preco:24.99, cat:"👻 Terror & Survival"},
  {id:36, nome:"Resident Evil Village",                 preco:17.99, cat:"👻 Terror & Survival"},
  {id:37, nome:"Resident Evil 7",                       preco:14.99, cat:"👻 Terror & Survival"},
  {id:38, nome:"Resident Evil Requiem",                 preco:24.99, cat:"👻 Terror & Survival"},
  {id:39, nome:"Silent Hill 2 Remake",                  preco:29.99, cat:"👻 Terror & Survival"},
  {id:40, nome:"Dead Space Remake",                     preco:9.99,  cat:"👻 Terror & Survival"},
  {id:41, nome:"Dead Space 2",                          preco:9.99,  cat:"👻 Terror & Survival"},
  {id:42, nome:"Dead Island 2",                         preco:24.99, cat:"👻 Terror & Survival"},
  {id:43, nome:"Dying Light 2",                         preco:19.99, cat:"👻 Terror & Survival"},
  {id:44, nome:"The Last of Us Part I",                 preco:24.99, cat:"🏆 Exclusivos & Narrativos"},
  {id:45, nome:"Detroit: Become Human",                 preco:14.99, cat:"🏆 Exclusivos & Narrativos"},
  {id:46, nome:"A Plague Tale Requiem",                 preco:19.99, cat:"🏆 Exclusivos & Narrativos"},
  {id:48, nome:"Control Ultimate Edition",              preco:14.99, cat:"🏆 Exclusivos & Narrativos"},
  {id:49, nome:"PRAGMATA",                              preco:24.99, cat:"🏆 Exclusivos & Narrativos"},
  {id:50, nome:"Forza Horizon 5",                       preco:24.99, cat:"🚗 Corrida & Esporte"},
  {id:51, nome:"Subnautica 2",                          preco:24.99, cat:"🌊 Exploração & Survival"},
  {id:52, nome:"Subnautica 1 e 2 COMBO ESPECIAL!",      preco:29.99, promo:29.99, cat:"🎁 Combos Especiais", tag:"sale"},
  {id:53, nome:"Raft",                                  preco:9.99,  cat:"🌊 Exploração & Survival"},
  {id:54, nome:"Terraria",                              preco:14.99, cat:"🌊 Exploração & Survival"},
  {id:55, nome:"Metro Exodus",                          preco:14.99, cat:"🌊 Exploração & Survival"},
  {id:56, nome:"BioShock Collection",                   preco:14.99, cat:"🌊 Exploração & Survival"},
  {id:57, nome:"Hollow Knight Silksong",                preco:14.99, cat:"🎯 Indie & Casual"},
  {id:58, nome:"Hollow Knight",                         preco:14.99, cat:"🎯 Indie & Casual"},
  {id:59, nome:"COMBO Hollow Knight Silksong + Hollow Knight", preco:35.98, promo:24.59, cat:"🎁 Combos Especiais", tag:"sale"},
  {id:60, nome:"Little Nightmares 1 e 2 COMBO ESPECIAL!", preco:35.98, promo:28.99, cat:"🎁 Combos Especiais", tag:"sale"},
  {id:61, nome:"Little Nightmares 2",                   preco:17.99, cat:"🎯 Indie & Casual"},
  {id:62, nome:"Little Nightmares",                     preco:17.99, cat:"🎯 Indie & Casual"},
  {id:63, nome:"Cuphead",                               preco:14.99, cat:"🎯 Indie & Casual"},
  {id:64, nome:"Stray",                                 preco:14.99, cat:"🎯 Indie & Casual"},
  {id:65, nome:"Slime Rancher",                         preco:9.99,  cat:"🎯 Indie & Casual"},
  {id:66, nome:"Overcooked 2",                          preco:9.99,  cat:"🎯 Indie & Casual"},
  {id:67, nome:"Little Kitty, Big City",                preco:14.99, cat:"🎯 Indie & Casual"},
  {id:68, nome:"Firewatch",                             preco:9.99,  cat:"🎯 Indie & Casual"},
  {id:69, nome:"Journey",                               preco:9.99,  cat:"🎯 Indie & Casual"},
  {id:70, nome:"Inside",                                preco:9.99,  cat:"🎯 Indie & Casual"},
  {id:71, nome:"Limbo",                                 preco:7.99,  cat:"🎯 Indie & Casual"},
  {id:72, nome:"Ori and the Blind Forest",              preco:14.99, cat:"🎯 Indie & Casual"},
  {id:73, nome:"Ori and the Will of the Wisps",         preco:17.99, cat:"🎯 Indie & Casual"},
  {id:74, nome:"Far Cry 3",                             preco:17.99, cat:"🔫 FPS & Tiro"},
];

const insertGame = db.prepare(`
  INSERT OR IGNORE INTO games (id, nome, preco, promo, cat, tag, img, link, estoque)
  VALUES (@id, @nome, @preco, @promo, @cat, @tag, @img, @link, @estoque)
`);
DEFAULT_GAMES.forEach(g => insertGame.run({
  id: g.id, nome: g.nome, preco: g.preco,
  promo: g.promo || null, cat: g.cat || null,
  tag: g.tag || null, img: g.img || null,
  link: g.link || null, estoque: g.estoque || 999
}));

// ── Helpers ─────────────────────────────────────────────────────────────────
function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}
function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
}
function checkAdminPass(pass) {
  // Prioridade: variável de ambiente ADMIN_PASS > banco de dados
  const correctPass = process.env.ADMIN_PASS || getSetting('adminPass');
  return pass === correctPass;
}

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — JOGOS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/games', (req, res) => {
  const games = db.prepare('SELECT * FROM games WHERE ativo = 1 ORDER BY id').all();
  res.json(games);
});

app.post('/api/games', (req, res) => {
  const { adminPass, nome, preco, promo, cat, tag, img, link, estoque, desc_txt } = req.body;
  if (!checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
  if (!nome || !preco) return res.status(400).json({ error: 'Nome e preço obrigatórios' });

  const result = db.prepare(`
    INSERT INTO games (nome, preco, promo, cat, tag, img, link, estoque, desc_txt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nome, preco, promo || null, cat || null, tag || null, img || null, link || null, estoque || 999, desc_txt || null);

  res.json({ ok: true, id: result.lastInsertRowid });
});

app.put('/api/games/:id', (req, res) => {
  const { adminPass, nome, preco, promo, cat, tag, img, link, estoque, desc_txt } = req.body;
  if (!checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });

  db.prepare(`
    UPDATE games SET nome=?, preco=?, promo=?, cat=?, tag=?, img=?, link=?, estoque=?, desc_txt=?
    WHERE id=?
  `).run(nome, preco, promo || null, cat || null, tag || null, img || null, link || null, estoque || 999, desc_txt || null, req.params.id);

  res.json({ ok: true });
});

app.delete('/api/games/:id', (req, res) => {
  const { adminPass } = req.body;
  if (!checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
  db.prepare('UPDATE games SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — USUÁRIOS
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/users/register', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hash = await bcrypt.hash(senha, 10);
  const result = db.prepare('INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)').run(nome, email, hash);
  res.json({ ok: true, user: { id: result.lastInsertRowid, nome, email } });
});

app.post('/api/users/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Preencha todos os campos' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Email ou senha incorretos' });

  const ok = await bcrypt.compare(senha, user.senha);
  if (!ok) return res.status(401).json({ error: 'Email ou senha incorretos' });

  res.json({ ok: true, user: { id: user.id, nome: user.nome, email: user.email } });
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — PEDIDOS
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/orders', (req, res) => {
  const { user_id, c_nome, c_email, itens, valor } = req.body;
  if (!itens || !valor) return res.status(400).json({ error: 'Dados incompletos' });

  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const j_nome = Array.isArray(itens) ? itens.map(i => i.nome).join(', ') : '';

  const result = db.prepare(`
    INSERT INTO orders (user_id, c_nome, c_email, j_nome, itens, valor, status, token)
    VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)
  `).run(user_id || null, c_nome || '', c_email || '', j_nome, JSON.stringify(itens), valor, token);

  res.json({ ok: true, id: result.lastInsertRowid, token });
});

app.get('/api/orders/token/:token', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE token = ?').get(req.params.token);
  if (!order) return res.status(404).json({ error: 'Token inválido ou expirado' });
  if (order.usado) return res.status(410).json({ error: 'Este link já foi utilizado' });

  const itens = JSON.parse(order.itens || '[]');
  const itensComLink = itens.map(item => {
    const g = db.prepare('SELECT link, img FROM games WHERE id = ?').get(item.id);
    return { ...item, link: g ? g.link : null, img: g ? g.img : null };
  });

  db.prepare('UPDATE orders SET usado = 1, status = "entregue" WHERE id = ?').run(order.id);
  res.json({ ok: true, order: { ...order, itens: itensComLink } });
});

app.get('/api/orders/user/:email', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE c_email = ? ORDER BY id DESC').all(req.params.email);
  res.json(orders.map(o => ({ ...o, itens: JSON.parse(o.itens || '[]') })));
});

app.get('/api/orders', (req, res) => {
  const { adminPass } = req.query;
  if (!checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  res.json(orders.map(o => ({ ...o, itens: JSON.parse(o.itens || '[]') })));
});

app.put('/api/orders/:id/status', (req, res) => {
  const { adminPass, status } = req.body;
  if (!checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — CUPONS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/coupons/validate/:cod', (req, res) => {
  const c = db.prepare(
    "SELECT * FROM coupons WHERE cod = ? AND ativo = 1 AND usos < max"
  ).get(req.params.cod.toUpperCase());
  if (!c) return res.status(404).json({ error: 'Cupom inválido ou esgotado' });
  res.json({ ok: true, desc: c.desc });
});

app.post('/api/coupons/use/:cod', (req, res) => {
  db.prepare("UPDATE coupons SET usos = usos + 1 WHERE cod = ?").run(req.params.cod.toUpperCase());
  res.json({ ok: true });
});

app.get('/api/coupons', (req, res) => {
  const { adminPass } = req.query;
  if (!checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
  res.json(db.prepare('SELECT * FROM coupons').all());
});

app.post('/api/coupons', (req, res) => {
  const { adminPass, cod, desc, max } = req.body;
  if (!checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
  db.prepare('INSERT OR REPLACE INTO coupons (cod, desc, max) VALUES (?, ?, ?)').run(cod.toUpperCase(), desc, max || 100);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — CONFIGURAÇÕES
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/settings', (req, res) => {
  res.json({
    pix: getSetting('pix'),
    storeName: getSetting('storeName'),
    discord: getSetting('discord')
  });
});

app.put('/api/settings', (req, res) => {
  const { adminPass, pix, storeName, discord, newAdminPass } = req.body;
  if (!checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
  if (pix)          setSetting('pix', pix);
  if (storeName)    setSetting('storeName', storeName);
  if (discord)      setSetting('discord', discord);
  if (newAdminPass) setSetting('adminPass', newAdminPass);
  res.json({ ok: true });
});

// ════════════════════════════════════════════════════════════════════════════
//  MERCADO PAGO — PIX AUTOMÁTICO
// ════════════════════════════════════════════════════════════════════════════

const MP_TOKEN = process.env.MP_TOKEN || 'APP_USR-4589314192189182-052011-63d1db0b6b831f764ce00ce3b9d42b6c-637849852';

// POST /api/checkout — Criar preferência Checkout Pro
app.post('/api/checkout', async (req, res) => {
  try {
    const { valor, nome, email, jogos, pedidoId } = req.body;
    if (!valor || valor <= 0) return res.status(400).json({ error: 'Valor inválido' });
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    const railwayUrl = process.env.RAILWAY_URL || 'https://astra-store-production.up.railway.app';
    const extRef = pedidoId || ('astra-' + Date.now());

    const body = {
      items: [{
        title: jogos || 'Jogos digitais — Astra Store',
        quantity: 1,
        unit_price: parseFloat(parseFloat(valor).toFixed(2)),
        currency_id: 'BRL'
      }],
      payer: { email: email, name: nome || 'Cliente' },
      external_reference: extRef,
      back_urls: {
        success: railwayUrl + '/?pagamento=aprovado',
        failure: railwayUrl + '/?pagamento=falhou',
        pending: railwayUrl + '/?pagamento=pendente'
      },
      auto_return: 'approved',
      notification_url: railwayUrl + '/api/webhook',
      // Permitir pagamento sem login no MP
      purpose: 'onboarding_credits',
      payment_methods: {
        excluded_payment_types: [{ id: 'ticket' }], // remove boleto
        excluded_payment_methods: [],
        installments: 1,
        default_payment_method_id: 'pix'
      },
      binary_mode: true, // aprovado ou reprovado, sem pendente
      statement_descriptor: 'ASTRA STORE' // descrição na fatura do cartão
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MP_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok || !data.init_point) {
      console.error('[MP] Erro ao criar preferência:', JSON.stringify(data));
      return res.status(400).json({ error: data.message || 'Erro ao criar checkout' });
    }

    res.json({ checkoutUrl: data.init_point, id: data.id });
  } catch (err) {
    console.error('[MP] Checkout erro:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/pix — Criar pagamento PIX no Mercado Pago
app.post('/api/pix', async (req, res) => {
  try {
    const { valor, nome, email, jogos, pedidoId } = req.body;
    if (!valor || valor <= 0) return res.status(400).json({ error: 'Valor inválido' });
    if (!email)               return res.status(400).json({ error: 'Email obrigatório' });

    const extRef = pedidoId || ('astra-' + Date.now());
    const railwayUrl = process.env.RAILWAY_URL || '';

    const body = {
      transaction_amount: parseFloat(parseFloat(valor).toFixed(2)),
      description: 'Astra Store — ' + (jogos || 'Jogos digitais'),
      payment_method_id: 'pix',
      payer: {
        email: email,
        first_name: (nome || 'Cliente').split(' ')[0],
        last_name:  (nome || 'Cliente').split(' ').slice(1).join(' ') || 'Astra',
        identification: { type: 'CPF', number: '12345678909' }
      },
      external_reference: extRef,
    };

    if (railwayUrl) body.notification_url = railwayUrl + '/api/webhook';

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization':    'Bearer ' + MP_TOKEN,
        'Content-Type':     'application/json',
        'X-Idempotency-Key': extRef
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok || !data.point_of_interaction) {
      console.error('[MP] Erro ao criar PIX:', JSON.stringify(data));
      return res.status(400).json({ error: data.message || 'Erro ao criar PIX no Mercado Pago' });
    }

    const pix = data.point_of_interaction.transaction_data;

    // Salvar mp_id no pedido se existir
    if (pedidoId) {
      try {
        db.prepare('UPDATE orders SET mp_id = ? WHERE token = ?').run(String(data.id), pedidoId);
      } catch(e) {}
    }

    res.json({
      mpId:          data.id,
      qrCode:        pix.qr_code,
      qrCodeBase64:  pix.qr_code_base64,
      valor:         parseFloat(valor),
      status:        'pending'
    });

  } catch (e) {
    console.error('[MP] Erro interno criar PIX:', e);
    res.status(500).json({ error: 'Erro interno ao gerar PIX' });
  }
});

// GET /api/pix/status/:mpId — Verificar status do pagamento
app.get('/api/pix/status/:mpId', async (req, res) => {
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments/' + req.params.mpId, {
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN }
    });
    const data = await response.json();

    // Se aprovado, marcar pedido como entregue
    if (data.status === 'approved' && data.external_reference) {
      const order = db.prepare('SELECT * FROM orders WHERE token = ?').get(data.external_reference);
      if (order && order.status !== 'entregue') {
        db.prepare("UPDATE orders SET status = 'entregue' WHERE token = ?").run(data.external_reference);
      }
    }

    res.json({ status: data.status, mpId: req.params.mpId });
  } catch (e) {
    console.error('[MP] Erro verificar status:', e);
    res.status(500).json({ error: 'Erro ao verificar pagamento' });
  }
});

// POST /api/webhook — Webhook automático do Mercado Pago
app.post('/api/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return res.sendStatus(200);

    const response = await fetch('https://api.mercadopago.com/v1/payments/' + data.id, {
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN }
    });
    const payment = await response.json();

    if (payment.status === 'approved' && payment.external_reference) {
      db.prepare("UPDATE orders SET status = 'entregue' WHERE token = ?").run(payment.external_reference);
      console.log('[MP] ✅ Pagamento aprovado automaticamente:', data.id, payment.external_reference);
    }

    res.sendStatus(200);
  } catch (e) {
    console.error('[MP] Webhook error:', e);
    res.sendStatus(200);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota temporária para resetar senha — REMOVA APÓS USAR
app.get('/reset-pass', (req, res) => {
  const { s, p } = req.query;
  if(s !== 'astra2024') return res.status(403).send('Proibido');
  setSetting('adminPass', p || 'admin123');
  res.send('Senha atualizada para: ' + (p || 'admin123'));
});

app.listen(PORT, () => {
  console.log(`✅ Astra Store rodando na porta ${PORT}`);
});
