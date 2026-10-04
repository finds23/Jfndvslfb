"use strict";
// providers/123.js
// Provider Nuvio para un sitio WordPress de películas y series.
//
// Flujo:
//   TMDB -> títulos/año -> búsqueda /?s=<título> -> página de la película
//   -> iframe del reproductor -> HTML del reproductor (sources:[{file:…m3u8}])
//   -> master.m3u8 -> variante de mayor resolución.
//
// Contrato Nuvio: exports.getStreams(tmdbId, type, season, episode) -> Promise<Array<Stream>>
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// Decodificador base64 propio: no depende de que el entorno tenga `atob`.
function b64decode(input) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var str = String(input).replace(/[^A-Za-z0-9+\/]/g, "");
    var out = "";
    var buffer = 0;
    var bits = 0;
    for (var i = 0; i < str.length; i++) {
        buffer = (buffer << 6) | chars.indexOf(str.charAt(i));
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out += String.fromCharCode((buffer >> bits) & 255);
            buffer &= (1 << bits) - 1;
        }
    }
    return out;
}
var PROVIDER_NAME = "123"; // nombre visible en los logs y en la lista de streams
var SITE_BASE = b64decode("aHR0cHM6Ly9wZWxpczE4Mi5uZXQ=");
var TMDB_API_KEY = "56db0ec297530920213e1503706b81ff";
var UA = "Mozilla/5.0 (Linux; Android 13; moto g82 5G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36";
// DEBUG: true muestra en la lista de streams el motivo por el que no se encontró nada.
// Ponlo en false cuando todo funcione.
var DEBUG = true;
// ─────────────────────────────────────────────
// Utilidades (sin depender de URL, que en React Native está incompleta)
// ─────────────────────────────────────────────
function getOrigin(url) {
    var m = String(url || "").match(/^(https?:\/\/[^\/?#]+)/i);
    return m ? m[1] : "";
}
function getHost(url) {
    return getOrigin(url).replace(/^https?:\/\//i, "").toLowerCase();
}
function stripAccents(s) {
    try {
        return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    catch (_) {
        return String(s);
    }
}
function normalizeTitle(s) {
    return stripAccents(s)
        .toLowerCase()
        .replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}
function decodeEntities(s) {
    return String(s)
        .replace(/&amp;/g, "&")
        .replace(/&#0?39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#8211;|&ndash;/g, "-")
        .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); });
}
function lastMatch(re, text) {
    var last = null;
    var m;
    while ((m = re.exec(text)) !== null)
        last = m;
    return last;
}
// ─────────────────────────────────────────────
// TMDB -> títulos y año
// ─────────────────────────────────────────────
function tmdbGet(path, params) {
    return __awaiter(this, void 0, void 0, function () {
        var url, resp, data, _1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    url = "https://api.themoviedb.org/3/".concat(path, "?api_key=").concat(TMDB_API_KEY).concat(params ? "&" + params : "");
                    return [4 /*yield*/, fetchRetry(url, { headers: { "User-Agent": UA } })];
                case 1:
                    resp = _a.sent();
                    if (!resp.ok)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, resp.json()];
                case 2:
                    data = _a.sent();
                    return [2 /*return*/, data && data.success === false ? null : data];
                case 3:
                    _1 = _a.sent();
                    return [2 /*return*/, null];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Países de habla hispana: sus títulos alternativos sirven para encontrar la película
// cuando el sitio la publica con otro nombre ("Snowpiercer" / "El expreso del miedo" / "El tren del miedo").
var ALT_TITLE_COUNTRIES = ["MX", "ES", "AR", "CL", "CO", "PE", "VE", "UY", "EC", "BO", "PY", "CR", "GT", "PA", "DO", "US"];
function getTMDBInfo(tmdbId, type) {
    return __awaiter(this, void 0, void 0, function () {
        var path, append, _a, es, en, titles, altTitles, seen, add, _i, _b, d, _c, _d, t, _e, _f, tr, alts, _g, alts_1, alt, base, releaseDate, year, imageNames, director, d;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0:
                    path = type === "movie" ? "movie" : "tv";
                    append = "append_to_response=alternative_titles,translations,credits";
                    return [4 /*yield*/, Promise.all([
                            tmdbGet("".concat(path, "/").concat(tmdbId), "language=es-MX&".concat(append)),
                            tmdbGet("".concat(path, "/").concat(tmdbId), "language=en-US")
                        ])];
                case 1:
                    _a = _h.sent(), es = _a[0], en = _a[1];
                    if (!es && !en)
                        return [2 /*return*/, null];
                    titles = [];
                    altTitles = [];
                    seen = {};
                    add = function (list, t) {
                        if (!t)
                            return;
                        var key = normalizeTitle(t);
                        if (!key || seen[key])
                            return;
                        seen[key] = true;
                        list.push(t);
                    };
                    // Títulos principales: es-MX, original, inglés.
                    for (_i = 0, _b = [es, en]; _i < _b.length; _i++) {
                        d = _b[_i];
                        if (!d)
                            continue;
                        for (_c = 0, _d = [d.title, d.name, d.original_title, d.original_name]; _c < _d.length; _c++) {
                            t = _d[_c];
                            add(titles, t);
                        }
                    }
                    // Alternativos: traducciones al español y títulos de países hispanohablantes.
                    if (es && es.translations && es.translations.translations) {
                        for (_e = 0, _f = es.translations.translations; _e < _f.length; _e++) {
                            tr = _f[_e];
                            if (tr.iso_639_1 === "es" && tr.data)
                                add(altTitles, tr.data.title || tr.data.name);
                        }
                    }
                    if (es && es.alternative_titles) {
                        alts = es.alternative_titles.titles || es.alternative_titles.results || [];
                        for (_g = 0, alts_1 = alts; _g < alts_1.length; _g++) {
                            alt = alts_1[_g];
                            if (ALT_TITLE_COUNTRIES.indexOf(alt.iso_3166_1) !== -1)
                                add(altTitles, alt.title);
                        }
                    }
                    base = es || en;
                    releaseDate = base.release_date || base.first_air_date || "";
                    year = releaseDate ? new Date(releaseDate).getFullYear() : undefined;
                    imageNames = [base.poster_path, base.backdrop_path].filter(Boolean).map(function (x) { return String(x).replace(/^\//, ""); });
                    director = "";
                    if (type === "movie" && es && es.credits && es.credits.crew) {
                        d = es.credits.crew.find(function (c) { return c.job === "Director"; });
                        if (d && d.name)
                            director = d.name;
                    }
                    return [2 /*return*/, { titles: titles, altTitles: altTitles, year: year, releaseDate: releaseDate, imageNames: imageNames, director: director }];
            }
        });
    });
}
// fetch con reintentos: 2 reintentos con espera creciente si el servidor responde 408, 429 o 5xx,
// o si la conexión falla. (No modifica el fetch global.)
function fetchRetry(url, options) {
    return __awaiter(this, void 0, void 0, function () {
        var retries, lastError, _loop_1, attempt, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    retries = 2;
                    lastError = null;
                    _loop_1 = function (attempt) {
                        var resp, retryable, e_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, fetch(url, options)];
                                case 1:
                                    resp = _b.sent();
                                    retryable = resp.status === 408 || resp.status === 429 || (resp.status >= 500 && resp.status < 600);
                                    if (!retryable || attempt === retries)
                                        return [2 /*return*/, { value: resp }];
                                    return [3 /*break*/, 3];
                                case 2:
                                    e_1 = _b.sent();
                                    lastError = e_1;
                                    if (attempt === retries)
                                        throw e_1;
                                    return [3 /*break*/, 3];
                                case 3: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 400 * Math.pow(2, attempt)); })];
                                case 4:
                                    _b.sent();
                                    return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 0;
                    _a.label = 1;
                case 1:
                    if (!(attempt <= retries)) return [3 /*break*/, 4];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 2:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 3;
                case 3:
                    attempt++;
                    return [3 /*break*/, 1];
                case 4: throw lastError || Error("fetch falló");
            }
        });
    });
}
function fetchHtml(url) {
    return __awaiter(this, void 0, void 0, function () {
        var resp, html, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, fetchRetry(url, {
                        headers: {
                            "User-Agent": UA,
                            "Referer": "".concat(SITE_BASE, "/"),
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                            "Accept-Language": "es-MX,es;q=0.9,en;q=0.8"
                        }
                    })];
                case 1:
                    resp = _b.sent();
                    if (!resp.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, resp.text()];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = "";
                    _b.label = 4;
                case 4:
                    html = _a;
                    return [2 /*return*/, { ok: resp.ok, status: resp.status, html: html }];
            }
        });
    });
}
// Extrae { url, title, isTv, seasonNum } de cada <article> del resultado de búsqueda.
function parseSearchResults(html) {
    var results = [];
    var re = /<article[^>]*>([\s\S]*?)<\/article>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var block = m[1];
        var href = block.match(/href=["']([^"']+)["']/i);
        if (!href)
            continue;
        var title = "";
        var heading = block.match(/<h\d[^>]*>([\s\S]*?)<\/h\d>/i);
        if (heading)
            title = heading[1].replace(/<[^>]+>/g, " ");
        if (!title.trim()) {
            var attr = block.match(/\btitle=["']([^"']+)["']/i) || block.match(/\balt=["']([^"']+)["']/i) || block.match(/aria-label=["']([^"']+)["']/i);
            if (attr)
                title = attr[1];
        }
        title = decodeEntities(title).replace(/^\s*p[oó]ster de\s+/i, "").replace(/\s+/g, " ").trim();
        if (!title)
            continue;
        var url = href[1];
        var isTv = /temporada/i.test(url);
        var season = url.match(/temporada-(\d+)/i);
        // El año aparece como texto suelto en la tarjeta (junto a la calificación).
        var text = " " + block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") + " ";
        var yearM = text.match(/\s((?:19|20)\d{2})\s/);
        results.push({ url: url, title: title, isTv: isTv, seasonNum: season ? Number(season[1]) : null, year: yearM ? Number(yearM[1]) : undefined });
    }
    return results;
}
function buildSearchTerms(titles, max) {
    var terms = [];
    for (var _i = 0, titles_1 = titles; _i < titles_1.length; _i++) {
        var t = titles_1[_i];
        if (terms.indexOf(t) === -1)
            terms.push(t);
        var plain = stripAccents(t);
        if (plain !== t && terms.indexOf(plain) === -1)
            terms.push(plain);
        // "Título: subtítulo" -> también el título principal
        if (t.indexOf(":") > 0) {
            var head = t.split(":")[0].trim();
            if (head && terms.indexOf(head) === -1)
                terms.push(head);
        }
    }
    return terms.slice(0, max);
}
function searchSite(titles) {
    return __awaiter(this, void 0, void 0, function () {
        var terms, tried, lists, all, seen, _i, lists_1, list, _a, list_1, item;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    terms = buildSearchTerms(titles, 6);
                    tried = [];
                    return [4 /*yield*/, Promise.all(terms.map(function (term) { return __awaiter(_this, void 0, void 0, function () {
                            var r, found, e_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, fetchHtml("".concat(SITE_BASE, "/?s=").concat(encodeURIComponent(term).replace(/%20/g, "+")))];
                                    case 1:
                                        r = _a.sent();
                                        found = r.ok ? parseSearchResults(r.html) : [];
                                        tried.push("\"".concat(term, "\": ").concat(r.ok ? found.length + " resultados" : "HTTP " + r.status));
                                        return [2 /*return*/, found];
                                    case 2:
                                        e_2 = _a.sent();
                                        tried.push("\"".concat(term, "\": ").concat(e_2.message));
                                        return [2 /*return*/, []];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    lists = _b.sent();
                    all = [];
                    seen = {};
                    for (_i = 0, lists_1 = lists; _i < lists_1.length; _i++) {
                        list = lists_1[_i];
                        for (_a = 0, list_1 = list; _a < list_1.length; _a++) {
                            item = list_1[_a];
                            if (seen[item.url])
                                continue;
                            seen[item.url] = true;
                            all.push(item);
                        }
                    }
                    return [2 /*return*/, { results: all, tried: tried }];
            }
        });
    });
}
// Respaldo final: el buscador del sitio indexa el título con que se publicó la entrada, que a
// veces no es ninguno de los de TMDB (ej. "El tren del miedo" vs "El expreso del miedo").
// Se busca por palabras sueltas de los títulos y se deja que el título de la tarjeta decida.
var STOPWORDS = ["el", "la", "los", "las", "de", "del", "un", "una", "unos", "unas", "y", "en", "al", "por", "con", "para", "the", "of", "and", "to", "in", "on"];
function keywordTerms(titles) {
    var words = [];
    for (var _i = 0, _a = titles.slice(0, 5); _i < _a.length; _i++) {
        var t = _a[_i];
        for (var _b = 0, _c = normalizeTitle(t).split(" "); _b < _c.length; _b++) {
            var w = _c[_b];
            if (w.length >= 4 && STOPWORDS.indexOf(w) === -1 && words.indexOf(w) === -1)
                words.push(w);
        }
    }
    return words.slice(0, 5);
}
function searchByKeywords(titles) {
    return __awaiter(this, void 0, void 0, function () {
        var words, tried, lists, all, seen, _i, lists_2, list, _a, list_2, item;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    words = keywordTerms(titles);
                    tried = [];
                    return [4 /*yield*/, Promise.all(words.map(function (w) { return __awaiter(_this, void 0, void 0, function () {
                            var r, found, e_3;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, fetchHtml("".concat(SITE_BASE, "/?s=").concat(encodeURIComponent(w)))];
                                    case 1:
                                        r = _a.sent();
                                        found = r.ok ? parseSearchResults(r.html) : [];
                                        tried.push("palabra \"".concat(w, "\": ").concat(r.ok ? found.length + " resultados" : "HTTP " + r.status));
                                        return [2 /*return*/, found];
                                    case 2:
                                        e_3 = _a.sent();
                                        tried.push("palabra \"".concat(w, "\": ").concat(e_3.message));
                                        return [2 /*return*/, []];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 1:
                    lists = _b.sent();
                    all = [];
                    seen = {};
                    for (_i = 0, lists_2 = lists; _i < lists_2.length; _i++) {
                        list = lists_2[_i];
                        for (_a = 0, list_2 = list; _a < list_2.length; _a++) {
                            item = list_2[_a];
                            if (seen[item.url])
                                continue;
                            seen[item.url] = true;
                            all.push(item);
                        }
                    }
                    return [2 /*return*/, { results: all, tried: tried }];
            }
        });
    });
}
// Ordena los candidatos por parecido de título.
function rankCandidates(results, titles, wantTv, season) {
    var normTitles = titles.map(normalizeTitle);
    var ranked = [];
    var _loop_2 = function (item) {
        if (wantTv !== item.isTv)
            return "continue";
        if (wantTv && season && item.seasonNum && item.seasonNum !== season)
            return "continue";
        // Se compara el título sin sufijos como "Temporada 2" o "(2016)"
        var clean = normalizeTitle(item.title.replace(/\(\s*\d{4}\s*\)/g, "").replace(/temporadas?\s*\d*/gi, "").replace(/todas las temporadas/gi, ""));
        var score = 0;
        if (normTitles.indexOf(clean) !== -1)
            score = 100;
        else if (normTitles.some(function (t) { return t && (clean.indexOf(t) !== -1 || t.indexOf(clean) !== -1); }))
            score = 40;
        if (score > 0)
            ranked.push({ item: item, score: score });
    };
    for (var _i = 0, results_1 = results; _i < results_1.length; _i++) {
        var item = results_1[_i];
        _loop_2(item);
    }
    ranked.sort(function (a, b) { return b.score - a.score; });
    return ranked.map(function (r) { return r.item; });
}
// ─────────────────────────────────────────────
// Página de la película / serie
// ─────────────────────────────────────────────
function getPageYear(html) {
    var t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    var y = t ? t[1].match(/\(\s*(\d{4})\s*\)/) : null;
    return y ? Number(y[1]) : undefined;
}
// Confirma que la página es la película/serie de TMDB. Las señales, de más a menos fiables:
//   - la fecha de estreno exacta aparece en la página
//   - alguna imagen de TMDB (póster/fondo) de esta película aparece en la página
//   - el año coincide (y, vía director, el nombre del director aparece en la página)
// `via` indica cómo se llegó a la página: "title" (el título coincide), "search" (solo salió
// en la búsqueda de un título alternativo) o "director" (búsqueda por director).
function verifyPage(html, info, via, wantTv) {
    var pageYear = getPageYear(html);
    var yearOK = !!(info.year && pageYear && Math.abs(pageYear - info.year) <= 1);
    var exactYear = !!(info.year && pageYear && pageYear === info.year);
    var dateOK = !!(info.releaseDate && html.indexOf(info.releaseDate) !== -1);
    var imageOK = info.imageNames.some(function (n) { return html.indexOf(n) !== -1; });
    if (via === "title")
        return wantTv || !pageYear || yearOK || dateOK || imageOK;
    if (via === "director")
        return dateOK || imageOK || (exactYear && !!info.director && html.indexOf(info.director) !== -1);
    return dateOK || imageOK;
}
// Abre los candidatos en orden y devuelve el primero que se verifica.
function pickPage(candidates, info, wantTv, notes) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, _a, entry, r;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _i = 0, _a = candidates.slice(0, 6);
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    entry = _a[_i];
                    return [4 /*yield*/, fetchHtml(entry.item.url)];
                case 2:
                    r = _b.sent();
                    if (!r.ok) {
                        notes.push("".concat(entry.item.title, ": HTTP ").concat(r.status));
                        return [3 /*break*/, 3];
                    }
                    if (verifyPage(r.html, info, entry.via, wantTv)) {
                        return [2 /*return*/, { url: entry.item.url, title: entry.item.title, html: r.html }];
                    }
                    notes.push("".concat(entry.item.title, " (").concat(entry.via, "): no coincide"));
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, null];
            }
        });
    });
}
function collectIframes(html) {
    var urls = [];
    var re = /<iframe[^>]*?\b(?:data-lazy-src|data-src|src)=["']([^"']+)["']/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
        var u = m[1].replace(/&amp;/g, "&");
        if (u.indexOf("//") === 0)
            u = "https:" + u;
        if (/^https?:\/\//i.test(u) && urls.indexOf(u) === -1)
            urls.push(u);
    }
    // Respaldo: el reproductor aparece escrito como texto/enlace en la página
    var bare = html.match(/https?:\/\/paulinito\.com\/player\/[A-Za-z0-9]+\/?/g) || [];
    for (var _i = 0, bare_1 = bare; _i < bare_1.length; _i++) {
        var u = bare_1[_i];
        if (urls.indexOf(u) === -1)
            urls.push(u);
    }
    return urls;
}
// En series, cada capítulo vive en una pestaña: id="tab-…-t{temporada}x{capítulo}" con su iframe.
function findEpisodeIframe(html, season, episode) {
    var re = new RegExp("id=[\"']tab-[^\"']*-t".concat(season, "x").concat(episode, "[\"'][^>]*>\\s*<iframe[^>]*?\\b(?:data-lazy-src|data-src|src)=[\"']([^\"']+)[\"']"), "i");
    var m = html.match(re);
    if (!m)
        return null;
    var u = m[1].replace(/&amp;/g, "&");
    if (u.indexOf("//") === 0)
        u = "https:" + u;
    return u;
}
// ─────────────────────────────────────────────
// HLS: elegir la variante de mayor resolución
// ─────────────────────────────────────────────
function resolveUrl(base, ref) {
    if (/^https?:\/\//i.test(ref))
        return ref;
    if (ref.charAt(0) === "/")
        return getOrigin(base) + ref;
    return base.split(/[?#]/)[0].replace(/[^\/]*$/, "") + ref;
}
function parseHlsVariants(masterText, masterUrl) {
    var lines = String(masterText).split(/\r?\n/);
    var variants = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf("#EXT-X-STREAM-INF") !== 0)
            continue;
        var bw = line.match(/BANDWIDTH=(\d+)/);
        var res = line.match(/RESOLUTION=(\d+)x(\d+)/);
        var j = i + 1;
        while (j < lines.length && (!lines[j].trim() || lines[j].trim().charAt(0) === "#"))
            j++;
        var uri = lines[j] ? lines[j].trim() : "";
        if (!uri)
            continue;
        variants.push({
            url: resolveUrl(masterUrl, uri),
            bandwidth: bw ? Number(bw[1]) : 0,
            width: res ? Number(res[1]) : 0,
            height: res ? Number(res[2]) : 0
        });
    }
    // Se ordena por resolución (no por bitrate: una variante 1080 puede declarar menos bitrate que una 720).
    return variants.sort(function (x, y) { return (y.height - x.height) || (y.bandwidth - x.bandwidth); });
}
// ─────────────────────────────────────────────
// Extractor del reproductor (JW Player con HLS)
// ─────────────────────────────────────────────
/**
 * El HTML del reproductor trae: sources: [{"file":"https://…/video.m3u8","label":"HD",…}]
 * Ese master lista las calidades (360, 480, 720, 1080); se devuelve la de mayor
 * resolución para que no arranque en la más baja.
 */
function extractPlayer(embedUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var origin, headers, resp, html, m, masterUrl, mresp, variants, _a, best, e_4;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    origin = getOrigin(embedUrl);
                    headers = { "Referer": "".concat(origin, "/"), "Origin": origin, "User-Agent": UA };
                    return [4 /*yield*/, fetch(embedUrl, { headers: { "User-Agent": UA, "Referer": "".concat(SITE_BASE, "/") } })];
                case 1:
                    resp = _b.sent();
                    if (!resp.ok)
                        throw Error("HTTP error! Status: ".concat(resp.status));
                    return [4 /*yield*/, resp.text()];
                case 2:
                    html = (_b.sent()).replace(/\\\//g, "/");
                    m = html.match(/sources\s*:\s*\[\s*\{\s*["']?file["']?\s*:\s*["']([^"']+)["']/i)
                        || html.match(/["']file["']\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)
                        || html.match(/(https?:\/\/[^\s"'\\<>]+\.m3u8[^\s"'\\<>]*)/i);
                    if (!m)
                        throw Error("reproductor sin source");
                    masterUrl = m[1];
                    console.log("[Player] master: ".concat(masterUrl));
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 7, , 8]);
                    return [4 /*yield*/, fetch(masterUrl, { headers: headers })];
                case 4:
                    mresp = _b.sent();
                    if (!mresp.ok) return [3 /*break*/, 6];
                    _a = parseHlsVariants;
                    return [4 /*yield*/, mresp.text()];
                case 5:
                    variants = _a.apply(void 0, [_b.sent(), masterUrl]);
                    if (variants.length > 0) {
                        best = variants[0];
                        console.log("[Player] variante elegida: ".concat(best.width, "x").concat(best.height, " (").concat(best.bandwidth, " bps)"));
                        return [2 /*return*/, { url: best.url, headers: headers, type: "hls", height: best.height }];
                    }
                    _b.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    e_4 = _b.sent();
                    console.warn("[Player] No se pudo leer el master: ".concat(e_4.message));
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/, { url: masterUrl, headers: headers, type: "hls" }];
            }
        });
    });
}
function detectSource(url) {
    var host = getHost(url);
    if (host === "paulinito.com" || host.endsWith(".paulinito.com"))
        return "Player";
    return null;
}
var ALL_SOURCES = {
    Player: { label: "Paulinito", format: "HLS", extract: extractPlayer }
};
// ─────────────────────────────────────────────
// Entry point — contrato Nuvio
// ─────────────────────────────────────────────
exports.getStreams = function (tmdbId, type, season, episode) {
    return __awaiter(this, void 0, void 0, function () {
        var wantTv, seasonNum, episodeNum, fail, info, allTitles, _a, results, tried, byTitle, inTitle_1, others, notes, page, dir, seenUrl_1, extra, kw, visited_1, kwRanked, embeds, ep, errors_1, results2, final, e_5;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!tmdbId || (type !== "movie" && type !== "tv"))
                        return [2 /*return*/, []];
                    wantTv = type === "tv";
                    seasonNum = season ? Number(season) : 1;
                    episodeNum = episode !== undefined && episode !== null ? Number(episode) : 1;
                    console.log("[".concat(PROVIDER_NAME, "] Buscando: TMDB ").concat(tmdbId, " (").concat(type, ")").concat(wantTv ? " S".concat(seasonNum, "E").concat(episodeNum) : ""));
                    fail = function (reason) {
                        console.warn("[".concat(PROVIDER_NAME, "] ").concat(reason));
                        return DEBUG
                            ? [{ name: PROVIDER_NAME, title: "", url: "https://example.invalid/debug", quality: "\u26A0 ".concat(reason) }]
                            : [];
                    };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 12, , 13]);
                    return [4 /*yield*/, getTMDBInfo(tmdbId, type)];
                case 2:
                    info = _b.sent();
                    if (!info || info.titles.length === 0)
                        return [2 /*return*/, fail("TMDB no devolvi\u00F3 t\u00EDtulo (id ".concat(tmdbId, ")"))];
                    allTitles = info.titles.concat(info.altTitles);
                    return [4 /*yield*/, searchSite(allTitles)];
                case 3:
                    _a = _b.sent(), results = _a.results, tried = _a.tried;
                    byTitle = rankCandidates(results, allTitles, wantTv, seasonNum);
                    inTitle_1 = {};
                    byTitle.forEach(function (c) { inTitle_1[c.url] = true; });
                    others = results.filter(function (c) { return c.isTv === wantTv && !inTitle_1[c.url]; }).slice(0, 4);
                    notes = [];
                    return [4 /*yield*/, pickPage(byTitle.map(function (item) { return ({ item: item, via: "title" }); }).concat(others.map(function (item) { return ({ item: item, via: "search" }); })), info, wantTv, notes)
                        // Respaldo (solo películas): buscar por director; cubre títulos que el sitio escribe distinto.
                    ];
                case 4:
                    page = _b.sent();
                    if (!(!page && !wantTv && info.director)) return [3 /*break*/, 7];
                    return [4 /*yield*/, searchSite([info.director])];
                case 5:
                    dir = _b.sent();
                    tried.push("director \"".concat(info.director, "\": ").concat(dir.results.length, " resultados"));
                    seenUrl_1 = {};
                    byTitle.concat(others).forEach(function (c) { seenUrl_1[c.url] = true; });
                    extra = dir.results.filter(function (c) { return !c.isTv && !seenUrl_1[c.url]; });
                    return [4 /*yield*/, pickPage(extra.map(function (item) { return ({ item: item, via: "director" }); }), info, wantTv, notes)];
                case 6:
                    page = _b.sent();
                    _b.label = 7;
                case 7:
                    if (!!page) return [3 /*break*/, 10];
                    return [4 /*yield*/, searchByKeywords(allTitles)];
                case 8:
                    kw = _b.sent();
                    tried.push.apply(tried, kw.tried);
                    visited_1 = {};
                    byTitle.concat(others).forEach(function (c) { visited_1[c.url] = true; });
                    kwRanked = rankCandidates(kw.results, allTitles, wantTv, seasonNum).filter(function (c) { return !visited_1[c.url]; });
                    return [4 /*yield*/, pickPage(kwRanked.map(function (item) { return ({ item: item, via: "title" }); }), info, wantTv, notes)];
                case 9:
                    page = _b.sent();
                    _b.label = 10;
                case 10:
                    if (!page) {
                        return [2 /*return*/, fail("Sin coincidencias. B\u00FAsquedas: ".concat(tried.join(" | ")).concat(notes.length ? ". Descartados: " + notes.join(" | ") : ""))];
                    }
                    console.log("[".concat(PROVIDER_NAME, "] P\u00E1gina elegida: ").concat(page.title));
                    embeds = void 0;
                    if (wantTv) {
                        ep = findEpisodeIframe(page.html, seasonNum, episodeNum);
                        embeds = ep ? [ep] : [];
                        if (embeds.length === 0)
                            return [2 /*return*/, fail("Sin pesta\u00F1a del cap\u00EDtulo ".concat(seasonNum, "x").concat(episodeNum, " en \"").concat(page.title, "\""))];
                    }
                    else {
                        embeds = collectIframes(page.html);
                        if (embeds.length === 0)
                            return [2 /*return*/, fail("Sin reproductor en \"".concat(page.title, "\""))];
                    }
                    errors_1 = [];
                    return [4 /*yield*/, Promise.all(embeds.map(function (embedUrl) { return __awaiter(_this, void 0, void 0, function () {
                            var key, source, resolved, q, e_6;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        key = detectSource(embedUrl);
                                        if (!key) {
                                            errors_1.push("".concat(getHost(embedUrl), " no soportado"));
                                            return [2 /*return*/, null];
                                        }
                                        source = ALL_SOURCES[key];
                                        _a.label = 1;
                                    case 1:
                                        _a.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, source.extract(embedUrl)];
                                    case 2:
                                        resolved = _a.sent();
                                        q = resolved.height ? "".concat(resolved.height, "p") : "HD";
                                        return [2 /*return*/, __assign({ name: PROVIDER_NAME, title: "", url: resolved.url, quality: "\uD83D\uDCFA ".concat(source.label, " (").concat(source.format, ")\n").concat(q, " | WEB-DL\n\uD83C\uDDF2\uD83C\uDDFD LATINO"), headers: resolved.headers }, (resolved.type ? { type: resolved.type } : {}))];
                                    case 3:
                                        e_6 = _a.sent();
                                        errors_1.push("".concat(source.label, ": ").concat(e_6.message));
                                        return [2 /*return*/, null];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }))];
                case 11:
                    results2 = _b.sent();
                    final = results2.filter(Boolean);
                    if (final.length === 0)
                        return [2 /*return*/, fail("Sin streams. ".concat(errors_1.join(" | ")))];
                    console.log("[".concat(PROVIDER_NAME, "] \u2713 ").concat(final.length, " streams devueltos"));
                    return [2 /*return*/, final];
                case 12:
                    e_5 = _b.sent();
                    return [2 /*return*/, fail("Error: ".concat(e_5.message))];
                case 13: return [2 /*return*/];
            }
        });
    });
};
