const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── PostgreSQL ──────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function q(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}
async function q1(sql, params = []) {
  const res = await pool.query(sql, params);
  return res.rows[0] || null;
}

// ── Criar tabelas ───────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS games (
      id        SERIAL PRIMARY KEY,
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
      criado_em TEXT    DEFAULT NOW()::TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
      id        SERIAL PRIMARY KEY,
      nome      TEXT    NOT NULL,
      email     TEXT    NOT NULL UNIQUE,
      senha     TEXT    NOT NULL,
      criado_em TEXT    DEFAULT NOW()::TEXT
    );
    CREATE TABLE IF NOT EXISTS orders (
      id        SERIAL PRIMARY KEY,
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
      data      TEXT    DEFAULT NOW()::TEXT
    );
    CREATE TABLE IF NOT EXISTS coupons (
      id    SERIAL PRIMARY KEY,
      cod   TEXT    NOT NULL UNIQUE,
      desconto  INTEGER NOT NULL,
      usos  INTEGER DEFAULT 0,
      max   INTEGER DEFAULT 100,
      ativo INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS game_keys (
      id          SERIAL PRIMARY KEY,
      cod         TEXT    NOT NULL UNIQUE,
      game_id     INTEGER NOT NULL,
      game_nome   TEXT,
      status      TEXT    DEFAULT 'ativa', -- 'ativa', 'usada', 'bloqueada'
      criado_em   TEXT    DEFAULT NOW()::TEXT,
      ativado_em  TEXT,
      user_email  TEXT,
      ip          TEXT,
      dispositivo TEXT,
      order_token TEXT
    );
  `);
  
  await pool.query("INSERT INTO game_keys (cod, game_id, game_nome) VALUES ('ASTRA-CYBER-9942', 11, 'Cyberpunk 2077') ON CONFLICT (cod) DO NOTHING");
  await pool.query("INSERT INTO game_keys (cod, game_id, game_nome) VALUES ('ASTRA-ELDEN-8812', 1, 'Elden Ring') ON CONFLICT (cod) DO NOTHING");
  await pool.query("INSERT INTO game_keys (cod, game_id, game_nome) VALUES ('ASTRA-GOW-7731', 21, 'God of War 2018') ON CONFLICT (cod) DO NOTHING");


  // Dados padrão
  await pool.query(`INSERT INTO settings (key,value) VALUES ('pix','sua-chave-pix') ON CONFLICT (key) DO NOTHING`);
  await pool.query(`INSERT INTO settings (key,value) VALUES ('adminPass','G7!qZ#2vL@9pXr$4Nw') ON CONFLICT (key) DO UPDATE SET value='G7!qZ#2vL@9pXr$4Nw'`);
  await pool.query(`INSERT INTO settings (key,value) VALUES ('storeName','Astra Store') ON CONFLICT (key) DO NOTHING`);
  await pool.query(`INSERT INTO settings (key,value) VALUES ('discord','https://discord.gg/M4r4wuNk2h') ON CONFLICT (key) DO NOTHING`);
  await pool.query(`INSERT INTO coupons (cod,desconto,usos,max,ativo) VALUES ('ASTRA10',10,0,100,1) ON CONFLICT (cod) DO NOTHING`);

  // Jogos padrão
  const DEFAULT_GAMES = [
  {id:1,nome:"Elden Ring",preco:229.90,promo:24.99,cat:"⚔️ RPG & Souls"},
  {id:2,nome:"Sekiro: Shadows Die Twice",preco:199.90,promo:19.99,cat:"⚔️ RPG & Souls"},
  {id:3,nome:"Dark Souls III",preco:229.90,promo:17.99,cat:"⚔️ RPG & Souls"},
  {id:4,nome:"Lies of P",preco:249.90,promo:24.99,cat:"⚔️ RPG & Souls"},
  {id:5,nome:"Black Myth: Wukong",preco:229.99,promo:29.99,cat:"⚔️ RPG & Souls"},
  {id:6,nome:"Diablo IV",preco:279.90,promo:19.99,cat:"⚔️ RPG & Souls"},
  {id:7,nome:"The Witcher 3 Wild Hunt",preco:139.99,promo:24.99,cat:"⚔️ RPG & Souls"},
  {id:8,nome:"Persona 5 Royal",preco:249.90,promo:24.99,cat:"⚔️ RPG & Souls"},
  {id:9,nome:"Nier Automata",preco:149.90,promo:19.99,cat:"⚔️ RPG & Souls"},
  {id:10,nome:"Hades",preco:88.99,promo:17.99,cat:"⚔️ RPG & Souls"},
  {id:11,nome:"Cyberpunk 2077",preco:199.90,promo:24.99,cat:"🌍 Mundo Aberto"},
  {id:12,nome:"Red Dead Redemption",preco:249.90,promo:24.99,cat:"🌍 Mundo Aberto"},
  {id:13,nome:"Grand Theft Auto V",preco:109.89,promo:19.99,cat:"🌍 Mundo Aberto"},
  {id:14,nome:"Ghost of Tsushima",preco:249.90,promo:24.99,cat:"🌍 Mundo Aberto"},
  {id:15,nome:"Assassin's Creed Mirage",preco:209.90,promo:24.99,cat:"🌍 Mundo Aberto"},
  {id:16,nome:"Assassin's Creed Valhalla",preco:199.90,promo:24.99,cat:"🌍 Mundo Aberto"},
  {id:17,nome:"Assassin's Creed Odyssey",preco:179.90,promo:19.99,cat:"🌍 Mundo Aberto"},
  {id:18,nome:"Days Gone",preco:199.90,promo:19.99,cat:"🌍 Mundo Aberto"},
  {id:19,nome:"Sleeping Dogs Definitive Edition",preco:55.99,promo:9.99,cat:"🌍 Mundo Aberto"},
  {id:20,nome:"Mafia Definitive Edition",preco:159.90,promo:14.99,cat:"🌍 Mundo Aberto"},
  {id:21,nome:"God of War 2018",preco:199.90,promo:24.99,cat:"🎮 Ação & Aventura"},
  {id:22,nome:"God of War Ragnarok",preco:349.90,promo:29.99,cat:"🎮 Ação & Aventura"},
  {id:23,nome:"Marvel's Spider-Man Remastered",preco:249.90,promo:24.99,cat:"🎮 Ação & Aventura"},
  {id:24,nome:"Spider-Man Miles Morales",preco:199.90,promo:19.99,cat:"🎮 Ação & Aventura"},
  {id:25,nome:"Batman Arkham Knight",preco:89.99,promo:14.99,cat:"🎮 Ação & Aventura"},
  {id:26,nome:"Batman Arkham Collection",preco:279.90,promo:19.99,cat:"🎮 Ação & Aventura",tag:"top"},
  {id:27,nome:"Star Wars Jedi Survivor",preco:299.90,promo:24.99,cat:"🎮 Ação & Aventura"},
  {id:28,nome:"Star Wars Jedi Fallen Order",preco:199.90,promo:14.99,cat:"🎮 Ação & Aventura"},
  {id:29,nome:"Devil May Cry 5",preco:139.90,promo:17.99,cat:"🎮 Ação & Aventura"},
  {id:30,nome:"Hitman World of Assassination",preco:139.90,promo:24.99,cat:"🎮 Ação & Aventura"},
  {id:31,nome:"Middle-earth Shadow of War",preco:229.99,promo:14.99,cat:"🎮 Ação & Aventura"},
  {id:32,nome:"Middle-earth Shadow of Mordor",preco:89.99,promo:9.99,cat:"🎮 Ação & Aventura"},
  {id:33,nome:"Tomb Raider Definitive Survivor Trilogy",preco:213.00,promo:24.99,cat:"🎮 Ação & Aventura"},
  {id:34,nome:"Tomb Raider",preco:85.00,promo:14.99,cat:"🎮 Ação & Aventura"},
  {id:35,nome:"Resident Evil 4 Remake",preco:249.00,promo:24.99,cat:"👻 Terror & Survival"},
  {id:36,nome:"Resident Evil Village",preco:139.90,promo:17.99,cat:"👻 Terror & Survival"},
  {id:37,nome:"Resident Evil 7",preco:99.90,promo:14.99,cat:"👻 Terror & Survival"},
  {id:38,nome:"Resident Evil Requiem",preco:199.90,promo:24.99,cat:"👻 Terror & Survival"},
  {id:39,nome:"Silent Hill 2 Remake",preco:349.90,promo:29.99,cat:"👻 Terror & Survival"},
  {id:40,nome:"Dead Space Remake",preco:249.00,promo:9.99,cat:"👻 Terror & Survival"},
  {id:41,nome:"Dead Space 2",preco:59.00,promo:9.99,cat:"👻 Terror & Survival"},
  {id:42,nome:"Dead Island 2",preco:249.00,promo:24.99,cat:"👻 Terror & Survival"},
  {id:43,nome:"Dying Light 2",preco:249.00,promo:19.99,cat:"👻 Terror & Survival"},
  {id:44,nome:"The Last of Us Part I",preco:249.90,promo:24.99,cat:"🏆 Exclusivos & Narrativos"},
  {id:45,nome:"Detroit: Become Human",preco:134.99,promo:14.99,cat:"🏆 Exclusivos & Narrativos"},
  {id:46,nome:"A Plague Tale Requiem",preco:179.90,promo:19.99,cat:"🏆 Exclusivos & Narrativos"},
  {id:48,nome:"Control Ultimate Edition",preco:129.00,promo:14.99,cat:"🏆 Exclusivos & Narrativos"},
  {id:49,nome:"PRAGMATA",preco:249.90,promo:24.99,cat:"🏆 Exclusivos & Narrativos"},
  {id:50,nome:"Forza Horizon 5",preco:249.00,promo:24.99,cat:"🚗 Corrida & Esporte"},
  {id:51,nome:"Subnautica 2",preco:109.00,promo:24.99,cat:"🌊 Exploração & Survival"},
  {id:52,nome:"Subnautica 1 e 2 COMBO ESPECIAL!",preco:29.99,promo:29.99,cat:"🎁 Combos Especiais",tag:"sale"},
  {id:53,nome:"Raft",preco:36.99,promo:9.99,cat:"🌊 Exploração & Survival"},
  {id:54,nome:"Terraria",preco:32.99,promo:14.99,cat:"🌊 Exploração & Survival"},
  {id:55,nome:"Metro Exodus",preco:89.00,promo:14.99,cat:"🌊 Exploração & Survival"},
  {id:56,nome:"BioShock Collection",preco:119.00,promo:14.99,cat:"🌊 Exploração & Survival"},
  {id:57,nome:"Hollow Knight Silksong",preco:59.99,promo:14.99,cat:"🎯 Indie & Casual"},
  {id:58,nome:"Hollow Knight",preco:46.99,promo:14.99,cat:"🎯 Indie & Casual"},
  {id:59,nome:"COMBO Hollow Knight Silksong + Hollow Knight",preco:35.98,promo:24.59,cat:"🎁 Combos Especiais",tag:"sale"},
  {id:60,nome:"Little Nightmares 1 e 2 COMBO ESPECIAL!",preco:35.98,promo:28.99,cat:"🎁 Combos Especiais",tag:"sale"},
  {id:61,nome:"Little Nightmares 2",preco:127.50,promo:17.99,cat:"🎯 Indie & Casual"},
  {id:62,nome:"Little Nightmares",preco:127.50,promo:17.99,cat:"🎯 Indie & Casual"},
  {id:63,nome:"Cuphead",preco:36.99,promo:14.99,cat:"🎯 Indie & Casual"},
  {id:64,nome:"Stray",preco:74.90,promo:14.99,cat:"🎯 Indie & Casual"},
  {id:65,nome:"Slime Rancher",preco:36.99,promo:9.99,cat:"🎯 Indie & Casual"},
  {id:66,nome:"Overcooked 2",preco:59.90,promo:9.99,cat:"🎯 Indie & Casual"},
  {id:67,nome:"Little Kitty, Big City",preco:73.99,promo:14.99,cat:"🎯 Indie & Casual"},
  {id:68,nome:"Firewatch",preco:60.00,promo:9.99,cat:"🎯 Indie & Casual"},
  {id:69,nome:"Journey",preco:36.99,promo:9.99,cat:"🎯 Indie & Casual"},
  {id:70,nome:"Inside",preco:74.00,promo:9.99,cat:"🎯 Indie & Casual"},
  {id:71,nome:"Limbo",preco:37.00,promo:7.99,cat:"🎯 Indie & Casual"},
  {id:72,nome:"Ori and the Blind Forest",preco:37.00,promo:14.99,cat:"🎯 Indie & Casual"},
  {id:73,nome:"Ori and the Will of the Wisps",preco:129.00,promo:17.99,cat:"🎯 Indie & Casual"},
  {id:74,nome:"Far Cry 3",preco:59.99,promo:17.99,cat:"🔫 FPS & Tiro"}
];

  for (const g of DEFAULT_GAMES) {
    await pool.query(
      `INSERT INTO games (id,nome,preco,promo,cat,tag,img,link,estoque)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET preco=EXCLUDED.preco, promo=EXCLUDED.promo`,
      [g.id,g.nome,g.preco,g.promo||null,g.cat||null,g.tag||null,g.img||null,g.link||null,g.estoque||999]
    );
  }

  console.log('✅ Banco PostgreSQL inicializado!');
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function getSetting(key) {
  const row = await q1('SELECT value FROM settings WHERE key=$1', [key]);
  return row ? row.value : null;
}
async function setSetting(key, value) {
  await pool.query('INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2', [key, value]);
}
async function checkAdminPass(pass) {
  const dbPass = await getSetting('adminPass');
  const correctPass = dbPass ? dbPass : (process.env.ADMIN_PASS ? process.env.ADMIN_PASS : 'G7!qZ#2vL@9pXr$4Nw');
  return pass === correctPass;
}

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — JOGOS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/games', async (req, res) => {
  try {
    const rawGames = await q('SELECT * FROM games WHERE ativo=1 ORDER BY id');
    const seenNames = new Set();
    const uniqueGames = rawGames.filter(g => {
      const cleanName = (g.nome || '').trim().toLowerCase();
      if (seenNames.has(cleanName)) return false;
      seenNames.add(cleanName);
      return true;
    });
    res.json(uniqueGames);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/games', async (req, res) => {
  try {
    const { adminPass, nome, preco, promo, cat, tag, img, link, estoque, desc_txt, id: gameId } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    if (!nome || !preco) return res.status(400).json({ error: 'Nome e preco obrigatorios' });
    let result;
    if (gameId) {
      result = await q1(
        `INSERT INTO games (id,nome,preco,promo,cat,tag,img,link,estoque,desc_txt)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET nome=$2,preco=$3,promo=$4,cat=$5,tag=$6,img=$7,link=$8,estoque=$9,desc_txt=$10
         RETURNING id`,
        [gameId,nome,preco,promo||null,cat||null,tag||null,img||null,link||null,estoque||999,desc_txt||null]
      );
    } else {
      result = await q1(
        `INSERT INTO games (nome,preco,promo,cat,tag,img,link,estoque,desc_txt)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        [nome,preco,promo||null,cat||null,tag||null,img||null,link||null,estoque||999,desc_txt||null]
      );
    }
    res.json({ ok: true, id: result.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/games/:id', async (req, res) => {
  try {
    const { adminPass, nome, preco, promo, cat, tag, img, link, estoque, desc_txt } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    await pool.query(
      `UPDATE games SET nome=$1,preco=$2,promo=$3,cat=$4,tag=$5,img=$6,link=$7,estoque=$8,desc_txt=$9 WHERE id=$10`,
      [nome,preco,promo||null,cat||null,tag||null,img||null,link||null,estoque||999,desc_txt||null,req.params.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/games/:id', async (req, res) => {
  try {
    const { adminPass } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    await pool.query('UPDATE games SET ativo=0 WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — USUÁRIOS
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/users/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ error: 'Preencha todos os campos' });
    if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    const existing = await q1('SELECT id FROM users WHERE email=$1', [email]);
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });
    const hash = await bcrypt.hash(senha, 10);
    const result = await q1('INSERT INTO users (nome,email,senha) VALUES ($1,$2,$3) RETURNING id', [nome,email,hash]);
    res.json({ ok: true, user: { id: result.id, nome, email } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Preencha todos os campos' });
    const user = await q1('SELECT * FROM users WHERE email=$1', [email]);
    if (!user) return res.status(401).json({ error: 'Email ou senha incorretos' });
    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ error: 'Email ou senha incorretos' });
    res.json({ ok: true, user: { id: user.id, nome: user.nome, email: user.email } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — PEDIDOS
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/orders', async (req, res) => {
  try {
    const { user_id, c_nome, c_email, itens, valor } = req.body;
    if (!itens || !valor) return res.status(400).json({ error: 'Dados incompletos' });
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const j_nome = Array.isArray(itens) ? itens.map(i => i.nome).join(', ') : '';
    const result = await q1(
      `INSERT INTO orders (user_id,c_nome,c_email,j_nome,itens,valor,status,token)
       VALUES ($1,$2,$3,$4,$5,$6,'pendente',$7) RETURNING id`,
      [user_id||null,c_nome||'',c_email||'',j_nome,JSON.stringify(itens),valor,token]
    );
    
    // Gerar ou associar keys ativas exclusivas para este pedido
    const generatedKeys = [];
    for (const item of (Array.isArray(itens) ? itens : [])) {
      let gk = await q1(`SELECT * FROM game_keys WHERE game_id=$1 AND status='ativa' AND order_token IS NULL LIMIT 1`, [item.id]);
      if (gk) {
        await pool.query(`UPDATE game_keys SET order_token=$1 WHERE id=$2`, [token, gk.id]);
        generatedKeys.push(gk);
      } else {
        const cod = 'ASTRA-' + Math.random().toString(36).substring(2,6).toUpperCase() + '-' + Math.random().toString(36).substring(2,6).toUpperCase() + '-' + Date.now().toString().substring(9,13);
        const resultGk = await q1(`INSERT INTO game_keys (cod, game_id, game_nome, order_token) VALUES ($1, $2, $3, $4) RETURNING *`, [cod, item.id, item.nome, token]);
        generatedKeys.push(resultGk);
      }
    }
    
    res.json({ ok: true, id: result.id, token, keys: generatedKeys });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/token/:token', async (req, res) => {
  try {
    const order = await q1('SELECT * FROM orders WHERE token=$1', [req.params.token]);
    if (!order) return res.status(404).json({ error: 'Token inválido ou expirado' });
    if (order.usado) return res.status(410).json({ error: 'Este link já foi utilizado' });
    const itens = JSON.parse(order.itens || '[]');
    const itensComLink = await Promise.all(itens.map(async item => {
      const g = await q1('SELECT link,img FROM games WHERE id=$1', [item.id]);
      return { ...item, link: g?.link||null, img: g?.img||null };
    }));
    await pool.query("UPDATE orders SET usado=1,status='entregue' WHERE id=$1", [order.id]);
    res.json({ ok: true, order: { ...order, itens: itensComLink } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/user/:email', async (req, res) => {
  try {
    const orders = await q('SELECT * FROM orders WHERE c_email=$1 ORDER BY id DESC', [req.params.email]);
    res.json(orders.map(o => ({ ...o, itens: JSON.parse(o.itens||'[]') })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders', async (req, res) => {
  try {
    const { adminPass } = req.query;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    const orders = await q('SELECT * FROM orders ORDER BY id DESC');
    res.json(orders.map(o => ({ ...o, itens: JSON.parse(o.itens||'[]') })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { adminPass, status } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    await pool.query('UPDATE orders SET status=$1 WHERE id=$2', [status, req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — CUPONS
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/coupons/validate/:cod', async (req, res) => {
  try {
    const c = await q1("SELECT * FROM coupons WHERE cod=$1 AND ativo=1 AND usos<max", [req.params.cod.toUpperCase()]);
    if (!c) return res.status(404).json({ error: 'Cupom inválido ou esgotado' });
    res.json({ ok: true, desc: c.desconto });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/coupons/use/:cod', async (req, res) => {
  try {
    await pool.query("UPDATE coupons SET usos=usos+1 WHERE cod=$1", [req.params.cod.toUpperCase()]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/coupons', async (req, res) => {
  try {
    const { adminPass } = req.query;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    res.json(await q('SELECT * FROM coupons'));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/coupons', async (req, res) => {
  try {
    const { adminPass, cod, desc: desc_val, max } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    await pool.query('INSERT INTO coupons (cod,desconto,max) VALUES ($1,$2,$3) ON CONFLICT (cod) DO UPDATE SET desc=$2,max=$3',
      [cod.toUpperCase(), desc_val, max||100]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTAS — CONFIGURAÇÕES
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/settings', async (req, res) => {
  try {
    const adminPass = await getSetting('adminPass');
    res.json({
      pix: await getSetting('pix'),
      storeName: await getSetting('storeName'),
      discord: await getSetting('discord'),
      adminPass: adminPass ? adminPass : (process.env.ADMIN_PASS ? process.env.ADMIN_PASS : 'G7!qZ#2vL@9pXr$4Nw')
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', async (req, res) => {
  try {
    const { adminPass, pix, storeName, discord, newAdminPass } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    if (pix)          await setSetting('pix', pix);
    if (storeName)    await setSetting('storeName', storeName);
    if (discord)      await setSetting('discord', discord);
    if (newAdminPass) await setSetting('adminPass', newAdminPass);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  MERCADO PAGO — CHECKOUT PRO
// ════════════════════════════════════════════════════════════════════════════

const MP_TOKEN = process.env.MP_TOKEN || '';
const RAILWAY_URL = process.env.RAILWAY_URL || '';

app.post('/api/checkout', async (req, res) => {
  try {
    const { valor, nome, email, jogos, pedidoId } = req.body;
    if (!valor || valor <= 0) return res.status(400).json({ error: 'Valor inválido' });

    const extRef = pedidoId || ('astra-' + Date.now());
    const body = {
      items: [{ title: jogos || 'Jogos digitais — Astra Store', quantity: 1, unit_price: parseFloat(parseFloat(valor).toFixed(2)), currency_id: 'BRL' }],
      payer: { email: email || 'cliente@email.com', name: nome || 'Cliente' },
      external_reference: extRef,
      back_urls: {
        success: RAILWAY_URL + '/?pagamento=aprovado&ref=' + extRef,
        failure: RAILWAY_URL + '/?pagamento=falhou',
        pending: RAILWAY_URL + '/?pagamento=pendente'
      },
      auto_return: 'approved',
      notification_url: RAILWAY_URL + '/api/webhook',
      statement_descriptor: 'ASTRA STORE',
      binary_mode: true,
      payment_methods: { installments: 1 }
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok || !data.init_point) {
      console.error('[MP] Erro:', JSON.stringify(data));
      return res.status(400).json({ error: data.message || 'Erro ao criar checkout' });
    }
    res.json({ checkoutUrl: data.init_point, id: data.id });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

app.post('/api/pix', async (req, res) => {
  try {
    const { valor, nome, email, jogos, pedidoId } = req.body;
    const extRef = pedidoId || ('astra-' + Date.now());
    const body = {
      transaction_amount: parseFloat(parseFloat(valor).toFixed(2)),
      description: 'Astra Store — ' + (jogos || 'Jogos'),
      payment_method_id: 'pix',
      payer: { email: email, first_name: (nome||'Cliente').split(' ')[0], last_name: (nome||'Cliente').split(' ').slice(1).join(' ')||'Astra', identification: { type: 'CPF', number: '00000000000' } },
      external_reference: extRef,
      notification_url: RAILWAY_URL + '/api/webhook'
    };
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN, 'Content-Type': 'application/json', 'X-Idempotency-Key': extRef },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok || !data.point_of_interaction) {
      console.error('[MP PIX] Erro:', JSON.stringify(data));
      return res.status(400).json({ error: data.message || 'Erro ao gerar PIX' });
    }
    const pix = data.point_of_interaction.transaction_data;
    res.json({ mpId: data.id, qrCode: pix.qr_code, qrCodeBase64: pix.qr_code_base64, valor: parseFloat(valor), status: 'pending' });
  } catch(e) { console.error(e); res.status(500).json({ error: 'Erro interno' }); }
});

app.get('/api/pix/status/:mpId', async (req, res) => {
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments/' + req.params.mpId, {
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN }
    });
    const data = await response.json();
    if (data.status === 'approved' && data.external_reference) {
      await pool.query("UPDATE orders SET status='entregue' WHERE token=$1", [data.external_reference]);
    }
    res.json({ status: data.status, mpId: req.params.mpId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return res.sendStatus(200);
    const response = await fetch('https://api.mercadopago.com/v1/payments/' + data.id, {
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN }
    });
    const payment = await response.json();
    if (payment.status === 'approved' && payment.external_reference) {
      await pool.query("UPDATE orders SET status='entregue' WHERE token=$1", [payment.external_reference]);
      console.log('✅ Pagamento aprovado:', data.id);
    }
    res.sendStatus(200);
  } catch(e) { console.error(e); res.sendStatus(200); }
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTA PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
//  LAUNCHER & AUTOMATOR NATIVO (WINDOWS BATCH INSTALLER DINAÂMICO)
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
//  ROTA DE KEYS E LICENCAS (ADMIN DASHBOARD)
// ════════════════════════════════════════════════════════════════════════════

app.get('/api/game-keys', async (req, res) => {
  try {
    const { adminPass } = req.query;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    const keysRows = await q('SELECT * FROM game_keys ORDER BY id DESC');
    res.json(keysRows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/game-keys/batch', async (req, res) => {
  try {
    const { adminPass, gameId, gameNome, quantidade, codCustom } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    if (!gameId) return res.status(400).json({ error: 'Selecione um jogo obrigatorio.' });
    const count = parseInt(quantidade) || 1;
    const insertedKeys = [];
    
    if (codCustom && count === 1) {
      const g = await q1(`INSERT INTO game_keys (cod, game_id, game_nome) VALUES ($1, $2, $3) RETURNING *`, [codCustom.trim().toUpperCase(), gameId, gameNome || 'Jogo Astra']);
      insertedKeys.push(g);
    } else {
      for (let i = 0; i < count; i++) {
        const cod = 'ASTRA-' + Math.random().toString(36).substring(2,6).toUpperCase() + '-' + Math.random().toString(36).substring(2,6).toUpperCase() + '-' + (Math.floor(Math.random()*8900)+1000);
        const g = await q1(`INSERT INTO game_keys (cod, game_id, game_nome) VALUES ($1, $2, $3) RETURNING *`, [cod, gameId, gameNome || 'Jogo Astra']);
        insertedKeys.push(g);
      }
    }
    res.json({ ok: true, generated: insertedKeys });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/game-keys/:id/status', async (req, res) => {
  try {
    const { adminPass, status } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    await pool.query('UPDATE game_keys SET status=$1 WHERE id=$2', [status, req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/game-keys/:id', async (req, res) => {
  try {
    const { adminPass } = req.body;
    if (!await checkAdminPass(adminPass)) return res.status(401).json({ error: 'Senha incorreta' });
    await pool.query('DELETE FROM game_keys WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
//  ROTA DE VALIDACAO E ATIVACAO NATIVA (ASTRA LAUNCHER APP)
// ════════════════════════════════════════════════════════════════════════════

app.post('/api/launcher/activate', async (req, res) => {
  try {
    const { cod, user_email, dispositivo } = req.body;
    if (!cod) return res.status(400).json({ error: 'Insira sua Activation Key (Chave de Ativacao).' });
    
    const keyRow = await q1('SELECT * FROM game_keys WHERE cod=$1', [cod.trim().toUpperCase()]);
    if (!keyRow) return res.status(404).json({ error: 'Key incorreta, inexistente ou nao localizada na Astra Store.' });
    if (keyRow.status === 'bloqueada') return res.status(403).json({ error: 'Esta Key foi revogada pela seguranca ou está bloqueada.' });
    if (keyRow.status === 'usada') return res.status(409).json({ error: 'Esta Key ja foi autenticada e ativada anteriormente em outro computador.' });
    
    // Key ativa e valida! Buscar dados completos do titulo
    const gameRow = await q1('SELECT * FROM games WHERE id=$1', [keyRow.game_id]);
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    
    const updatedKey = await q1(
      `UPDATE game_keys SET status='usada', ativado_em=NOW()::TEXT, user_email=$1, dispositivo=$2, ip=$3 WHERE cod=$4 RETURNING *`,
      [user_email || 'cliente@astra.store', dispositivo || 'Astra Desktop Windows (x64)', ip, keyRow.cod]
    );
    
    res.json({ ok: true, key: updatedKey, game: gameRow || { id: keyRow.game_id, nome: keyRow.game_nome, img: null, link: null } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/success/:token', async (req, res) => {
  try {
    const orderRow = await q1('SELECT * FROM orders WHERE token=$1', [req.params.token]);
    if (!orderRow) return res.status(404).json({ error: 'Pedido nao localizado no sistema.' });
    const keyRows = await q('SELECT * FROM game_keys WHERE order_token=$1', [req.params.token]);
    res.json({ ok: true, order: orderRow, keys: keyRows });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/automator', async (req, res) => {
  try {
    const { key, game } = req.query;
    const gameTitle = game ? game : 'Astra Game';
    
    // Constrói um instalador Windows nativo premium com cores, logos e automação de Steam
    const batScript = `@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
mode con: cols=120 lines=40
title Astra Launcher Automator — Ativação Oficial de Jogos

:: Identificar arquivo .zip automaticamente no diretorio
set "zipFile="
for /f "delims=" %%Z in ('dir /b *.zip 2^>nul') do (
    set "zipFile=%%Z"
    goto FoundZip
)
:FoundZip

:: Detectar caminho da Steam via Registro do Windows
for /f "tokens=3*" %%A in ('reg query "HKCU\\Software\\Valve\\Steam" /v SteamExe 2^>nul') do (
    set "steamExe=%%A %%B"
)
if not defined steamExe (
    echo [ERRO] Nao foi possivel localizar o caminho da Steam no seu Registro do Windows.
    echo Por favor, abra a Steam manualmente pelo menos uma vez ou instale a Steam.
    pause
    exit /b
)
for %%A in ("%steamExe%") do set "steamDir=%%~dpA"
set "steamDir=%steamDir:~0,-1%"

:: Cores para o gradiente de tema Cyber-Purple Astra
set "ESC= "
set "corBaseR=180"
set "corBaseG=0"
set "corBaseB=255"
set "variacaoR=40"
set "variacaoG=0"
set "variacaoB=-80"
for /L %%j in (0,1,98) do (
    set /a "corR=corBaseR + (variacaoR * %%j / 98)"
    set /a "corG=corBaseG + (variacaoG * %%j / 98)"
    set /a "corB=corBaseB + (variacaoB * %%j / 98)"
    set "esc[%%j]=!ESC![38;2;!corR!;!corG!;!corB!m"
)

:: Banner Oficial Astra Store Premium
set "lines[0]=                                                                        "
set "lines[1]=                                                                        "
set "lines[2]=   █████  ███████ ████████ ██████   █████                              "
set "lines[3]=  ██   ██ ██         ██    ██   ██ ██   ██                             "
set "lines[4]=  ███████ ███████    ██    ██████  ███████                             "
set "lines[5]=  ██   ██      ██    ██    ██   ██ ██   ██                             "
set "lines[6]=  ██   ██ ███████    ██    ██   ██ ██   ██                             "
set "lines[7]=                                                                        "

:Menu
cls
for /L %%i in (0,1,7) do (
    set "line=!lines[%%i]!"
    set "colored="
    for /L %%j in (0,1,98) do (
        set "char=!line:~%%j,1!"
        if "!char!"==" " (set "char= ")
        set "colored=!colored!!esc[%%j]!!char!"
    )
    echo(!colored!!ESC![0m
)
echo.
echo !ESC![38;2;0;240;255m================================================================================!ESC![0m
echo   NOME DO JOGO : ${gameTitle}
echo   CHAVE DE ATIVACAO: ${key || 'ASTRA-GAME-PREMIUM-KEY-9942'}
echo   CAMINHO STEAM: %steamDir%
echo !ESC![38;2;0;240;255m================================================================================!ESC![0m
echo.
echo   1. Instalar Jogo na Steam Automaticamente
echo   2. Desinstalar Jogos (Limpar titulos ativados e depotcache da Steam)
echo   3. Sair do Instalador
echo.
set /p option=!ESC![38;2;236;72;153mEscolha uma opcao para iniciar a automacao: !ESC![0m

if "%option%"=="1" (
    call :InstalarJogos
    pause
    goto Menu
) else if "%option%"=="2" (
    call :DesinstalarArquivos
    pause
    goto Menu
) else if "%option%"=="3" (
    exit /b
) else (
    echo [AVISO] Opcao invalida!
    timeout /t 1 >nul
    goto Menu
)
goto :eof

:: ================================================================================
:: INSTALAR JOGOS NA STEAM AUTOMATICAMENTE
:: ================================================================================
:InstalarJogos
if not defined zipFile (
    echo.
    echo !ESC![38;2;239;68;68m[ERRO] Nenhum arquivo .zip do jogo foi encontrado na pasta atual.!ESC![0m
    echo Por favor, coloque este script AstraAutomator.bat na mesma pasta onde voce baixou o arquivo .zip do jogo.
    echo.
    pause
    goto :eof
)

echo.
echo [1/4] Fechando processos da Steam em segundo plano...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process steam -ErrorAction SilentlyContinue | Stop-Process -Force"

:AwaitClose
tasklist | find /i "steam.exe" >nul
if not errorlevel 1 (
    timeout /t 1 >nul
    goto AwaitClose
)

echo [2/4] Extraindo e injetando novos arquivos na sua biblioteca Steam...
echo Arquivo zip detectado: %zipFile%
echo Destino na Steam    : %steamDir%
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -Path '%zipFile%' -DestinationPath '%steamDir%' -Force"

echo [3/4] Limpando e ajustando caches residuais para sincronizacao limpa...
for %%F in (
    "%steamDir%\\cache"
    "%steamDir%\\temp"
    "%steamDir%\\tmp"
    "*.tmp"
    "*.bak"
) do (
    if exist %%~F (
        rd /s /q "%%~F" >nul 2>&1
        del /f /q "%%~F" >nul 2>&1
    )
)

echo [4/4] Processo concluido com sucesso! Reabrindo a Steam...
start "" "%steamExe:"=%"
echo.
echo !ESC![38;2;16;185;129m[SUCESSO] O jogo ${gameTitle} foi instalado e sincronizado na sua Steam com exito!!ESC![0m
echo.
echo Pressione qualquer tecla para voltar ao menu Astra Store...
pause >nul
goto Menu

:: ================================================================================
:: DESINSTALAR JOGOS E LIMPAR PLUGINS STEAM
:: ================================================================================
:DesinstalarArquivos
echo.
echo Fechando a Steam antes da desinstalacao...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process steam -ErrorAction SilentlyContinue | Stop-Process -Force"

:AwaitClose2
tasklist | find /i "steam.exe" >nul
if not errorlevel 1 (
    timeout /t 1 >nul
    goto AwaitClose2
)

echo Inspecionando plugins e depotcache...
set "pasta1=%steamDir%\\config\\stplug-in"
set "pasta2=%steamDir%\\depotcache"

if exist "%pasta1%" (
    echo - Removendo stplug-in...
    rd /s /q "%pasta1%"
) else (
    echo - Nenhum stplug-in residual localizado.
)

if exist "%pasta2%" (
    echo - Removendo depotcache...
    rd /s /q "%pasta2%"
) else (
    echo - Depotcache ja esta completamente limpo.
)

echo.
echo !ESC![38;2;16;185;129m[SUCESSO] Limpeza de desinstalacao concluida perfeitamente!!ESC![0m
echo Reabrindo a Steam...
start "" "%steamExe:"=%"
goto :eof
`;
    
    res.setHeader('Content-disposition', 'attachment; filename=AstraAutomator.bat');
    res.setHeader('Content-type', 'application/x-msdos-program');
    res.send(batScript);
  } catch(e) { console.error(e); res.status(500).send('Erro ao gerar automator bat'); }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Iniciar ─────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => console.log('✅ Astra Store rodando na porta ' + PORT));
}).catch(e => {
  console.error('❌ Erro ao iniciar banco:', e);
  process.exit(1);
});
