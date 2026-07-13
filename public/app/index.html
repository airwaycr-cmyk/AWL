const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// CORS para permitir llamadas desde airwaycr.com
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// ─── APP PWA (Airway Logistics) ───────────────────────────────────────────────
app.use(express.static("public"));

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const WA_TOKEN        = process.env.WA_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN    = process.env.VERIFY_TOKEN || "airwaycr_verify_2024";
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_KEY    = process.env.AIRTABLE_API_KEY;
const PORT = process.env.PORT || 8080;

// ─── AIRTABLE IDs (Airway Logistics CRM) ─────────────────────────────────────
const AT_BASE    = "appwqo95MZSiJ15BB";
const AT_CLIENTES = "tblCghaRGBumZUtOt";
const AT_CONVOS   = "tblnfHkk9lvxyOXI6";
const AT_COTIZACIONES = "tblgWhnlB3XSij0fo";

const FIELDS_COTIZACIONES = {
  idCotizacion:     "fldwG2AOGKEBP3yD1",
  tipoFlete:        "fldKEncqqggrpU9qL",
  origen:           "fldxJadIvPFTjUj6d",
  peso:             "fld6gXEGKtJ8DAn7Z",
  volumen:          "fldrGMAMOFQcGWXiY",
  total:            "fld0nwlGTJLgE6Sae",
  estado:           "fldblRpPYJtloGcrW",
  descripcion:      "fldLrNOldBOo3eTuc",
  fecha:            "fldeutXNxeUBvs6Qk",
  generadaPor:      "fldC6zWKEdPkuL0UV",
};

const FIELDS_CLIENTES = {
  nombre:         "fldx5kjfU24oilb1F",
  telefono:       "fld0Cv2M6ykMCSE0B",
  email:          "fldPAJinkBQMxM5Ti",
  direccion:      "fldsObhq7zoxvHD1R",
  tipoCliente:    "fldeVk4qA0BGoFws0",
  servicioInteres:"fld63IwUy9ItXJ8Nj",
  estado:         "fldZStJtqlc3bfBg3",
  primerContacto: "fldyJVIgrCFsF9Ihp",
  ultimoContacto: "fld9vBwgMpzALpn2c",
  primerMensaje:  "fldrNzJ0GAokB7GHi",
  canalOrigen:    "fld9ZwoGWkMvfvoRs",
};

const FIELDS_CONVOS = {
  telefono:       "fldTAd0IGCkK1mP9v",
  fecha:          "fldFAyemg6DN1TiQE",
  msgCliente:     "fld6Lt0HEeGBn2sFZ",
  respuestaBot:   "fldRbx9orgBfYaULM",
  temaDetectado:  "fldkE3PdTdd3dTJrV",
  escalado:       "fldaXkISxBFqZ4O4c",
};

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres el asistente virtual oficial de Airway Logistics (airwaycr.com), empresa de freight forwarding con sede en Costa Rica.

## EMPRESA
- Almacén en Doral, Florida, USA
- Ruta principal: USA → Costa Rica
- Email: airwaycr@gmail.com
- Servicios: Flete aéreo y marítimo (también desde China)

## TARIFAS (úsalas para cotizar automáticamente, nunca inventes precios)

### Flete Aéreo
- Desde USA (Miami): $7 por libra
- Desde China: $18 por libra

### Flete Marítimo
- Desde USA (Miami): $30 por pie cúbico
- Desde China: $40 por pie cúbico

## REGLAS DE CÁLCULO (MUY IMPORTANTE)
- El cobro mínimo es 1 libra (aéreo) o 1 pie cúbico (marítimo)
- SIEMPRE redondea hacia arriba al número entero siguiente antes de calcular:
  - Ejemplo: 2.5 libras → se cobra como 3 libras
  - Ejemplo: 0.3 libras → se cobra como 1 libra
  - Ejemplo: 2.5 pies cúbicos → se cobra como 3 pies cúbicos
- NUNCA le menciones al cliente que redondeaste o que existe una política de redondeo — simplemente da el precio final ya calculado
- Fórmula: precio = libras_redondeadas × tarifa_por_libra (o pies_cúbicos_redondeados × tarifa_por_pie_cúbico)

