(() => {
  'use strict';

  /*
   * DAVID · AIRWAY · v3.2
   * Flujo migrado desde WhatsAppSim.jsx del sitio oficial.
   * La lógica, condiciones, tarifas, direcciones, integraciones y advertencias
   * se conservan. La redacción fue mejorada únicamente para que David sea más
   * claro, profesional y fácil de entender.
   */

  const REGISTER_ENDPOINT = 'https://awl-production.up.railway.app/register-web-lead';
  const TRACKING_ENDPOINT = 'https://app.fuzioncargo.com/index.php/v3/package/';
  const CHAT_ENDPOINT = 'https://awl-production.up.railway.app/api/chat';
  const WHATSAPP = 'https://wa.me/50685221000';
  const TAX_DOCUMENT = 'img/taxExemption.png';

  function chatSessionId() {
    let id = null;
    try { id = localStorage.getItem('david_session_id'); } catch (_) {}
    if (!id) {
      id = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      try { localStorage.setItem('david_session_id', id); } catch (_) {}
    }
    return id;
  }

  const modal = document.getElementById('davidModal');
  const messagesEl = document.getElementById('davidMessages');
  const quickEl = document.getElementById('davidQuick');
  const form = document.getElementById('davidForm');
  const input = document.getElementById('davidInput');

  if (!modal || !messagesEl || !quickEl || !form || !input) return;

  let step = 'greeting';
  let draft = {};
  let typingEl = null;
  let conversationId = 0;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const strong = (text) => ({ type: 'strong', text });
  const br = () => ({ type: 'br' });
  const link = (text, href) => ({ type: 'link', text, href });

  function whatsappUrl(message = 'Hola, necesito ayuda con una consulta de AirWay.') {
    return `${WHATSAPP}?text=${encodeURIComponent(message)}`;
  }

  function launchWhatsApp(url) {
    // Debe ejecutarse directamente desde el clic o envío del usuario para que
    // Safari y Chrome móvil no lo bloqueen como ventana emergente.
    try {
      const opened = window.open(url, '_blank');
      if (opened) {
        try { opened.opener = null; } catch (_) {}
        return true;
      }
    } catch (_) {}

    // Respaldo seguro: abre WhatsApp en la misma pestaña cuando el navegador
    // bloquea la nueva ventana. El usuario puede volver al sitio después.
    window.location.assign(url);
    return false;
  }

  function whatsappHandoffParts(message, url) {
    return [
      message, br(), br(),
      link('📲 Abrir WhatsApp ahora', url), br(),
      'Si WhatsApp no se abre automáticamente, tocá el enlace anterior.'
    ];
  }

  function scrollBottom() {
    requestAnimationFrame(() => messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' }));
  }

  function addMessage(content, direction = 'in') {
    const row = document.createElement('div');
    row.className = `message message--${direction}`;
    const bubble = document.createElement('div');
    bubble.className = 'message__bubble';
    if (content instanceof Node) bubble.appendChild(content);
    else bubble.textContent = content;
    row.appendChild(bubble);
    messagesEl.appendChild(row);
    scrollBottom();
    return row;
  }

  function addHtml(parts, direction = 'in') {
    const fragment = document.createDocumentFragment();
    parts.forEach((part) => {
      if (typeof part === 'string') {
        fragment.append(document.createTextNode(part));
      } else if (part?.type === 'br') {
        fragment.append(document.createElement('br'));
      } else if (part?.type === 'strong') {
        const element = document.createElement('strong');
        element.textContent = part.text;
        fragment.append(element);
      } else if (part?.type === 'link') {
        const element = document.createElement('a');
        element.href = part.href;
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
        if (/wa\.me\//i.test(part.href)) element.className = 'message__whatsapp-link';
        element.textContent = part.text;
        fragment.append(element);
      }
    });
    return addMessage(fragment, direction);
  }

  function addAddressCard(kind, data) {
    const card = document.createElement('div');
    card.className = `message-card message-card--${kind === 'residential' ? 'residential' : 'tax'}`;

    const label = document.createElement('small');
    label.textContent = kind === 'residential'
      ? '🏠 Dirección residencial · Miami'
      : '📦 Dirección de bodega · Miami';

    const heading = document.createElement('strong');
    heading.textContent = data.name;

    const lines = document.createElement('p');
    const addressLines = kind === 'residential'
      ? [data.line1, data.line2, data.line3, data.country, data.phone]
      : [data.line1, data.line2, data.line3, data.phone];
    lines.textContent = addressLines.join('\n');

    const note = document.createElement('div');
    note.className = 'message-card__note';
    note.textContent = kind === 'residential'
      ? '⚠️ Usá esta dirección solo para tiendas que no envían a casilleros'
      : '✓ Libre de impuesto de Florida';

    card.append(label, heading, lines, note);
    messagesEl.appendChild(card);
    scrollBottom();
  }

  function showTyping() {
    hideTyping();
    typingEl = document.createElement('div');
    typingEl.className = 'message-typing';
    typingEl.innerHTML = '<i></i><i></i><i></i>';
    messagesEl.appendChild(typingEl);
    scrollBottom();
  }

  function hideTyping() {
    typingEl?.remove();
    typingEl = null;
  }

  async function withTyping(ms, fn, id = conversationId) {
    showTyping();
    await wait(ms);
    if (id !== conversationId) return false;
    hideTyping();
    fn();
    return true;
  }

  function setQuick(options = []) {
    quickEl.replaceChildren();
    options.forEach(({ label, value = label }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.addEventListener('click', () => handleQuick(value, label));
      quickEl.appendChild(button);
    });
  }

  function setInput(enabled, placeholder = 'Escribí un mensaje') {
    input.disabled = !enabled;
    input.placeholder = enabled ? placeholder : 'Elegí una opción de arriba…';
    if (enabled) setTimeout(() => input.focus(), 80);
  }

  function showMenu() {
    step = 'menu';
    setInput(true, 'Escribí tu consulta o elegí una opción…');
    setQuick([
      { label: 'Abrir casillero', value: 'Abrir casillero' },
      { label: 'Rastrear paquete', value: 'Rastrear paquete' },
      { label: 'Cotizar envío', value: 'Cotizar envío' },
      { label: 'Otras consultas', value: 'Otras consultas' }
    ]);
  }

  function showQuoteTypes() {
    step = 'quote-type';
    setInput(false);
    setQuick([
      { label: 'Aéreo ✈️', value: 'Aéreo ✈️' },
      { label: 'Marítimo 🚢', value: 'Marítimo 🚢' }
    ]);
  }

  function showSeaTypes() {
    step = 'quote-sea';
    setInput(false);
    setQuick([
      { label: 'Tengo los pies cúbicos', value: 'Tengo los pies cúbicos' },
      { label: 'Tengo las medidas', value: 'Tengo las medidas' }
    ]);
  }

  function showResidentialChoices() {
    step = 'res-addr';
    setInput(false);
    setQuick([
      { label: 'Sí, necesito la residencial', value: 'Sí, necesito la residencial' },
      { label: 'No, con la bodega está bien', value: 'No, con la bodega está bien' }
    ]);
  }

  function showAmazonChoices() {
    step = 'amazon';
    setInput(false);
    setQuick([
      { label: 'Sí', value: 'Sí' },
      { label: 'No', value: 'No' }
    ]);
  }

  function showDone() {
    step = 'done';
    setInput(false);
    setQuick([{ label: 'Cerrar conversación', value: 'Cerrar conversación' }]);
  }

  function open(mode = 'menu') {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    reset(mode);
  }

  function close() {
    conversationId += 1;
    hideTyping();
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
  }

  async function reset(mode) {
    conversationId += 1;
    const id = conversationId;
    messagesEl.replaceChildren();
    quickEl.replaceChildren();
    input.value = '';
    draft = {};
    step = 'greeting';
    setInput(false);

    await wait(300);
    if (id !== conversationId) return;

    addHtml([
      '¡Hola! 👋 Soy ', strong('David'), ', el asistente virtual de ', strong('AirWay Logistics'), '.', br(), br(),
      '¡Bienvenido! Puedo ayudarte a abrir tu casillero, cotizar un envío o rastrear un paquete.', br(), br(),
      'Traemos tu carga de forma rápida, segura y al mejor precio 💰', br(), br(),
      '🌎 Importamos desde Estados Unidos y China', br(),
      '📦 Cotizamos en minutos', br(),
      '⚠️ Que ', strong('NO'), ' te retengan los paquetes: con nosotros eso ', strong('NO PASA'), '.'
    ]);

    await wait(1200);
    if (id !== conversationId) return;

    if (mode === 'track') {
      await withTyping(600, () => {
        addMessage('Claro, con mucho gusto. Enviame el número de tracking de tu paquete para revisarlo.');
        step = 'track';
        setInput(true, 'Escribí un mensaje');
      }, id);
      return;
    }

    if (mode === 'cotizar' || mode === 'quote') {
      await withTyping(600, () => {
        addMessage('¡Con gusto! ¿Tu envío es aéreo ✈️ o marítimo 🚢?');
        showQuoteTypes();
      }, id);
      return;
    }

    if (mode === 'register') {
      await startRegistration();
      return;
    }

    addMessage('¿Qué necesitás hacer hoy?');
    showMenu();
  }

  async function startRegistration() {
    setQuick([]);
    await withTyping(700, () => addMessage('¡Excelente! Para abrir tu casillero necesito únicamente 4 datos. Te los pediré uno por uno.'));
    await wait(700);
    addHtml(['Empecemos: ¿cuál es tu ', strong('nombre completo'), '?']);
    step = 'reg-name';
    setInput(true, 'Escribí un mensaje');
  }

  async function startTracking(fromMenu = true) {
    setQuick([]);
    if (fromMenu) {
      await withTyping(700, () => addMessage('Claro, con mucho gusto. Enviame el número de tracking de tu paquete para revisarlo.'));
    }
    step = 'track';
    setInput(true, 'Escribí un mensaje');
  }

  async function startQuote() {
    setQuick([]);
    await withTyping(700, () => addMessage('¿Querés cotizar un envío aéreo ✈️ o marítimo 🚢?'));
    showQuoteTypes();
  }

  async function goAmazon() {
    await withTyping(700, () => {
      addHtml([
        '💡 ', strong('Impuesto de Florida'), br(), br(),
        '• ', strong('eBay'), ': al agregar tu dirección de Miami, la compra aparece automáticamente sin el impuesto de Florida. ✅', br(), br(),
        '• ', strong('Amazon'), ': tenés que completar una gestión breve dentro de tu cuenta para activar la exención. ¿Querés que te explique el proceso paso a paso?'
      ]);
      showAmazonChoices();
    });
  }

  async function showAmazonInstructions() {
    setQuick([]);
    await withTyping(1000, () => {
      addHtml([
        'Con mucho gusto. El proceso es sencillo; hacelo desde tu cuenta de Amazon siguiendo estos pasos:', br(), br(),
        '1️⃣ Entrá en ', strong('Tu cuenta'), ' y después seleccioná ', strong('Servicio al cliente'), '.', br(), br(),
        '2️⃣ En la barra de búsqueda escribí ', strong('ATEP'), ' y elegí ', strong('Asistente de exención de impuestos'), '.', br(), br(),
        '3️⃣ Seleccioná el estado de ', strong('Florida'), ' y presioná ', strong('Siguiente'), '.', br(), br(),
        '4️⃣ Amazon mostrará una lista. En la primera fila buscá la opción ', strong('Otros'), ' —o la opción que aparece en blanco—, seleccionala y continuá.', br(), br(),
        '5️⃣ Al final te pedirá adjuntar un documento. Subí la imagen que te voy a compartir en el siguiente mensaje.', br(), br(),
        'No te preocupés: esta gestión siempre es aprobada. Es una formalidad de Amazon y, normalmente, recibirás el correo de confirmación en menos de 24 horas indicando que ya no te cobrarán el impuesto.'
      ]);
    });

    await wait(1200);
    await withTyping(700, () => {
      addHtml([
        'Descargá esta imagen y adjuntala en el último paso del proceso de exención de impuestos de Amazon:', br(), br(),
        link('Descargar documento para Amazon', TAX_DOCUMENT)
      ]);
      showDone();
    });
  }

  async function showResidentialAddress() {
    setQuick([]);
    await withTyping(700, () => {
      const nombre = draft.nombre || '';
      addHtml(['¡Claro! Esta es tu ', strong('dirección residencial'), ' en Miami 🏠']);
      setTimeout(() => {
        addAddressCard('residential', {
          name: `AWL ${nombre}`,
          line1: '15421 SW 26th Terrace',
          line2: 'Miami, Florida',
          line3: '33185-4866',
          country: 'United States',
          phone: '(305) 848-1127'
        });
      }, 500);
    });

    await wait(1200);
    showTyping();
    await wait(700);
    hideTyping();
    addHtml([
      '⚠️ ', strong('Importante:'), ' Los paquetes enviados a esta dirección pueden tardar ', strong('1–3 días adicionales'), '. Primero se trasladan desde la residencia hasta nuestra bodega en Miami y, después, se programan para el vuelo a Costa Rica.'
    ]);
    await wait(1400);
    return goAmazon();
  }

  async function completeRegistration(email) {
    const nombre = draft.nombre || '';
    draft.email = email;
    step = 'saving';
    setInput(false);
    setQuick([]);

    if (typeof window.fbq !== 'undefined') {
      window.fbq('track', 'CompleteRegistration', {
        content_name: 'Casillero Miami',
        status: 'completed'
      });
    }

    fetch(REGISTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: draft.nombre,
        tel: draft.tel,
        addr: draft.addr,
        email
      })
    }).catch((error) => console.error('Error guardando lead:', error));

    await withTyping(1200, () => addMessage('¡Listo! Tu casillero quedó abierto correctamente ✅'));

    await wait(700);
    addAddressCard('tax', {
      name: `AWL ${nombre}`,
      line1: '2610 NW 89th CT',
      line2: 'Doral, Florida',
      line3: '33172-1615',
      phone: '(305) 848-1127'
    });

    await wait(800);
    showTyping();
    await wait(900);
    hideTyping();
    addHtml([
      strong('IMPORTANTE:'), ' En todas tus compras debés escribir el prefijo ', strong('AWL'), ' antes de tu nombre, exactamente como aparece en la dirección. Esto nos permite identificar tus paquetes correctamente cuando llegan a Miami.'
    ]);

    await wait(800);
    showTyping();
    await wait(900);
    hideTyping();
    addHtml([
      '🏠 ¿Vas a comprar en tiendas como ', strong('Walmart'), ', ', strong('Target'), ' o ', strong('Apple'), '?', br(), br(),
      'Esas tiendas pueden rechazar direcciones de casillero. Para esas compras tenemos disponible una ', strong('dirección residencial'), ' en Miami.'
    ]);
    showResidentialChoices();
  }

  function normalizeTrackingDate(raw) {
    return raw ? String(raw).split('.')[0] : '';
  }

  function resolveTracking(data) {
    const h = data?.history || {};
    let cur = null;
    if (h.miami) cur = { key: 'miami', label: 'Recibido en Miami', icon: '📦', date: h.miami.date };
    if (h.puerto) cur = { key: 'puerto', label: 'En puerto', icon: '🚢', date: h.puerto.date };
    if (h.dg) cur = { key: 'dg', label: 'En aduana', icon: '🏛', date: h.dg.date };
    if (h.transito) cur = { key: 'transito', label: 'En tránsito a Costa Rica', icon: '✈️', date: h.transito.date };
    if (h.panama) cur = { key: 'cr', label: 'Llegó a Costa Rica', icon: '🇨🇷', date: h.panama.date };
    if (h.out) cur = { key: 'out', label: 'Fuera de sistema', icon: '📋', date: h.out.date };
    if (h.atraso) cur = { key: 'atraso', label: 'Con atraso', icon: '⏳', date: h.atraso.date };
    if (h.mal) cur = { key: 'mal', label: 'Mal identificado', icon: '⚠️', date: h.mal.date };
    return cur;
  }

  async function trackPackage(code) {
    step = 'tracking';
    setInput(false);
    showTyping();

    try {
      const response = await fetch(`${TRACKING_ENDPOINT}${code}`);
      if (!response.ok) throw new Error('No encontrado');
      const data = await response.json();
      hideTyping();

      const cur = resolveTracking(data);
      if (!cur) {
        addHtml([
          'Encontré el código ', strong(code), ', pero todavía no registra movimientos en nuestro sistema.', br(), br(),
          'Esto puede ocurrir cuando el paquete fue entregado recientemente. El registro puede tardar hasta ', strong('48 horas'), ' en aparecer.', br(), br(),
          '⚠️ Si el envío es de ', strong('USPS'), ' y aparece como "', strong('entregado a agente final'), '", es normal. USPS lo entrega a otro transportista, que luego lo lleva a nuestra bodega en Miami. Este traslado puede tomar varios días adicionales. En cuanto lo recibamos, te avisaremos. 📦'
        ]);
        showMenu();
        return;
      }

      const dateStr = normalizeTrackingDate(cur.date);
      let msg;

      if (cur.key === 'cr') {
        msg = [
          '✅ ', strong('¡TU PAQUETE FUE RECIBIDO CORRECTAMENTE EN NUESTRA BODEGA EN MIAMI!'), br(), br(),
          '✈️ ', strong('YA SE ENCUENTRA EN TRÁNSITO HACIA COSTA RICA 🇨🇷'), br(), br(),
          'El paquete ', strong(code), ' ya va en camino.', dateStr ? ` Último movimiento registrado: ${dateStr}.` : '', br(), br(),
          'Nuestro equipo te avisará por ', strong('WhatsApp'), ' cuando esté en nuestra bodega de ', strong('San José'), ' y se encuentre listo para entrega. 🚚', br(), br(),
          '¡Pronto lo tendrás en tus manos! 🎉'
        ];
      } else if (cur.key === 'transito') {
        msg = ['✈️ Tu paquete ', strong(code), ' ya se encuentra en tránsito hacia Costa Rica.', dateStr ? ' El movimiento fue registrado el ' : '', dateStr ? strong(dateStr) : '', '. Estará llegando en los próximos días 🇨🇷'];
      } else if (cur.key === 'miami') {
        msg = ['📦 Tu paquete ', strong(code), ' fue recibido en Miami', dateStr ? ' el ' : '', dateStr ? strong(dateStr) : '', '. Ahora está siendo procesado para incluirlo en el próximo vuelo disponible.'];
      } else if (cur.key === 'dg') {
        msg = ['🏛 Tu paquete se encuentra en aduana', dateStr ? ' desde el ' : '', dateStr ? strong(dateStr) : '', '. Este proceso normalmente tarda entre ', strong('1 y 2 días hábiles'), '.'];
      } else if (cur.key === 'puerto') {
        msg = ['🚢 Tu carga se encuentra en puerto', dateStr ? ' desde el ' : '', dateStr ? strong(dateStr) : '', ' y está en proceso de desaduanaje.'];
      } else if (cur.key === 'mal') {
        msg = [
          '⚠️ ', strong('PAQUETE MAL IDENTIFICADO'), br(), br(),
          'El paquete puede estar en esta condición porque no tiene el prefijo ', strong('AWL'), ' antes del nombre, o porque la etiqueta está dañada o no se puede leer correctamente.', br(), br(),
          'Comunicate con nuestro equipo por WhatsApp para solicitar la identificación del paquete 👇', br(), br(),
          link('📲 Escribir a nuestro equipo por WhatsApp', WHATSAPP)
        ];
      } else if (cur.key === 'atraso') {
        const url = whatsappUrl(`Hola, necesito ayuda con el paquete ${code}. David me indicó que registra un atraso.`);
        msg = [
          '⏳ El paquete ', strong(code), ' tiene un atraso registrado. Un agente de AirWay debe revisar el caso de forma específica.', br(), br(),
          link('📲 Consultar el atraso por WhatsApp', url), br(),
          'Tocá el enlace para abrir la conversación con el equipo.'
        ];
      } else {
        msg = [`${cur.icon} Tu paquete `, strong(code), ' — ', strong(cur.label), dateStr ? ` · ${dateStr}` : ''];
      }

      addHtml(msg);
      await wait(900);
      addMessage('¿Necesitás algo más? 😊');
      showMenu();
    } catch (error) {
      hideTyping();
      addHtml([
        '🔍 No encontré ese código en el sistema en este momento.', br(), br(),
        'Revisá que esté escrito exactamente como aparece en la guía. Si el paquete fue entregado recientemente, puede tardar hasta ', strong('48 horas'), ' en reflejarse.', br(), br(),
        '⚠️ Si el envío es de ', strong('USPS'), ' y aparece como "', strong('entregado a agente final'), '", es normal. USPS lo transfiere a otro transportista que lo lleva a nuestra bodega en Miami, y ese traslado puede tardar varios días. Podés intentarlo nuevamente más tarde. 😊'
      ]);
      step = 'track';
      setInput(true, 'Escribí un mensaje');
    }
  }

  async function handleQuick(value, label) {
    if (step === 'saving' || step === 'tracking') return;
    addMessage(label, 'out');
    setQuick([]);

    if (value === 'Cerrar conversación') {
      close();
      return;
    }

    if (step === 'ai-chat') {
      if (value === 'Abrir casillero') return startRegistration();
      if (value === 'Rastrear paquete') return startTracking(true);
      if (value === 'Hablar por WhatsApp') {
        const url = whatsappUrl('Hola, vengo desde David en airwaycr.com y necesito ayuda con una consulta.');
        addHtml(whatsappHandoffParts('¡Con gusto! Te conectaré ahora mismo con nuestro equipo por WhatsApp 👋', url));
        showDone();
        launchWhatsApp(url);
        return;
      }
    }

    if (step === 'menu') {
      if (value === 'Abrir casillero') return startRegistration();
      if (value === 'Rastrear paquete') return startTracking(true);
      if (value === 'Cotizar envío') return startQuote();
      if (value === 'Otras consultas') {
        const url = whatsappUrl('Hola, vengo desde David en airwaycr.com y necesito ayuda con otra consulta.');
        // La apertura ocurre antes de cualquier espera para conservar el gesto
        // directo del usuario y evitar el bloqueo de ventanas en móviles.
        addHtml(whatsappHandoffParts('¡Con gusto! Te conectaré ahora mismo con nuestro equipo por WhatsApp 👋', url));
        showDone();
        launchWhatsApp(url);
        return;
      }
    }

    if (step === 'quote-type') {
      if (value === 'Aéreo ✈️') {
        await withTyping(600, () => addHtml(['¿Cuánto pesa el paquete en libras? Escribí únicamente el peso; por ejemplo: ', strong('2.5'), '.']));
        step = 'quote-air';
        setInput(true, 'Escribí un mensaje');
        return;
      }
      await withTyping(600, () => addMessage('¿Ya conocés los pies cúbicos del paquete o preferís enviarme el largo, ancho y alto de la caja?'));
      showSeaTypes();
      return;
    }

    if (step === 'quote-sea') {
      if (value === 'Tengo los pies cúbicos') {
        await withTyping(600, () => addHtml(['¿Cuántos pies cúbicos tiene el paquete? Escribí únicamente el número; por ejemplo: ', strong('2.5'), '.']));
        step = 'quote-sea-cbf';
        setInput(true, 'Escribí un mensaje');
        return;
      }
      await withTyping(600, () => addHtml([
        'Enviame las tres medidas de la caja en este orden: ', strong('largo × ancho × alto'), '. También indicá si están en ', strong('centímetros'), ' o ', strong('pulgadas'), '. Ejemplos: ', strong('50x40x30 cm'), ' o ', strong('20x16x12 in'), '.'
      ]));
      step = 'quote-sea-dims';
      setInput(true, 'Escribí un mensaje');
      return;
    }

    if (step === 'res-addr') {
      if (value === 'Sí, necesito la residencial') return showResidentialAddress();
      await withTyping(400, () => {});
      return goAmazon();
    }

    if (step === 'amazon') {
      if (value === 'Sí') return showAmazonInstructions();
      await withTyping(600, () => addMessage('¡Sin problema! Cuando estés listo para hacer tu primera compra aquí estamos. ¡Hasta pronto! 👋🇨🇷'));
      showDone();
    }
  }

  async function handleInput(rawText) {
    const text = rawText.trim();
    if (!text || step === 'saving' || step === 'tracking' || step === 'ai-thinking') return;

    addMessage(text, 'out');
    input.value = '';

    if (step === 'ai-chat') {
      setQuick([]);
      return answerWithAI(text);
    }

    if (step === 'quote-air') {
      const lbs = parseFloat(text.replace(',', '.'));
      await withTyping(900, () => {
        if (Number.isFinite(lbs) && lbs > 0) {
          const rounded = Math.ceil(lbs);
          const total = rounded * 7;
          addHtml(['El costo estimado de tu envío es de ', strong(`$${total}`), `. La tarifa incluye flete, aduana e impuestos, sin cobros sorpresa. ¿Querés abrir tu casillero ahora? 📬`]);
          setTimeout(() => {
            addMessage('¿Necesitás algo más? 😊');
            showMenu();
          }, 900);
        } else {
          addHtml(['No pude identificar el peso. Enviame únicamente el número en libras; por ejemplo: ', strong('3.5'), '.']);
          step = 'quote-air';
          setInput(true, 'Escribí un mensaje');
        }
      });
      return;
    }

    if (step === 'quote-sea-cbf') {
      const cbf = parseFloat(text.replace(',', '.'));
      await withTyping(900, () => {
        if (Number.isFinite(cbf) && cbf > 0) {
          const rounded = Math.ceil(cbf);
          const total = rounded * 30;
          addHtml(['El costo estimado de tu envío es de ', strong(`$${total}`), `. La tarifa incluye flete, aduana e impuestos, sin cobros sorpresa. ¿Querés abrir tu casillero ahora? 📬`]);
          setTimeout(() => {
            addMessage('¿Necesitás algo más? 😊');
            showMenu();
          }, 900);
        } else {
          addHtml(['No pude identificar el volumen. Enviame únicamente el número de pies cúbicos; por ejemplo: ', strong('2.5'), '.']);
          step = 'quote-sea-cbf';
          setInput(true, 'Escribí un mensaje');
        }
      });
      return;
    }

    if (step === 'quote-sea-dims') {
      const nums = text.match(/[\d]+([.,][\d]+)?/g);
      await withTyping(900, () => {
        if (nums && nums.length >= 3) {
          const [l, w, h] = nums.map((n) => parseFloat(n.replace(',', '.')));
          const isInches = /\bin\b|inch|pulgada/i.test(text);
          const cbfExact = isInches
            ? (l * w * h) / 1728
            : (l * w * h) / 28316.846;
          const unitLabel = isInches ? 'pulgadas' : 'cm';
          const rounded = Math.ceil(cbfExact);
          const total = rounded * 30;
          addHtml([
            `Las medidas ${l} × ${w} × ${h} ${unitLabel} equivalen a ${cbfExact.toFixed(2)} ft³. `,
            'El costo estimado es de ', strong(`$${total}`), `. La tarifa incluye flete, aduana e impuestos, sin cobros sorpresa. ¿Querés abrir tu casillero ahora? 📬`
          ]);
          setTimeout(() => {
            addMessage('¿Necesitás algo más? 😊');
            showMenu();
          }, 900);
        } else {
          addHtml(['No pude identificar las tres medidas. Enviámelas en uno de estos formatos: ', strong('50x40x30 cm'), ' o ', strong('20x16x12 in'), '.']);
          step = 'quote-sea-dims';
          setInput(true, 'Escribí un mensaje');
        }
      });
      return;
    }

    if (step === 'reg-name') {
      draft.nombre = text;
      await withTyping(600, () => addHtml(['¡Perfecto, ', strong(text.split(' ')[0]), '! ¿Cuál es tu ', strong('número de teléfono'), '?']));
      step = 'reg-phone';
      setInput(true, 'Escribí un mensaje');
      return;
    }

    if (step === 'reg-phone') {
      draft.tel = text;
      await withTyping(600, () => addHtml(['Ahora indicame tu ', strong('domicilio exacto en Costa Rica'), ': provincia, cantón y dirección.']));
      step = 'reg-addr';
      setInput(true, 'Escribí un mensaje');
      return;
    }

    if (step === 'reg-addr') {
      draft.addr = text;
      await withTyping(600, () => addHtml(['Por último, ¿cuál es tu ', strong('correo electrónico'), '?']));
      step = 'reg-email';
      setInput(true, 'Escribí un mensaje');
      return;
    }

    if (step === 'reg-email') {
      return completeRegistration(text);
    }

    if (step === 'track') {
      const code = text.trim().toUpperCase();
      return trackPackage(code);
    }

    // Consulta libre → David responde con IA (Claude). Si la IA no está
    // disponible, se escala a WhatsApp como antes.
    return answerWithAI(text);
  }

  async function answerWithAI(text) {
    step = 'ai-thinking';
    input.disabled = true;
    showTyping();
    try {
      const res = await fetch(CHAT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: chatSessionId() })
      });
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      if (!data?.reply) throw new Error('empty reply');

      hideTyping();
      input.disabled = false;
      step = 'ai-chat';
      addMessage(data.reply);
      setQuick([
        { label: 'Abrir casillero', value: 'Abrir casillero' },
        { label: 'Rastrear paquete', value: 'Rastrear paquete' },
        { label: 'Hablar por WhatsApp', value: 'Hablar por WhatsApp' }
      ]);
      input.focus();
    } catch (_) {
      hideTyping();
      input.disabled = false;
      const url = whatsappUrl(`Hola, vengo desde David en airwaycr.com. Mi consulta es: ${text}`);
      addHtml(whatsappHandoffParts('Esta consulta necesita atención del equipo. Te conectaré con un agente para que pueda ayudarte directamente.', url));
      showDone();
      launchWhatsApp(url);
    }
  }

  document.querySelectorAll('[data-open-david]').forEach((button) => {
    button.addEventListener('click', () => open(button.dataset.openDavid || 'menu'));
  });

  document.querySelectorAll('[data-close-david]').forEach((button) => {
    button.addEventListener('click', close);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!input.disabled) handleInput(input.value);
  });
})();
