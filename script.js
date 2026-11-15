/* ╔══════════════════════════════════════════════════════════════════════╗
   ║  JAVASCRIPT · PORTFOLIO HUGO AROCA MIGUEL                            ║
   ║                                                                      ║
   ║  Hugo: normalmente NO necesitas tocar este archivo. Los textos y     ║
   ║  las imágenes se cambian en index.html y los colores en style.css.   ║
   ║  Lo único pensado para ajustar está en el bloque "AJUSTES" de abajo. ║
   ║                                                                      ║
   ║  ÍNDICE                                                              ║
   ║   0. Ajustes                                                         ║
   ║   1. Utilidades básicas (funcionan aunque no cargue GSAP)            ║
   ║   2. Pantalla de carga + animación de entrada del hero               ║
   ║   3. Cursor personalizado y efecto magnético                         ║
   ║   4. Hero: formas que siguen al ratón, cinta en movimiento           ║
   ║   5. Apariciones al hacer scroll (títulos, textos, palabras)         ║
   ║   6. Proyectos: galería con scroll horizontal                        ║
   ║   7. Currículum: líneas de tiempo                                    ║
   ║  (La ventana emergente de proyectos está dentro del bloque 1)        ║
   ╚══════════════════════════════════════════════════════════════════════╝ */