## CÓMO COTIZAR
Cuando el cliente pida una cotización, seguí este orden:
1. Preguntá: ¿aéreo o marítimo?
2. Preguntá: ¿desde USA o desde China?
3. Preguntá: peso en libras (aéreo) o medidas largo x ancho x alto en pulgadas o pies (marítimo, para calcular pies cúbicos)
4. Con esos datos, calculá el precio exacto usando las tarifas de arriba y las reglas de redondeo
5. Da el precio final de forma clara y directa, por ejemplo: "El envío de tu paquete de 3 libras por aéreo desde Miami cuesta $21.00 🚀"

Si el cliente no da las medidas exactas para marítimo, ayudale a calcular el pie cúbico: pie³ = (largo × ancho × alto en pulgadas) ÷ 1728

## PROCESO GENERAL
1. Cliente compra en USA → envía a nuestro almacén en Doral, FL
2. Nosotros consolidamos y enviamos a Costa Rica (aduanas incluidas)

## REGLAS GENERALES
- Respondé siempre en el idioma del cliente
- Respuestas cortas y claras
- Para tracking: pedí número de rastreo
- Si no podés resolver algo fuera de cotizaciones: "Un asesor te contactará pronto"
- Firmá como: "Equipo Airway Logistics 🚀"

## DETECCIÓN DE TEMA Y COTIZACIÓN
Al final de cada respuesta, agregá SIEMPRE una línea oculta con formato JSON exacto:
{"tema":"TEMA"} donde TEMA es uno de: Cotización, Tracking, Información general, Registro, Reclamo, Otro

Si en tu respuesta acabas de dar un precio final de cotización, agregá ADEMÁS otra línea oculta exacta:
{"cotizacion":{"tipo":"aereo o maritimo","origen":"usa o china","cantidad":NUMERO_REDONDEADO,"total":PRECIO_FINAL}}`;

// ─── TARIFAS Y CÁLCULO COMPARTIDO (bot + app) ────────────────────────────────
const TARIFAS = {
  aereo:     { usa: 7,  china: 18 },
  maritimo:  { usa: 30, china: 40 },
};

function calcularCotizacion(tipo, origen, cantidad) {
  const redondeado = Math.ceil(cantidad);
  const tarifa = TARIFAS[tipo]?.[origen];
  if (!tarifa) return null;
  const total = redondeado * tarifa;
  return { tipo, origen, cantidad: redondeado, tarifaUnitaria: tarifa, total };
}

// ─── SESIONES DE CHAT DE LA APP (separadas de WhatsApp) ──────────────────────
const appSessions = new Map();

function getAppHistory(sessionId) {
  if (!appSessions.has(sessionId)) appSessions.set(sessionId, []);
  return appSessions.get(sessionId);
}


const sessions = new Map();

function getHistory(phone) {
  if (!sessions.has(phone)) sessions.set(phone, []);
  return sessions.get(phone);
}

function addToHistory(phone, role, content) {
  const h = getHistory(phone);
  h.push({ role, content });
  if (h.length > 20) h.splice(0, 2);
}

// ─── AIRTABLE HELPERS ─────────────────────────────────────────────────────────
const atHeaders = () => ({
  Authorization: `Bearer ${AIRTABLE_KEY}`,
  "Content-Type": "application/json",
});

async function buscarCliente(phone) {
  try {
    const formula = encodeURIComponent(`{${FIELDS_CLIENTES.telefono}}="${phone}"`);
    const res = await axios.get(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_CLIENTES}?filterByFormula=${formula}&maxRecords=1`,
      { headers: atHeaders() }
    );
    return res.data.records?.[0] || null;
  } catch (e) {
    console.error("AT buscarCliente:", e.message);
    return null;
  }
}

async function crearCliente(phone, primerMensaje) {
  try {
    const ahora = new Date().toISOString();
    const res = await axios.post(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_CLIENTES}`,
      {
        records: [{
          fields: {
            [FIELDS_CLIENTES.nombre]:         `Cliente ${phone.slice(-4)}`,
            [FIELDS_CLIENTES.telefono]:       phone,
            [FIELDS_CLIENTES.estado]:         "Lead",
            [FIELDS_CLIENTES.primerContacto]: ahora,
            [FIELDS_CLIENTES.ultimoContacto]: ahora,
            [FIELDS_CLIENTES.primerMensaje]:  primerMensaje,
            [FIELDS_CLIENTES.canalOrigen]:    "WhatsApp Bot",
          }
        }]
      },
      { headers: atHeaders() }
    );
    console.log(`✅ AT: cliente creado ${phone}`);
    return res.data.records[0];
  } catch (e) {
    console.error("AT crearCliente:", e.message);
    return null;
  }
}

async function actualizarUltimoContacto(recordId) {
  try {
    await axios.patch(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_CLIENTES}`,
      {
        records: [{
          id: recordId,
          fields: { [FIELDS_CLIENTES.ultimoContacto]: new Date().toISOString() }
        }]
      },
      { headers: atHeaders() }
    );
  } catch (e) {
    console.error("AT actualizarContacto:", e.message);
  }
}

