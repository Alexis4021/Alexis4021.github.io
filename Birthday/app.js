(function () {
    "use strict";

    var CONFIG = window.ALANFEST_CONFIG || {};
    var EVENT_START = new Date("2026-11-21T17:00:00-06:00"); // Monterrey (UTC-6)
    var EVENT_END = new Date("2026-11-22T02:00:00-06:00");
    var ADDRESS = "C. Nottingham 310, Pedregal de Linda Vista 2o Sector 2a Etapa, 67112 Guadalupe, N.L.";
    var MAPS_URL = "https://maps.app.goo.gl/GyfLFKH36MazwqAb8";

    function $(sel, root) { return (root || document).querySelector(sel); }
    function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

    function escapeHtml(str) {
        return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function setMsg(el, text, type) {
        el.textContent = text;
        el.classList.toggle("is-error", type === "error");
        el.classList.toggle("is-ok", type === "ok");
    }

    /* ---------- Countdown ---------- */
    function initCountdown() {
        var box = $("#countdown");
        var cells = {};
        $all("[data-unit]", box).forEach(function (el) { cells[el.dataset.unit] = el; });

        function pad(n) { return String(n).padStart(2, "0"); }

        function tick() {
            var diff = EVENT_START - Date.now();
            if (diff <= 0) {
                box.innerHTML = '<p class="hero__kicker" style="font-size:1.2rem">¡El festival ya empezó! 🎉</p>';
                return;
            }
            var s = Math.floor(diff / 1000);
            cells.d.textContent = pad(Math.floor(s / 86400));
            cells.h.textContent = pad(Math.floor(s % 86400 / 3600));
            cells.m.textContent = pad(Math.floor(s % 3600 / 60));
            cells.s.textContent = pad(s % 60);
            setTimeout(tick, 1000);
        }
        tick();
    }

    /* ---------- Line-up flip cards ---------- */
    function initLineup() {
        $all(".act").forEach(function (card) {
            card.addEventListener("click", function () {
                card.setAttribute("aria-pressed", card.getAttribute("aria-pressed") === "true" ? "false" : "true");
            });
        });
    }

    /* ---------- Beer pong ---------- */
    function initPong() {
        var table = $("#pongTable");
        var ball = $("#pongBall");
        var scoreEl = $("#pongScore");
        var cups = $all(".cup", table);
        var score = 0;
        var busy = false;

        cups.forEach(function (cup) {
            cup.addEventListener("click", function () {
                if (busy || cup.classList.contains("is-hit")) return;
                busy = true;

                var t = table.getBoundingClientRect();
                var c = cup.getBoundingClientRect();
                var b = ball.getBoundingClientRect();
                var hit = Math.random() < 0.7;
                var dx = c.left + c.width / 2 - (b.left + b.width / 2) + (hit ? 0 : (Math.random() < 0.5 ? -1 : 1) * c.width * 0.9);
                var dy = c.top + c.height / 2 - (b.top + b.height / 2);
                var arc = Math.min(-60, dy * 0.4) - t.height * 0.1;

                var anim = ball.animate([
                    { transform: "translate(0,0) scale(1)" },
                    { transform: "translate(" + dx / 2 + "px," + (dy / 2 + arc) + "px) scale(1.5)", offset: 0.5 },
                    { transform: "translate(" + dx + "px," + dy + "px) scale(" + (hit ? 0.4 : 0.9) + ")" }
                ], { duration: 650, easing: "ease-in-out", fill: "forwards" });

                anim.onfinish = function () {
                    if (hit) {
                        cup.classList.add("is-hit");
                        score++;
                        scoreEl.textContent = score;
                        if (score === cups.length) confetti(160);
                    }
                    setTimeout(function () {
                        anim.cancel();
                        busy = false;
                    }, hit ? 150 : 350);
                };
            });
        });

        $("#pongReset").addEventListener("click", function () {
            cups.forEach(function (c) { c.classList.remove("is-hit"); });
            score = 0;
            scoreEl.textContent = "0";
        });
    }

    /* ---------- Discografía ---------- */
    var ALBUMS = [
        { img: "images/albums/jose-jose.webp", title: "La Nave del Olvido", artist: "José José", genre: "Balada", label: "#d81b3c",
          caption: "Camisa de satín y micrófono en mano. Ensayando para el karaoke." },
        { img: "images/albums/blink-182.webp", title: "Enema of the State", artist: "blink-182", genre: "Pop punk", label: "#2de2e6",
          caption: "Turno de noche. Guantes listos para el torneo de beer pong." },
        { img: "images/albums/blue-hawaii.webp", title: "Blue Hawaii", artist: "Elvis Presley", genre: "Rock & roll", label: "#ffd23f",
          caption: "14 great songs, un ukulele y collar de flores incluido." },
        { img: "images/albums/haragan.webp", title: "El Haragán y Compañía", artist: "El Haragán y Compañía", genre: "Rock urbano", label: "#ff7a1a",
          caption: "Valedores juveniles, presente. Rock de barrio para toda la banda." },
        { img: "images/albums/panda.webp", title: "Para ti con desprecio", artist: "Panda", genre: "Emo / Pop punk", label: "#ff2e88",
          caption: "Mariposas, aretes y desprecio. Edición de colección." },
        { img: "images/albums/willie-colon.webp", title: "Legal Alien · Top Secrets", artist: "Willie Colón", genre: "Salsa", label: "#7b2ff7",
          caption: "Lentes oscuros, bigote y salsa brava para cerrar la noche." }
    ];

    function initDiscos() {
        var stage = $("#discosStage");
        var dotsBox = $("#discosDots");
        var playBtn = $("#discosPlay");
        var lightbox = $("#discosLightbox");
        var current = 0;
        var playing = false;

        var items = ALBUMS.map(function (a, i) {
            var el = document.createElement("div");
            el.className = "disco";
            el.style.setProperty("--label", a.label);
            el.setAttribute("role", "group");
            el.setAttribute("aria-label", a.title + " — " + a.artist + " (versión Alan)");
            el.innerHTML = '<span class="disco__vinyl"><span class="disco__disc"><span class="disco__label">AF21</span></span></span>' +
                '<img class="disco__cover" src="' + a.img + '" alt="Portada de ' + escapeHtml(a.title) + ' con la cara de Alan" loading="lazy" draggable="false">';
            el.addEventListener("click", function () {
                if (moved) return;
                if (i === current) setPlaying(!playing);
                else go(i);
            });
            stage.appendChild(el);

            var dot = document.createElement("button");
            dot.type = "button";
            dot.setAttribute("aria-label", "Ver " + a.title);
            dot.addEventListener("click", function () { go(i); });
            dotsBox.appendChild(dot);
            return { el: el, dot: dot };
        });

        function render() {
            var n = ALBUMS.length;
            items.forEach(function (it, i) {
                var o = i - current;
                if (o > n / 2) o -= n;
                if (o < -n / 2) o += n;
                var abs = Math.abs(o);
                it.el.style.transform = o === 0
                    ? "translateX(-14%) translateZ(0)"
                    : "translateX(" + (o * 48 + (o > 0 ? 62 : -34)) + "%) translateZ(" + (-abs * 160) + "px) rotateY(" + (o > 0 ? -38 : 38) + "deg)";
                it.el.style.zIndex = 10 - abs;
                it.el.style.opacity = abs > 2 ? 0 : 1;
                it.el.style.filter = o === 0 ? "none" : "brightness(" + (1 - abs * 0.25) + ")";
                it.el.style.pointerEvents = abs > 2 ? "none" : "";
                it.el.classList.toggle("is-active", o === 0);
                it.el.classList.toggle("is-playing", o === 0 && playing);
                it.el.setAttribute("aria-hidden", o === 0 ? "false" : "true");
                it.dot.setAttribute("aria-current", o === 0 ? "true" : "false");
            });

            var a = ALBUMS[current];
            $("#discosGenre").textContent = a.genre;
            $("#discosTitle").textContent = a.title;
            $("#discosArtist").textContent = a.artist + " · versión Alan";
            $("#discosCaption").textContent = a.caption;
            playBtn.innerHTML = playing ? '<span class="eq"><i></i><i></i><i></i></span> Pausar' : "▶ Poner disco";
        }

        function go(i) {
            current = (i + ALBUMS.length) % ALBUMS.length;
            playing = false;
            render();
        }

        function setPlaying(v) {
            playing = v;
            render();
        }

        $("#discosPrev").addEventListener("click", function () { go(current - 1); });
        $("#discosNext").addEventListener("click", function () { go(current + 1); });
        playBtn.addEventListener("click", function () { setPlaying(!playing); });

        stage.addEventListener("keydown", function (e) {
            if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
            else if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
            else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlaying(!playing); }
        });

        // Swipe / arrastre
        var startX = null;
        var moved = false;
        stage.addEventListener("pointerdown", function (e) { startX = e.clientX; moved = false; });
        stage.addEventListener("pointermove", function (e) {
            if (startX !== null && Math.abs(e.clientX - startX) > 10) moved = true;
        });
        window.addEventListener("pointerup", function (e) {
            if (startX === null) return;
            var dx = e.clientX - startX;
            startX = null;
            if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
            setTimeout(function () { moved = false; }, 0);
        });

        $("#discosRequest").addEventListener("click", function () {
            $("#songQuery").value = ALBUMS[current].artist;
            $("#playlist").scrollIntoView({ behavior: "smooth" });
            $("#songForm").requestSubmit();
        });

        $("#discosZoom").addEventListener("click", function () {
            var a = ALBUMS[current];
            var img = $("#discosLightboxImg");
            img.src = a.img;
            img.alt = "Portada de " + a.title + " con la cara de Alan";
            if (lightbox.showModal) lightbox.showModal();
        });
        $(".lightbox__close", lightbox).addEventListener("click", function () { lightbox.close(); });
        lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.close(); });

        render();
    }

    /* ---------- Calendar ---------- */
    function toIcsDate(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }

    function initCalendar() {
        var details = "Coco Trash en vivo (ska y rock en español, ~9:00 PM por confirmar), karaoke, beer pong y fiesta. " + MAPS_URL;
        var gcal = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
            "&text=" + encodeURIComponent("ALAN FEST 21 🎉") +
            "&dates=" + toIcsDate(EVENT_START) + "/" + toIcsDate(EVENT_END) +
            "&details=" + encodeURIComponent(details) +
            "&location=" + encodeURIComponent(ADDRESS);
        $("#gcalLink").href = gcal;

        $("#icsBtn").addEventListener("click", function () {
            var ics = [
                "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Alan Fest 21//ES", "BEGIN:VEVENT",
                "UID:alanfest21-20261121@alexis4021.github.io",
                "DTSTAMP:" + toIcsDate(new Date()),
                "DTSTART:" + toIcsDate(EVENT_START),
                "DTEND:" + toIcsDate(EVENT_END),
                "SUMMARY:ALAN FEST 21",
                "DESCRIPTION:" + details,
                "LOCATION:" + ADDRESS.replace(/,/g, "\\,"),
                "END:VEVENT", "END:VCALENDAR"
            ].join("\r\n");
            var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
            var a = document.createElement("a");
            a.href = url;
            a.download = "alan-fest-21.ics";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });
    }

    /* ---------- Venue ---------- */
    function initVenue() {
        var btn = $("#copyAddress");
        btn.addEventListener("click", function () {
            var done = function () {
                btn.textContent = "¡Copiada!";
                setTimeout(function () { btn.textContent = "Copiar dirección"; }, 1800);
            };
            if (navigator.clipboard) navigator.clipboard.writeText(ADDRESS).then(done, done);
            else done();
        });
    }

    /* ---------- Backend (Supabase Edge Functions) ---------- */
    function api(fn, payload) {
        return fetch(CONFIG.apiBase + "/" + fn, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (data) {
                if (!r.ok) {
                    var err = new Error(fn + " " + r.status);
                    err.code = data.error;
                    throw err;
                }
                return data;
            });
        });
    }

    function initPlaylist() {
        var form = $("#songForm");
        var input = $("#songQuery");
        var msg = $("#songMsg");
        var list = $("#songResults");
        var embed = $("#playlistEmbed");

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var q = input.value.trim();
            if (q.length < 2) return;

            setMsg(msg, "Buscando…");
            list.innerHTML = "";
            api("song", { action: "search", q: q })
                .then(function (data) {
                    var tracks = data.tracks || [];
                    if (!tracks.length) {
                        setMsg(msg, "No encontramos nada. Prueba con otro nombre.", "error");
                        return;
                    }
                    setMsg(msg, "");
                    tracks.forEach(function (t) { list.appendChild(renderTrack(t)); });
                })
                .catch(function (err) {
                    console.error(err);
                    setMsg(msg, "No se pudo buscar en Spotify. Intenta de nuevo en un momento.", "error");
                });
        });

        function renderTrack(track) {
            var li = document.createElement("li");
            li.className = "result";
            li.innerHTML =
                '<img alt="" loading="lazy" src="' + escapeHtml(track.image) + '">' +
                '<span class="result__text"><span class="result__title">' + escapeHtml(track.name) + '</span>' +
                '<span class="result__artist">' + escapeHtml(track.artists) + '</span></span>' +
                '<button type="button">+ Agregar</button>';

            var btn = $("button", li);
            btn.addEventListener("click", function () {
                btn.disabled = true;
                btn.textContent = "…";
                api("song", { action: "add", uri: track.uri }).then(function () {
                    btn.textContent = "✓ Lista";
                    setMsg(msg, "¡“" + track.name + "” ya está en la playlist! 🎶", "ok");
                    confetti(60);
                    embed.src = embed.src; // recarga el reproductor
                }).catch(function (err) {
                    console.error(err);
                    btn.disabled = false;
                    btn.textContent = "+ Agregar";
                    setMsg(msg, err.code === "rate_limited"
                        ? "Ya agregaste muchas canciones. Deja algo para los demás 😉"
                        : "No se pudo agregar. Intenta otra vez.", "error");
                });
            });
            return li;
        }
    }

    /* ---------- Pulsera ---------- */
    function codeFrom(str) {
        var h = 0;
        for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
        return "AF21-" + String(h % 10000).padStart(4, "0");
    }

    function initWristband() {
        var wrap = $(".wristband-wrap");
        var band = $("#wristband");
        if (window.matchMedia("(hover: hover)").matches) {
            wrap.addEventListener("pointermove", function (e) {
                var r = wrap.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width - 0.5;
                var y = (e.clientY - r.top) / r.height - 0.5;
                band.style.transform = "rotateY(" + x * 18 + "deg) rotateX(" + -y * 18 + "deg)";
            });
            wrap.addEventListener("pointerleave", function () { band.style.transform = ""; });
        }
    }

    /* ---------- RSVP ---------- */
    function initRsvp() {
        var form = $("#rsvpForm");
        var msg = $("#rsvpMsg");
        var submit = $("#rsvpSubmit");
        var guestsBlock = $("#guestsBlock");
        var guestsDetail = $("#guestsDetail");
        var guestCount = $("#guestCount");

        function value(name) {
            var el = form.elements[name];
            return el ? String(el.value).trim() : "";
        }

        function state() {
            var attending = value("attending") === "si";
            var hasGuests = attending && value("hasGuests") === "si";
            return {
                attending: attending,
                name: value("name"),
                email: value("email"),
                hasGuests: hasGuests,
                guestCount: hasGuests ? parseInt(guestCount.value, 10) || 1 : 0,
                guestNames: hasGuests ? value("guestNames") : "",
                message: value("message")
            };
        }

        function updateUi() {
            var s = state();
            guestsBlock.hidden = !s.attending;
            guestsDetail.hidden = !s.hasGuests;
            $("#wbName").textContent = s.name || "TU NOMBRE";
            $("#wbGuests").textContent = "+" + s.guestCount;
            $("#wbType").textContent = s.attending ? (s.hasGuests ? "GENERAL ACCESS + GUESTS" : "GENERAL ACCESS") : "TE VAMOS A EXTRAÑAR";
            $("#wbCode").textContent = codeFrom((s.email || "") + s.name);
        }

        form.addEventListener("input", updateUi);
        form.addEventListener("change", updateUi);

        $all(".stepper button", form).forEach(function (b) {
            b.addEventListener("click", function () {
                var v = (parseInt(guestCount.value, 10) || 1) + parseInt(b.dataset.step, 10);
                guestCount.value = Math.max(1, Math.min(10, v));
                updateUi();
            });
        });

        form.addEventListener("submit", function (e) {
            e.preventDefault();
            var s = state();

            var invalid = [];
            if (s.name.length < 2) invalid.push("name");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) invalid.push("email");
            ["name", "email"].forEach(function (n) {
                form.elements[n].setAttribute("aria-invalid", invalid.indexOf(n) > -1 ? "true" : "false");
            });
            if (invalid.length) {
                setMsg(msg, "Revisa tu nombre y correo.", "error");
                form.elements[invalid[0]].focus();
                return;
            }

            submit.disabled = true;
            submit.textContent = "Enviando…";
            setMsg(msg, "");

            s.website = value("website");
            api("rsvp", s)
                .then(function () {
                    var band = $("#wristband");
                    band.classList.remove("is-confirmed");
                    void band.offsetWidth;
                    band.classList.add("is-confirmed");
                    $("#wbType").textContent = s.attending ? "✓ CONFIRMADO" : "GRACIAS POR AVISAR";
                    setMsg(msg, s.attending
                        ? "¡Listo, " + s.name.split(" ")[0] + "! Te mandamos tu pulsera a " + s.email + "."
                        : "Gracias por avisar, te vamos a extrañar.", "ok");
                    submit.textContent = "¡Confirmado!";
                    if (s.attending) confetti(220);
                })
                .catch(function (err) {
                    console.error(err);
                    submit.disabled = false;
                    submit.textContent = "Confirmar";
                    setMsg(msg, err.code === "rate_limited"
                        ? "Demasiados intentos. Espera un rato e intenta de nuevo."
                        : "No se pudo enviar. Intenta de nuevo en un momento.", "error");
                });
        });

        updateUi();
    }


    /* ---------- Confetti ---------- */
    var canvas = $("#confetti");
    var ctx = canvas.getContext("2d");
    var pieces = [];
    var running = false;
    var COLORS = ["#ff2e88", "#ff7a1a", "#ffd23f", "#2de2e6", "#7b2ff7", "#fff7ec"];

    function resizeCanvas() {
        canvas.width = window.innerWidth * devicePixelRatio;
        canvas.height = window.innerHeight * devicePixelRatio;
    }

    function confetti(count) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        resizeCanvas();
        var w = canvas.width;
        for (var i = 0; i < count; i++) {
            pieces.push({
                x: w / 2 + (Math.random() - 0.5) * w * 0.4,
                y: canvas.height * 0.35,
                vx: (Math.random() - 0.5) * 22 * devicePixelRatio,
                vy: (-Math.random() * 18 - 6) * devicePixelRatio,
                size: (Math.random() * 8 + 5) * devicePixelRatio,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.3,
                color: COLORS[(Math.random() * COLORS.length) | 0],
                life: 0
            });
        }
        if (!running) { running = true; requestAnimationFrame(frame); }
    }

    function frame() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pieces = pieces.filter(function (p) { return p.y < canvas.height + 40 && p.life < 400; });
        pieces.forEach(function (p) {
            p.vy += 0.45 * devicePixelRatio;
            p.vx *= 0.985;
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            p.life++;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            ctx.restore();
        });
        if (pieces.length) requestAnimationFrame(frame);
        else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    }

    window.addEventListener("resize", function () { if (running) resizeCanvas(); });

    /* ---------- Reveal on scroll ---------- */
    function initReveal() {
        if (!("IntersectionObserver" in window)) return;
        var els = $all(".section__head, .act, .pong, .discos, .when, .venue, .playlist, .rsvp");
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
            });
        }, { threshold: 0.12 });
        els.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
    }

    initCountdown();
    initLineup();
    initPong();
    initDiscos();
    initCalendar();
    initVenue();
    initPlaylist();
    initWristband();
    initRsvp();
    initReveal();

    $(".hero__badge").addEventListener("click", function () { confetti(120); });
})();