(() => {
  'use strict';

  /* ════════════════════════════════════════════════════════════════════
     0 · AJUSTES  ✏️ EDITA (opcional)
     ════════════════════════════════════════════════════════════════════ */
  const AJUSTES = {
    duracionCarga: 1.6,        // segundos que tarda el contador 0 → 100
    velocidadCinta: 24,        // segundos por vuelta de la cinta de texto (más = más lenta)
    zonaHoraria: 'Europe/Madrid'  // zona horaria del reloj del pie de página
  };


  /* ════════════════════════════════════════════════════════════════════
     1 · UTILIDADES BÁSICAS
     ════════════════════════════════════════════════════════════════════ */
  const html = document.documentElement;
  const $  = (selector, contexto = document) => contexto.querySelector(selector);
  const $$ = (selector, contexto = document) => [...contexto.querySelectorAll(selector)];

  const hayGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hayRaton = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── Año actual y hora local de Albacete en el pie ── */
  const anio = $('#anio');
  if (anio) anio.textContent = new Date().getFullYear();

  const hora = $('#hora-local');
  if (hora) {
    const formato = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: AJUSTES.zonaHoraria });
    const pintarHora = () => { hora.textContent = formato.format(new Date()) + ' h'; };
    pintarHora();
    setInterval(pintarHora, 20000);
  }

  /* ── Imágenes que no existen: muestra un aviso con la ruta que falta ──
     (útil cuando cambias la ruta de una imagen y te equivocas al escribirla) */
  $$('.marco img').forEach((img) => {
    const marcarVacio = () => {
      img.parentElement.classList.add('marco--vacio');
      img.parentElement.dataset.archivo = img.getAttribute('src');
    };
    if (img.complete && img.naturalWidth === 0 && img.loading !== 'lazy') marcarVacio();
    img.addEventListener('error', marcarVacio);
  });

  /* ── Menú móvil (botón hamburguesa) ── */
  const hamburguesa = $('.cabecera__hamburguesa');
  const cerrarMenu = () => {
    html.classList.remove('menu-abierto', 'bloqueado');
    hamburguesa.setAttribute('aria-expanded', 'false');
    hamburguesa.setAttribute('aria-label', 'Abrir menú');
  };
  hamburguesa.addEventListener('click', () => {
    const abierto = html.classList.toggle('menu-abierto');
    html.classList.toggle('bloqueado', abierto);
    hamburguesa.setAttribute('aria-expanded', String(abierto));
    hamburguesa.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarMenu(); });

  /* ── Navegación suave al pulsar en los enlaces del menú (#seccion) ── */
  $$('a[href^="#"]').forEach((enlace) => {
    enlace.addEventListener('click', (e) => {
      const destino = $(enlace.getAttribute('href'));
      if (!destino) return;
      e.preventDefault();
      cerrarMenu();
      // Si la sección está "fijada" por GSAP, medimos su contenedor (pin-spacer)
      const medir = destino.parentElement.classList.contains('pin-spacer') ? destino.parentElement : destino;
      const y = medir.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: y, behavior: movimientoReducido ? 'auto' : 'smooth' });
    });
  });

  /* ══════════════════════════════════════════════════════════════════
     VENTANA EMERGENTE DE PROYECTO (visor de fotos)
     Al pulsar una tarjeta se abre a pantalla completa con todas las
     fotos de su lista <ul class="tarjeta__galeria">.
     Se maneja con: flechas en pantalla · teclas ← → · deslizar el dedo ·
     miniaturas · clic en la foto (siguiente) · Esc o "Cerrar" para salir.
     ══════════════════════════════════════════════════════════════════ */
  const animar = hayGsap && !movimientoReducido;
  const visor = $('#visor');
  const visorPanel = $('.visor__panel', visor);
  const visorImagen = $('.visor__imagen', visor);
  const visorEscenario = $('.visor__escenario', visor);
  const visorMiniaturas = $('.visor__miniaturas', visor);
  const visorContador = $('.visor__contador', visor);
  const dosCifras = (n) => String(n).padStart(2, '0');

  let fotos = [];          // fotos del proyecto abierto: { src, alt }
  let indice = 0;          // foto que se está viendo
  let turno = 0;           // evita líos si se pulsa muy rápido
  let botonOrigen = null;  // tarjeta desde la que se abrió (para devolverle el foco)
  let centro = '50% 50%';  // punto desde el que se abre el círculo

  // Cambia a la foto número i. direccion: 1 = siguiente, -1 = anterior, 0 = sin animación
  const mostrarFoto = (i, direccion = 0) => {
    indice = (i + fotos.length) % fotos.length;
    const foto = fotos[indice];
    const miTurno = ++turno;

    visorContador.textContent = `${dosCifras(indice + 1)} / ${dosCifras(fotos.length)}`;
    $$('button', visorMiniaturas).forEach((boton, n) => {
      boton.setAttribute('aria-current', String(n === indice));
      if (n === indice) visorMiniaturas.scrollTo({ left: boton.offsetLeft - visorMiniaturas.clientWidth / 2 + boton.offsetWidth / 2, behavior: 'smooth' });
    });

    const colocar = () => { visorImagen.src = foto.src; visorImagen.alt = foto.alt; };
    if (!animar || !direccion) { colocar(); return; }

    // La foto actual sale hacia un lado y la nueva entra por el contrario
    gsap.to(visorImagen, {
      xPercent: -12 * direccion, rotate: -3 * direccion, opacity: 0, duration: 0.2, ease: 'power2.in', overwrite: true,
      onComplete: () => {
        if (miTurno !== turno) return;
        const precarga = new Image();
        precarga.onload = precarga.onerror = () => {
          if (miTurno !== turno) return;
          colocar();
          gsap.fromTo(visorImagen,
            { xPercent: 12 * direccion, rotate: 3 * direccion, opacity: 0 },
            { xPercent: 0, rotate: 0, opacity: 1, duration: 0.55, ease: 'expo.out', overwrite: true });
        };
        precarga.src = foto.src;
      }
    });
  };

  const abrirVisor = (tarjeta, evento) => {
    // 1) Lee los datos de la tarjeta pulsada
    fotos = $$('.tarjeta__galeria li', tarjeta).map((li) => ({ src: li.dataset.foto, alt: li.textContent.trim() }));
    if (!fotos.length) {
      const portada = $('.marco img', tarjeta);
      fotos = [{ src: portada.getAttribute('src'), alt: portada.alt }];
    }
    const meta = $$('.tarjeta__meta span', tarjeta);
    $('.visor__num', visor).textContent = meta[0] ? meta[0].textContent : '';
    $('.visor__categoria', visor).textContent = meta[1] ? meta[1].textContent : '';
    $('.visor__titulo', visor).textContent = $('.tarjeta__titulo', tarjeta).textContent;
    $('.visor__texto', visor).textContent = $('.tarjeta__texto', tarjeta).textContent;
    visor.style.setProperty('--acento', getComputedStyle(tarjeta).getPropertyValue('--acento'));
    $('.visor__controles', visor).hidden = fotos.length < 2;

    // 2) Crea las miniaturas
    visorMiniaturas.textContent = '';
    visorMiniaturas.hidden = fotos.length < 2;
    fotos.forEach((foto, n) => {
      const li = document.createElement('li');
      const boton = document.createElement('button');
      const img = document.createElement('img');
      boton.type = 'button';
      boton.setAttribute('aria-label', `Ver foto ${n + 1}: ${foto.alt}`);
      img.src = foto.src; img.alt = ''; img.loading = 'lazy';
      boton.addEventListener('click', () => { if (n !== indice) mostrarFoto(n, n > indice ? 1 : -1); });
      boton.appendChild(img); li.appendChild(boton); visorMiniaturas.appendChild(li);
    });

    // 3) Muestra la ventana
    botonOrigen = evento.currentTarget;
    visor.hidden = false;
    html.classList.add('bloqueado');
    mostrarFoto(0);
    $('.visor__cerrar', visor).focus({ preventScroll: true });

    // 4) Animación: un círculo de color crece desde donde has pulsado
    if (animar) {
      const caja = tarjeta.getBoundingClientRect();
      const conRaton = evento.detail > 0;   // 0 = abierto con el teclado
      // (el punto se limita a la pantalla por si la tarjeta está fuera de la vista)
      const limitar = (valor, maximo) => Math.min(Math.max(valor, 0), maximo);
      const x = limitar(conRaton ? evento.clientX : caja.left + caja.width / 2, window.innerWidth);
      const y = limitar(conRaton ? evento.clientY : caja.top + caja.height / 2, window.innerHeight);
      centro = `${x}px ${y}px`;
      gsap.killTweensOf([visorPanel, visorImagen]);
      gsap.set(visorImagen, { xPercent: 0 });
      gsap.fromTo(visorPanel, { clipPath: `circle(0% at ${centro})` }, { clipPath: `circle(150% at ${centro})`, duration: 0.9, ease: 'expo.inOut', clearProps: 'clipPath' });
      gsap.fromTo(visorImagen, { scale: 0.8, rotate: -5, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: 0.9, ease: 'expo.out', delay: 0.4 });
      gsap.fromTo([...$('.visor__info', visor).children, $('.visor__controles', visor), ...visorMiniaturas.children],
        { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.04, delay: 0.4 });
    }
  };

  const cerrarVisor = () => {
    if (visor.hidden) return;
    const ocultar = () => {
      visor.hidden = true;
      html.classList.remove('bloqueado');
      if (botonOrigen) botonOrigen.focus({ preventScroll: true });
    };
    if (animar) gsap.fromTo(visorPanel, { clipPath: `circle(150% at ${centro})` }, { clipPath: `circle(0% at ${centro})`, duration: 0.6, ease: 'expo.inOut', overwrite: true, onComplete: ocultar });
    else ocultar();
  };

  // Cada tarjeta: etiqueta "N fotos" + abrir al pulsar
  $$('.tarjeta').forEach((tarjeta) => {
    const total = $$('.tarjeta__galeria li', tarjeta).length;
    if (total > 1) {
      const etiqueta = document.createElement('span');
      etiqueta.className = 'tarjeta__contador';
      etiqueta.setAttribute('aria-hidden', 'true');
      etiqueta.textContent = `${total} fotos`;
      $('.marco', tarjeta).appendChild(etiqueta);
    }
    $('.tarjeta__abrir', tarjeta).addEventListener('click', (e) => abrirVisor(tarjeta, e));
  });

  // Botones del visor
  $('.visor__cerrar', visor).addEventListener('click', cerrarVisor);
  $('.visor__flecha--anterior', visor).addEventListener('click', () => mostrarFoto(indice - 1, -1));
  $('.visor__flecha--siguiente', visor).addEventListener('click', () => mostrarFoto(indice + 1, 1));

  // Foto grande: deslizar con el dedo (o arrastrar) cambia de foto; un clic pasa a la siguiente
  let inicioX = null;
  visorEscenario.addEventListener('pointerdown', (e) => { inicioX = e.clientX; });
  visorEscenario.addEventListener('pointerup', (e) => {
    if (inicioX === null || fotos.length < 2) return;
    const recorrido = e.clientX - inicioX;
    inicioX = null;
    if (Math.abs(recorrido) > 40) mostrarFoto(indice + (recorrido < 0 ? 1 : -1), recorrido < 0 ? 1 : -1);
    else mostrarFoto(indice + 1, 1);
  });
  visorEscenario.addEventListener('pointercancel', () => { inicioX = null; });

  // Teclado: Esc cierra, ← → cambian de foto y el tabulador no se sale de la ventana
  window.addEventListener('keydown', (e) => {
    if (visor.hidden) return;
    if (e.key === 'Escape') cerrarVisor();
    if (e.key === 'ArrowRight' && fotos.length > 1) mostrarFoto(indice + 1, 1);
    if (e.key === 'ArrowLeft' && fotos.length > 1) mostrarFoto(indice - 1, -1);
    if (e.key === 'Tab') {
      const enfocables = $$('button', visor).filter((b) => b.offsetParent !== null);
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    }
  });


  /* ── Si no hay GSAP (sin internet) o el visitante prefiere menos
        movimiento: la web se muestra completa y estática. Fin. ── */
  if (!hayGsap || movimientoReducido) {
    html.classList.add('sin-animacion');
    return;
  }

  html.classList.add('con-gsap');
  gsap.registerPlugin(ScrollTrigger);


  /* ── Separa un texto en letras <span class="letra"> para animarlas ── */
  const separarLetras = (elemento) => {
    const texto = elemento.textContent.trim();
    elemento.textContent = '';
    [...texto].forEach((caracter) => {
      const span = document.createElement('span');
      span.className = 'letra';
      span.textContent = caracter === ' ' ? ' ' : caracter;
      elemento.appendChild(span);
    });
    return $$('.letra', elemento);
  };

  /* ── Separa un párrafo en palabras <span class="palabra"> ── */
  const separarPalabras = (elemento) => {
    const palabras = elemento.textContent.trim().split(/\s+/);
    elemento.setAttribute('aria-label', palabras.join(' '));
    elemento.textContent = '';
    palabras.forEach((palabra, i) => {
      const span = document.createElement('span');
      span.className = 'palabra';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = palabra;
      elemento.appendChild(span);
      if (i < palabras.length - 1) elemento.appendChild(document.createTextNode(' '));
    });
    return $$('.palabra', elemento);
  };


  /* ════════════════════════════════════════════════════════════════════
     2 · PANTALLA DE CARGA + ENTRADA DEL HERO
     ════════════════════════════════════════════════════════════════════ */
  const letrasHero = $$('.hero [data-letras]').flatMap(separarLetras);
  const numero = $('.cargador__num');
  const contador = { valor: 0 };

  html.classList.add('bloqueado');
  window.scrollTo(0, 0);

  gsap.timeline({ defaults: { ease: 'expo.out' } })
    // 1) Contador 0 → 100
    .to(contador, {
      valor: 100,
      duration: AJUSTES.duracionCarga,
      ease: 'power2.inOut',
      onUpdate: () => { numero.textContent = Math.round(contador.valor); }
    })
    // 2) Las dos capas (negra y rosa) se retiran hacia arriba
    .to('.cargador__contenido', { yPercent: -30, opacity: 0, duration: 0.45, ease: 'power2.in' })
    .to('.cargador__capa--negra', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '-=0.15')
    .to('.cargador__capa--color', { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '<0.14')
    .set('.cargador', { display: 'none' })
    .add(() => html.classList.remove('bloqueado'))
    // 3) Entra el nombre letra a letra, las formas y el resto de la portada
    .from(letrasHero, { yPercent: 115, rotate: 7, duration: 1.2, stagger: 0.035 }, '-=0.75')
    .from('.hero__forma', { scale: 0, rotate: -120, duration: 1.1, stagger: 0.09, ease: 'back.out(1.5)' }, '-=1')
    .from('.cabecera > *', { y: -90, duration: 0.9, stagger: 0.06 }, '-=1')
    .from('[data-hero-aparece]', { y: 34, opacity: 0, duration: 0.9, stagger: 0.07 }, '-=0.8')
    .from('.cinta', { yPercent: 100, duration: 0.9 }, '-=0.9');


  /* ════════════════════════════════════════════════════════════════════
     3 · CURSOR PERSONALIZADO Y EFECTO MAGNÉTICO
     (solo en dispositivos con ratón)
     ════════════════════════════════════════════════════════════════════ */
  if (hayRaton) {
    html.classList.add('con-cursor');

    const cursor = $('.cursor');
    const punto = $('.cursor-punto');
    const cursorTexto = $('.cursor__texto');

    gsap.set([cursor, punto], { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 2 });

    // El círculo grande sigue al ratón con retardo; el punto, casi al instante
    const cursorX = gsap.quickTo(cursor, 'x', { duration: 0.5, ease: 'power3' });
    const cursorY = gsap.quickTo(cursor, 'y', { duration: 0.5, ease: 'power3' });
    const puntoX = gsap.quickTo(punto, 'x', { duration: 0.08 });
    const puntoY = gsap.quickTo(punto, 'y', { duration: 0.08 });

    window.addEventListener('pointermove', (e) => {
      cursorX(e.clientX); cursorY(e.clientY);
      puntoX(e.clientX);  puntoY(e.clientY);
    });

    // Cambia de forma según lo que haya debajo:
    //  · data-cursor="Texto" → círculo grande con ese texto
    //  · enlaces y botones   → círculo mediano
    document.addEventListener('pointerover', (e) => {
      const conTexto = e.target.closest('[data-cursor]');
      const enlace = e.target.closest('a, button');
      cursor.classList.toggle('cursor--texto', Boolean(conTexto));
      cursor.classList.toggle('cursor--enlace', Boolean(enlace) && !conTexto);
      punto.style.opacity = conTexto ? 0 : 1;
      if (conTexto) cursorTexto.textContent = conTexto.dataset.cursor;
    });

    // Se oculta al salir de la ventana
    html.addEventListener('pointerleave', () => { cursor.classList.add('cursor--oculto'); punto.style.opacity = 0; });
    html.addEventListener('pointerenter', () => { cursor.classList.remove('cursor--oculto'); punto.style.opacity = 1; });

    /* ── Efecto magnético: el elemento "persigue" al ratón ──
       Se activa en cualquier etiqueta con data-magnetico="0.3"
       (el número es la fuerza: 0.1 suave · 0.5 fuerte) */
    $$('[data-magnetico]').forEach((el) => {
      const fuerza = parseFloat(el.dataset.magnetico) || 0.3;
      const moverX = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });
      const moverY = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.45)' });

      el.addEventListener('pointermove', (e) => {
        const caja = el.getBoundingClientRect();
        moverX((e.clientX - (caja.left + caja.width / 2)) * fuerza);
        moverY((e.clientY - (caja.top + caja.height / 2)) * fuerza);
      });
      el.addEventListener('pointerleave', () => { moverX(0); moverY(0); });
    });


    /* ══════════════════════════════════════════════════════════════════
       4a · HERO: las formas decorativas se desplazan con el ratón
       (data-profundidad = cuántos píxeles se mueven; negativo = al revés)
       ══════════════════════════════════════════════════════════════════ */
    const formas = $$('.hero__forma').map((forma) => ({
      profundidad: parseFloat(forma.dataset.profundidad) || 20,
      x: gsap.quickTo(forma, 'x', { duration: 1, ease: 'power3' }),
      y: gsap.quickTo(forma, 'y', { duration: 1, ease: 'power3' })
    }));

    $('.hero').addEventListener('pointermove', (e) => {
      const dx = e.clientX / window.innerWidth - 0.5;
      const dy = e.clientY / window.innerHeight - 0.5;
      formas.forEach((f) => { f.x(dx * f.profundidad * 2); f.y(dy * f.profundidad * 2); });
    });
  }


  /* ════════════════════════════════════════════════════════════════════
     4b · HERO: el nombre se abre al hacer scroll + cinta en movimiento
     ════════════════════════════════════════════════════════════════════ */
  const scrollHero = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__linea--1', { xPercent: -10, ease: 'none', scrollTrigger: scrollHero });
  gsap.to('.hero__linea--2', { xPercent: 10,  ease: 'none', scrollTrigger: scrollHero });
  gsap.to('.hero__linea--3', { xPercent: -6,  ease: 'none', scrollTrigger: scrollHero });

  // Cinta infinita: se acelera cuando haces scroll rápido
  $$('.cinta__pista').forEach((pista) => {
    const bucle = gsap.to(pista, { xPercent: -50, duration: AJUSTES.velocidadCinta, ease: 'none', repeat: -1 });
    ScrollTrigger.create({
      trigger: pista,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const impulso = 1 + Math.min(Math.abs(self.getVelocity()) / 300, 5);
        gsap.to(bucle, { timeScale: impulso, duration: 0.2, overwrite: true,
          onComplete: () => gsap.to(bucle, { timeScale: 1, duration: 1 }) });
      }
    });
  });

  // La cabecera se esconde al bajar y vuelve al subir
  const cabecera = $('.cabecera');
  ScrollTrigger.create({
    start: 200,
    end: 'max',
    onUpdate: (self) => {
      if (html.classList.contains('menu-abierto')) return;
      gsap.to(cabecera, { yPercent: self.direction === 1 ? -130 : 0, duration: 0.4, ease: 'power3.out', overwrite: true });
    },
    onLeaveBack: () => gsap.to(cabecera, { yPercent: 0, duration: 0.4, overwrite: true })
  });


  /* ════════════════════════════════════════════════════════════════════
     5 · APARICIONES AL HACER SCROLL
     ════════════════════════════════════════════════════════════════════ */

  // Titulares de sección (data-titulo): las letras suben una a una.
  // El de Proyectos se anima dentro de la galería (bloque 6).
  $$('[data-titulo]').forEach((titulo) => {
    const letras = separarLetras(titulo);
    titulo.setAttribute('aria-label', letras.map((l) => l.textContent).join('').replace(/ /g, ' '));
    letras.forEach((l) => l.setAttribute('aria-hidden', 'true'));

    gsap.from(letras, {
      yPercent: 115, rotate: 6, duration: 1, ease: 'expo.out', stagger: 0.03,
      scrollTrigger: { trigger: titulo, start: 'top 88%' }
    });
  });

  // Frase grande de "Sobre mí" (data-palabras): las palabras se van
  // "encendiendo" a medida que haces scroll.
  $$('[data-palabras]').forEach((parrafo) => {
    gsap.from(separarPalabras(parrafo), {
      opacity: 0.14, ease: 'none', stagger: 0.1,
      scrollTrigger: { trigger: parrafo, start: 'top 82%', end: 'bottom 45%', scrub: true }
    });
  });

  // Elementos sueltos (data-revelar): suben y aparecen al entrar en pantalla.
  gsap.set('[data-revelar]', { y: 50, opacity: 0 });
  ScrollTrigger.batch('[data-revelar]', {
    start: 'top 90%',
    once: true,
    onEnter: (grupo) => gsap.to(grupo, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out', stagger: 0.07, overwrite: true })
  });


  /* ════════════════════════════════════════════════════════════════════
     6 · PROYECTOS: GALERÍA CON SCROLL HORIZONTAL
     · Ordenador (≥ 900 px): la sección se queda fija y las tarjetas
       se desplazan hacia la izquierda mientras haces scroll.
     · Móvil y tablet: las tarjetas aparecen una a una en vertical.
     gsap.matchMedia() activa y desactiva cada modo automáticamente al
     cambiar el tamaño de la ventana.
     ════════════════════════════════════════════════════════════════════ */
  const mm = gsap.matchMedia();

  mm.add('(min-width: 900px)', () => {
    const seccion = $('.proyectos');
    const pista = $('.proyectos__pista');
    const barra = $('.proyectos__progreso-barra');
    const recorrido = () => Math.max(0, pista.offsetWidth - window.innerWidth);

    const desplazamiento = gsap.to(pista, {
      x: () => -recorrido(),
      ease: 'none',
      scrollTrigger: {
        trigger: seccion,
        start: 'top top',
        end: () => '+=' + recorrido(),
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set(barra, { scaleX: self.progress })
      }
    });

    $$('.tarjeta', pista).forEach((tarjeta) => {
      // Cada tarjeta entra desde abajo al asomar por la derecha
      gsap.from(tarjeta, {
        y: 120, opacity: 0, duration: 0.9, ease: 'expo.out',
        scrollTrigger: { trigger: tarjeta, containerAnimation: desplazamiento, start: 'left 96%', toggleActions: 'play none none reverse' }
      });
      // Efecto parallax: la foto se mueve un poco dentro de su marco
      gsap.fromTo($('img', tarjeta), { xPercent: -5, scale: 1.12 }, {
        xPercent: 5, scale: 1.12, ease: 'none',
        scrollTrigger: { trigger: tarjeta, containerAnimation: desplazamiento, start: 'left right', end: 'right left', scrub: true }
      });
    });
  });

  mm.add('(max-width: 899px)', () => {
    $$('.tarjeta').forEach((tarjeta) => {
      gsap.from(tarjeta, {
        y: 80, opacity: 0, rotate: -2, duration: 0.9, ease: 'expo.out',
        scrollTrigger: { trigger: tarjeta, start: 'top 90%' }
      });
    });
  });


  /* ════════════════════════════════════════════════════════════════════
     7 · CURRÍCULUM: LÍNEA DE TIEMPO
     ════════════════════════════════════════════════════════════════════ */
  // Cada línea vertical se "dibuja" mientras haces scroll
  $$('.cv__linea-tiempo').forEach((linea) => {
    gsap.from($('.cv__linea-relleno', linea), {
      scaleY: 0, ease: 'none',
      scrollTrigger: { trigger: linea, start: 'top 75%', end: 'bottom 60%', scrub: true }
    });
  });

  // Cada estudio o trabajo entra desde la derecha
  $$('.cv__item').forEach((item) => {
    gsap.from(item, {
      x: 90, opacity: 0, duration: 1, ease: 'expo.out',
      scrollTrigger: { trigger: item, start: 'top 85%' }
    });
  });


  /* ── Recalcula las posiciones cuando ya han cargado fuentes e imágenes ── */
  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