async function logConversacion(phone, msgCliente, respuestaBot, tema) {
  try {
    await axios.post(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_CONVOS}`,
      {
        records: [{
          fields: {
            [FIELDS_CONVOS.telefono]:      phone,
            [FIELDS_CONVOS.fecha]:         new Date().toISOString(),
            [FIELDS_CONVOS.msgCliente]:    msgCliente,
            [FIELDS_CONVOS.respuestaBot]:  respuestaBot,
            [FIELDS_CONVOS.temaDetectado]: tema,
            [FIELDS_CONVOS.escalado]:      false,
          }
        }]
      },
      { headers: atHeaders() }
    );
    console.log(`📝 AT: conversación logueada [${tema}]`);
  } catch (e) {
    console.error("AT logConversacion:", e.message);
  }
}

// ─── DETECCIÓN Y REGISTRO DE COTIZACIONES ────────────────────────────────────
function extraerCotizacion(texto) {
  try {
    const match = texto.match(/\{"cotizacion":(\{[^}]+\})\}/);
    return match ? JSON.parse(match[1]) : null;
  } catch { return null; }
}

async function logCotizacion(phone, cot) {
  try {
    const idCot = `COT-${Date.now()}`;
    await axios.post(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_COTIZACIONES}`,
      {
        records: [{
          fields: {
            [FIELDS_COTIZACIONES.idCotizacion]: idCot,
            [FIELDS_COTIZACIONES.tipoFlete]:    cot.tipo === "aereo" ? "Aéreo" : "Marítimo",
            [FIELDS_COTIZACIONES.origen]:       cot.origen === "china" ? "China" : "USA",
            [FIELDS_COTIZACIONES.peso]:         cot.tipo === "aereo" ? cot.cantidad : null,
            [FIELDS_COTIZACIONES.volumen]:      cot.tipo === "maritimo" ? cot.cantidad : null,
            [FIELDS_COTIZACIONES.total]:        cot.total,
            [FIELDS_COTIZACIONES.estado]:       "Enviada",
            [FIELDS_COTIZACIONES.descripcion]:  `Cotización automática para ${phone}`,
            [FIELDS_COTIZACIONES.fecha]:        new Date().toISOString(),
            [FIELDS_COTIZACIONES.generadaPor]:  "Bot WhatsApp",
          }
        }]
      },
      { headers: atHeaders() }
    );
    console.log(`💰 AT: cotización registrada ${idCot} - $${cot.total}`);
  } catch (e) {
    console.error("AT logCotizacion:", e.message);
  }
}

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
function extraerTema(texto) {
  try {
    const match = texto.match(/\{"tema":"([^"]+)"\}/);
    return match ? match[1] : "Otro";
  } catch { return "Otro"; }
}

function limpiarRespuesta(texto) {
  return texto
    .replace(/\{"tema":"[^"]+"\}/g, "")
    .replace(/\{"cotizacion":\{[^}]+\}\}/g, "")
    .trim();
}

async function askClaude(phone, userMessage) {
  addToHistory(phone, "user", userMessage);
  const res = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: getHistory(phone),
    },
    {
      headers: {
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
    }
  );
  const raw = res.data.content.map((b) => b.text || "").join("");
  const tema = extraerTema(raw);
  const cotizacion = extraerCotizacion(raw);
  const reply = limpiarRespuesta(raw);
  addToHistory(phone, "assistant", reply);
  return { reply, tema, cotizacion };
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
async function sendWA(to, message) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: "whatsapp", to, type: "text", text: { body: message } },
    { headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" } }
  );
}

