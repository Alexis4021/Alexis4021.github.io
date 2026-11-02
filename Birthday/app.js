(function () {
    "use strict";

    var CONFIG = window.ALANFEST_CONFIG || { brevo: {}, spotify: {} };
    var EVENT_START = new Date("2026-11-21T17:00:00-06:00"); // Monterrey (UTC-6)
    var EVENT_END = new Date("2026-11-22T02:00:00-06:00");
    var ADDRESS = "C. Nottingham 310, Pedregal de Linda Vista 2o Sector 2a Etapa, 67112 Guadalupe, N.L.";
    var MAPS_URL = "https://maps.app.goo.gl/GyfLFKH36MazwqAb8";
    var PLAYLIST_URL = "https://open.spotify.com/playlist/" + CONFIG.spotify.playlistId;

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

    /* ---------- Calendar ---------- */
    function toIcsDate(d) { return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }

    function initCalendar() {
        var details = "Música en vivo, karaoke, beer pong y fiesta. " + MAPS_URL;
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

    /* ---------- Spotify ---------- */
    var spotifyToken = null;
    var spotifyTokenExp = 0;

    function spotifyConfigured() {
        var s = CONFIG.spotify;
        return s && s.clientId && s.clientSecret && s.refreshToken && s.playlistId;
    }

    function getSpotifyToken() {
        if (spotifyToken && Date.now() < spotifyTokenExp) return Promise.resolve(spotifyToken);
        var s = CONFIG.spotify;
        return fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + btoa(s.clientId + ":" + s.clientSecret)
            },
            body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: s.refreshToken })
        }).then(function (r) {
            if (!r.ok) throw new Error("token " + r.status);
            return r.json();
        }).then(function (data) {
            spotifyToken = data.access_token;
            spotifyTokenExp = Date.now() + (data.expires_in - 60) * 1000;
            return spotifyToken;
        });
    }

    function spotifyApi(path, options) {
        return getSpotifyToken().then(function (token) {
            options = options || {};
            options.headers = Object.assign({ "Authorization": "Bearer " + token }, options.headers || {});
            return fetch("https://api.spotify.com/v1" + path, options);
        }).then(function (r) {
            if (!r.ok) throw new Error("api " + r.status);
            return r.status === 204 ? null : r.json();
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

            if (!spotifyConfigured()) {
                setMsg(msg, "La búsqueda aún no está activada. Mientras, agrégala directo en Spotify.", "error");
                console.warn("[Alan Fest] Falta configurar spotify.clientId / clientSecret / refreshToken en config.js");
                return;
            }

            setMsg(msg, "Buscando…");
            list.innerHTML = "";
            spotifyApi("/search?type=track&limit=8&market=" + encodeURIComponent(CONFIG.spotify.market || "MX") +
                "&q=" + encodeURIComponent(q))
                .then(function (data) {
                    var tracks = (data.tracks && data.tracks.items) || [];
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
            var imgs = (track.album && track.album.images) || [];
            var img = imgs.length ? imgs[imgs.length - 1].url : "";
            var artists = (track.artists || []).map(function (a) { return a.name; }).join(", ");
            li.innerHTML =
                '<img alt="" loading="lazy" src="' + escapeHtml(img) + '">' +
                '<span class="result__text"><span class="result__title">' + escapeHtml(track.name) + '</span>' +
                '<span class="result__artist">' + escapeHtml(artists) + '</span></span>' +
                '<button type="button">+ Agregar</button>';

            var btn = $("button", li);
            btn.addEventListener("click", function () {
                btn.disabled = true;
                btn.textContent = "…";
                spotifyApi("/playlists/" + encodeURIComponent(CONFIG.spotify.playlistId) + "/items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uris: [track.uri] })
                }).then(function () {
                    btn.textContent = "✓ Lista";
                    setMsg(msg, "¡“" + track.name + "” ya está en la playlist! 🎶", "ok");
                    confetti(60);
                    embed.src = embed.src; // recarga el reproductor
                }).catch(function (err) {
                    console.error(err);
                    btn.disabled = false;
                    btn.textContent = "+ Agregar";
                    setMsg(msg, "No se pudo agregar. Intenta otra vez.", "error");
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
                age: value("age"),
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
            var ageNum = Number(s.age);
            if (!s.age || !(ageNum >= 1 && ageNum <= 120)) invalid.push("age");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) invalid.push("email");
            ["name", "age", "email"].forEach(function (n) {
                form.elements[n].setAttribute("aria-invalid", invalid.indexOf(n) > -1 ? "true" : "false");
            });
            if (invalid.length) {
                setMsg(msg, "Revisa tu nombre, edad y correo.", "error");
                form.elements[invalid[0]].focus();
                return;
            }

            if (!CONFIG.brevo || !CONFIG.brevo.apiKey) {
                setMsg(msg, "El RSVP aún no está activado. Avísale a Alan directamente.", "error");
                console.warn("[Alan Fest] Falta brevo.apiKey en config.js");
                return;
            }

            submit.disabled = true;
            submit.textContent = "Enviando…";
            setMsg(msg, "");

            var code = codeFrom(s.email + s.name);
            Promise.all([sendHostEmail(s, code), sendGuestEmail(s, code)])
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
                    setMsg(msg, "No se pudo enviar. Intenta de nuevo en un momento.", "error");
                });
        });

        updateUi();
    }

    function sendBrevo(payload) {
        var b = CONFIG.brevo;
        payload.sender = { name: b.senderName || "Alan Fest 21", email: b.senderEmail };
        return fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: { "api-key": b.apiKey, "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(payload)
        }).then(function (r) {
            if (!r.ok) return r.text().then(function (t) { throw new Error("Brevo " + r.status + ": " + t); });
            return r.json();
        });
    }

    function emailShell(inner) {
        return '<div style="margin:0;padding:24px;background:#120a1f;font-family:Arial,Helvetica,sans-serif;color:#fff7ec">' +
            '<div style="max-width:560px;margin:0 auto;background:#1c1030;border-radius:16px;overflow:hidden">' +
            '<div style="padding:28px 24px;background:linear-gradient(135deg,#ff7a1a,#ff2e88);text-align:center">' +
            '<div style="font-size:40px;font-weight:900;letter-spacing:2px;color:#fff">ALAN FEST <span style="background:#120a1f;padding:0 8px;border-radius:6px">21</span></div>' +
            '<div style="margin-top:6px;font-size:14px;letter-spacing:3px;color:#fff">SÁB 21 NOV 2026 · 5:00 PM</div></div>' +
            '<div style="padding:24px">' + inner + '</div></div></div>';
    }

    function row(label, val) {
        return '<tr><td style="padding:6px 12px 6px 0;color:#c9b8dc;vertical-align:top">' + label +
            '</td><td style="padding:6px 0;color:#fff7ec"><b>' + escapeHtml(val) + '</b></td></tr>';
    }

    function sendHostEmail(s, code) {
        var subject = (s.attending ? "✅ RSVP: " : "❌ No asistirá: ") + s.name +
            (s.guestCount ? " (+" + s.guestCount + ")" : "");
        var html = emailShell(
            '<h2 style="margin:0 0 12px;color:#ffd23f">' + (s.attending ? "Nuevo RSVP confirmado" : "Alguien no podrá ir") + '</h2>' +
            '<table style="border-collapse:collapse;font-size:15px">' +
            row("Nombre", s.name) + row("Edad", s.age) + row("Correo", s.email) +
            row("Asiste", s.attending ? "Sí" : "No") +
            row("Invitados", s.guestCount ? String(s.guestCount) : "Ninguno") +
            (s.guestNames ? row("Nombres", s.guestNames) : "") +
            (s.message ? row("Mensaje", s.message) : "") +
            row("Folio", code) +
            '</table>');
        return sendBrevo({
            to: [{ email: CONFIG.brevo.hostEmail, name: "Alan" }],
            replyTo: { email: s.email, name: s.name },
            subject: subject,
            htmlContent: html
        });
    }

    function sendGuestEmail(s, code) {
        var first = s.name.split(" ")[0];
        var inner = s.attending
            ? '<h2 style="margin:0 0 8px;color:#ffd23f">¡Ya tienes tu pulsera, ' + escapeHtml(first) + '! 🤘</h2>' +
              '<p style="margin:0 0 16px;line-height:1.5">Tu lugar en <b>Alan Fest 21</b> está confirmado' +
              (s.guestCount ? ' para ti y ' + s.guestCount + ' invitado' + (s.guestCount > 1 ? 's' : '') : '') + '.</p>' +
              '<div style="background:linear-gradient(135deg,#ffd23f,#ff7a1a);color:#120a1f;border-radius:12px;padding:16px;margin:0 0 18px">' +
              '<div style="font-size:12px;letter-spacing:3px;font-weight:bold">GENERAL ACCESS' + (s.guestCount ? ' +' + s.guestCount : '') + '</div>' +
              '<div style="font-size:26px;font-weight:900;text-transform:uppercase">' + escapeHtml(s.name) + '</div>' +
              '<div style="font-family:monospace;font-size:13px;opacity:.8">' + code + '</div></div>' +
              '<p style="margin:0 0 6px"><b style="color:#ff2e88">Line-up:</b> música en vivo · karaoke · beer pong · fiesta</p>' +
              '<p style="margin:0 0 6px"><b style="color:#ff2e88">Cuándo:</b> sábado 21 de noviembre 2026, 5:00 PM</p>' +
              '<p style="margin:0 0 18px"><b style="color:#ff2e88">Dónde:</b> ' + escapeHtml(ADDRESS) + '</p>' +
              '<p style="margin:0 0 10px"><a href="' + MAPS_URL + '" style="display:inline-block;background:#ff2e88;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">Cómo llegar</a> ' +
              '<a href="' + PLAYLIST_URL + '" style="display:inline-block;background:#1ed760;color:#0b1a10;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:bold">Playlist</a></p>'
            : '<h2 style="margin:0 0 8px;color:#ffd23f">Gracias por avisar, ' + escapeHtml(first) + '</h2>' +
              '<p style="margin:0;line-height:1.5">Te vamos a extrañar en Alan Fest 21. Si cambias de planes, vuelve a confirmar desde la invitación.</p>';
        return sendBrevo({
            to: [{ email: s.email, name: s.name }],
            replyTo: { email: CONFIG.brevo.hostEmail, name: "Alan" },
            subject: s.attending ? "🎟️ Tu pulsera para Alan Fest 21" : "Alan Fest 21 — gracias por avisar",
            htmlContent: emailShell(inner)
        });
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
        var els = $all(".section__head, .act, .pong, .when, .venue, .playlist, .rsvp");
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
    initCalendar();
    initVenue();
    initPlaylist();
    initWristband();
    initRsvp();
    initReveal();

    $(".hero__badge").addEventListener("click", function () { confetti(120); });
})();
