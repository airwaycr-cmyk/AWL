const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const WA_TOKEN        = process.env.WA_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN    = process.env.VERIFY_TOKEN || "airwaycr_verify_2024";
const ANTHROPIC_KEY   = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_KEY    = process.env.AIRTABLE_API_KEY;
const PORT            = process.env.PORT || 3000;

// ─── AIRTABLE IDs (Airway Logistics CRM) ─────────────────────────────────────
const AT_BASE    = "appwqo95MZSiJ15BB";
const AT_CLIENTES = "tblCghaRGBumZUtOt";
const AT_CONVOS   = "tblnfHkk9lvxyOXI6";

const FIELDS_CLIENTES = {
  nombre:         "fldx5kjfU24oilb1F",
  telefono:       "fld0Cv2M6ykMCSE0B",
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
const SYSTEM_PROMPT = `Eres el asistente virtual oficial de Airway Logistics (airwaycr.co), empresa de freight forwarding con sede en Costa Rica.

## EMPRESA
- Almacén en Doral, Florida, USA
- Ruta principal: USA → Costa Rica
- Email: airwaycr@gmail.com
- Servicios: Flete aéreo y marítimo (también desde China)

## TARIFAS
- Aéreo: por libra (pedí peso estimado para cotizar)
- Marítimo: por pie cúbico (pedí medidas para cotizar)

## PROCESO
1. Cliente compra en USA → envía a nuestro almacén en Doral, FL
2. Nosotros consolidamos y enviamos a Costa Rica (aduanas incluidas)

## REGLAS
- Respondé siempre en el idioma del cliente
- Respuestas cortas y claras
- Para cotizar: pedí tipo de servicio, peso/medidas, descripción del producto
- Para tracking: pedí número de rastreo
- Si no podés resolver: "Un asesor te contactará pronto"
- Nunca inventes precios sin datos del envío
- Firmá como: "Equipo Airway Logistics 🚀"

## DETECCIÓN DE TEMA
Al final de cada respuesta, en una línea oculta con formato JSON escribe exactamente:
{"tema":"TEMA"} donde TEMA es uno de: Cotización, Tracking, Información general, Registro, Reclamo, Otro`;

// ─── SESIONES EN MEMORIA ──────────────────────────────────────────────────────
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

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
function extraerTema(texto) {
  try {
    const match = texto.match(/\{"tema":"([^"]+)"\}/);
    return match ? match[1] : "Otro";
  } catch { return "Otro"; }
}

function limpiarRespuesta(texto) {
  return texto.replace(/\{"tema":"[^"]+"\}/g, "").trim();
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
  const reply = limpiarRespuesta(raw);
  addToHistory(phone, "assistant", reply);
  return { reply, tema };
}

// ─── WHATSAPP ─────────────────────────────────────────────────────────────────
async function sendWA(to, message) {
  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    { messaging_product: "whatsapp", to, type: "text", text: { body: message } },
    { headers: { Authorization: `Bearer ${WA_TOKEN}`, "Content-Type": "application/json" } }
  );
}

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
    const { reply, tema } = await askClaude(phone, texto);
    console.log(`🤖 Claude [${tema}]: ${reply.substring(0, 60)}...`);

    // 3. Enviar respuesta por WhatsApp
    await sendWA(phone, reply);

    // 4. Loguear conversación en Airtable
    await logConversacion(phone, texto, reply, tema);

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