// ─── REGISTRO DE CASILLERO DESDE LA WEB ───────────────────────────────────────
app.post("/register-web-lead", async (req, res) => {
  try {
    const { nombre, tel, addr, email } = req.body;

    if (!nombre || !tel || !email) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const ahora = new Date().toISOString();
    const atRes = await axios.post(
      `https://api.airtable.com/v0/${AT_BASE}/${AT_CLIENTES}`,
      {
        records: [{
          fields: {
            [FIELDS_CLIENTES.nombre]:         nombre,
            [FIELDS_CLIENTES.telefono]:       tel,
            [FIELDS_CLIENTES.email]:          email,
            [FIELDS_CLIENTES.direccion]:      addr || "",
            [FIELDS_CLIENTES.tipoCliente]:    "Persona",
            [FIELDS_CLIENTES.servicioInteres]:["Aéreo USA-CR"],
            [FIELDS_CLIENTES.estado]:         "Lead",
            [FIELDS_CLIENTES.primerContacto]: ahora,
            [FIELDS_CLIENTES.ultimoContacto]: ahora,
            [FIELDS_CLIENTES.primerMensaje]:  "Registro web - Casillero Miami",
            [FIELDS_CLIENTES.canalOrigen]:    "Web",
          }
        }]
      },
      { headers: atHeaders() }
    );

    console.log(`🆕 Nuevo casillero web: ${nombre} (${tel})`);
    res.json({ success: true, recordId: atRes.data.records[0].id });

  } catch (err) {
    console.error("❌ Error registro web:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al registrar" });
  }
});

// ─── API DE LA APP ────────────────────────────────────────────────────────────

// Cotizador
app.post("/api/quote", (req, res) => {
  const { tipo, origen, cantidad } = req.body;
  if (!tipo || !origen || !cantidad) {
    return res.status(400).json({ error: "Faltan datos: tipo, origen, cantidad" });
  }
  const resultado = calcularCotizacion(tipo, origen, parseFloat(cantidad));
  if (!resultado) return res.status(400).json({ error: "Tipo u origen inválido" });
  res.json(resultado);
});

// Rastreo (pendiente integración con Fuzion Cargo — respuesta honesta por ahora)
app.get("/api/track/:trackingNumber", (req, res) => {
  res.json({
    status: "En revisión",
    message: `Recibimos tu consulta para el número ${req.params.trackingNumber}. El rastreo en tiempo real todavía está en integración — un asesor te va a confirmar el estado por WhatsApp pronto.`,
  });
});

// Chat con Claude (para la app, sesión separada de WhatsApp)
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
      return res.status(400).json({ error: "Faltan datos: message, sessionId" });
    }

    const history = getAppHistory(sessionId);
    history.push({ role: "user", content: message });
    if (history.length > 20) history.splice(0, 2);

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: history,
      },
      {
        headers: {
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      }
    );

    const raw = response.data.content.map((b) => b.text || "").join("");
    const reply = limpiarRespuesta(raw);
    history.push({ role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error("❌ Error /api/chat:", err.response?.data || err.message);
    res.status(500).json({ error: "Error al procesar el mensaje" });
  }
});

// ─── WEBHOOK VERIFICATION ─────────────────────────────────────────────────────
app.get("/webhook", (req, res) => {
  const { "hub.mode": mode, "hub.verify_token": token, "hub.challenge": challenge } = req.query;
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ─── WEBHOOK RECEIVER ─────────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg) return;

    const phone = msg.from;
    const tipo  = msg.type;
    console.log(`📩 ${phone} [${tipo}]`);

    if (tipo !== "text") {
      await sendWA(phone, "Por el momento solo proceso mensajes de texto. ¿En qué te puedo ayudar? 😊\n\n— Equipo Airway Logistics 🚀");
      return;
    }

    const texto = msg.text.body;
    console.log(`💬 ${phone}: ${texto}`);

    // 1. Buscar o crear cliente en Airtable
    let cliente = await buscarCliente(phone);
    if (!cliente) {
      cliente = await crearCliente(phone, texto);
      console.log(`🆕 Nuevo lead: ${phone}`);
    } else {
      await actualizarUltimoContacto(cliente.id);
      console.log(`🔄 Cliente existente actualizado: ${phone}`);
    }

    // 2. Llamar a Claude
    const { reply, tema, cotizacion } = await askClaude(phone, texto);
    console.log(`🤖 Claude [${tema}]: ${reply.substring(0, 60)}...`);

    // 3. Enviar respuesta por WhatsApp
    await sendWA(phone, reply);

    // 4. Loguear conversación en Airtable
    await logConversacion(phone, texto, reply, tema);

    // 5. Si se generó una cotización, guardarla también
    if (cotizacion) {
      await logCotizacion(phone, cotizacion);
    }

  } catch (err) {
    console.error("❌ Error:", err.response?.data || err.message);
  }
});

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "running", bot: "Airway Logistics WhatsApp Agent", version: "1.1.0" });
});

app.listen(PORT, () => {
  console.log(`🚀 Airway Bot v1.1.0 en puerto ${PORT}`);
});
