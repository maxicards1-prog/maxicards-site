/* Outils IA (maxicards.net/ia) : tout tourne dans le navigateur. Aucun appel à une IA, aucune clé, rien n'est envoyé.
   Chaque outil se monte dans <section class="outil" data-outil="...">. Le texte saisi n'est jamais injecté en HTML
   sans échappement (textContent ou esc()). */
(function () {
  "use strict";
  var BASE = document.documentElement.getAttribute("data-base") || "";
  // Langue de la page : /ia/en/... a <html lang="en"> ; tout le reste est en français.
  var EN = document.documentElement.lang === "en";
  function T(fr, en) { return EN ? en : fr; }

  // ---------------------------------------------------------------- utilitaires
  function el(tag, attrs, enfants) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === "texte") n.textContent = v;
      else if (k === "classe") n.className = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    (enfants || []).forEach(function (c) { if (c) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  var idn = 0;
  function nid(p) { idn += 1; return "ia-" + p + "-" + idn; }
  function champ(libelle, controle, aide) {
    var id = controle.id || (controle.id = nid("c"));
    return el("div", { classe: "champ" }, [el("label", { "for": id, texte: libelle }), controle,
      aide ? el("p", { classe: "aide", texte: aide }) : null]);
  }
  function zone(attrs) { attrs = attrs || {}; attrs.rows = attrs.rows || 5; return el("textarea", attrs); }
  function texte(attrs) { attrs = attrs || {}; attrs.type = "text"; return el("input", attrs); }
  function nombre(attrs) { attrs = attrs || {}; attrs.type = "number"; attrs.inputmode = "decimal"; return el("input", attrs); }
  function choix(options, val) {
    var s = el("select");
    options.forEach(function (o) {
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      var op = el("option", { value: v, texte: t });
      if (v === val) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function caseACocher(libelle, coche) {
    var c = el("input", { type: "checkbox" });
    c.checked = !!coche;
    var l = el("label", { classe: "ligne-case" }, [c, libelle]);
    return { boite: l, input: c };
  }
  function mots(t) { var m = t.trim().match(/[^\s]+/g); return m ? m.length : 0; }
  function nf(x, d) {
    return Number(x).toLocaleString(EN ? "en-US" : "fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d });
  }
  function dollars(x) {
    if (!isFinite(x)) return "–";
    var d = x === 0 ? 2 : x < 0.01 ? 5 : x < 1 ? 4 : 2;
    return EN ? "$" + nf(x, d) : nf(x, d) + " $";
  }
  function message(n, t) { n.textContent = t || ""; }

  function copierTexte(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, ko) {
      var z = el("textarea", { style: "position:fixed;top:-1000px;opacity:0" });
      z.value = t; document.body.appendChild(z); z.select();
      try { document.execCommand("copy") ? ok() : ko(); } catch (e) { ko(e); }
      z.remove();
    });
  }
  function copierHtml(html, brut) {
    if (navigator.clipboard && window.ClipboardItem && window.isSecureContext) {
      return navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([brut], { type: "text/plain" })
      })]);
    }
    return new Promise(function (ok, ko) {
      var d = el("div", { contenteditable: "true", style: "position:fixed;top:-1000px;opacity:0" });
      d.innerHTML = html; // html produit par md2html : tout le texte de l'utilisateur y est échappé
      document.body.appendChild(d);
      var r = document.createRange(); r.selectNodeContents(d);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      try { document.execCommand("copy") ? ok() : ko(); } catch (e) { ko(e); }
      s.removeAllRanges(); d.remove();
    });
  }
  function boutonCopier(libelle, fournir, html) {
    var b = el("button", { type: "button", classe: "principal", texte: libelle });
    b.addEventListener("click", function () {
      var v = fournir();
      if (!v) return;
      var p = html ? copierHtml(v.html, v.brut) : copierTexte(v);
      p.then(function () { copie(b, libelle); }, function () { b.textContent = T("Copie impossible : sélectionnez le texte", "Copy failed: select the text"); });
    });
    return b;
  }
  // État « Copié ✓ » animé (classe CSS), puis retour au libellé d'origine.
  function copie(b, libelle) {
    clearTimeout(b._minuterie);
    b.textContent = T("Copié ✓", "Copied ✓");
    b.classList.remove("copie"); void b.offsetWidth; b.classList.add("copie");
    b._minuterie = setTimeout(function () { b.textContent = libelle; b.classList.remove("copie"); }, 1600);
  }
  // Effet « machine à écrire » court sur une zone de sortie : la valeur est complète tout de suite (copie, lecteurs
  // d'écran, tests) ; seul un calque décoratif la fait apparaître en ~0,7 s. Sauté si l'utilisateur réduit les animations.
  var REDUIT = !window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function frapper(z) {
    if (REDUIT || !z.parentNode || !window.requestAnimationFrame) return;
    var boite = z.parentNode;
    if (!boite.classList.contains("frappe-boite")) {
      boite = el("div", { classe: "frappe-boite" });
      z.parentNode.insertBefore(boite, z); boite.appendChild(z);
    }
    var ancien = boite.querySelector(".frappe"); if (ancien) ancien.remove();
    var t = z.value, n = 0, pas = Math.max(3, Math.ceil(t.length / 42));
    var calque = el("div", { classe: "frappe", "aria-hidden": "true" });
    boite.appendChild(calque); boite.classList.add("en-frappe"); z.scrollTop = 0;
    function fin() { calque.remove(); if (!boite.querySelector(".frappe")) boite.classList.remove("en-frappe"); }
    function tour() {
      if (!calque.parentNode) return;
      if (z.value !== t) return fin();
      n += pas; calque.textContent = t.slice(0, n);
      if (n < t.length) requestAnimationFrame(tour); else fin();
    }
    requestAnimationFrame(tour);
  }
  // Options secondaires repliées, bouton d'action principale en grand, boutons secondaires discrets.
  function replie(titre, enfants) {
    return el("details", { classe: "plus" }, [el("summary", { texte: titre }), el("div", { classe: "plus-corps" }, enfants)]);
  }
  function grand(b) { b.classList.add("grand"); return b; }
  function secondaire(b) { b.classList.remove("principal"); return b; }
  function sortie(lignes) {
    var z = zone({ rows: lignes || 12, readonly: true, classe: "sortie", "aria-live": "polite", "aria-label": T("Texte généré, prêt à copier", "Generated text, ready to copy") });
    return z;
  }
  function compteur(z) {
    var p = el("p", { classe: "aide" });
    function maj() { p.textContent = nf(z.value.length) + T(" caractères · ", " characters · ") + nf(mots(z.value)) + T(" mots", " words"); }
    z.addEventListener("input", maj);
    return { p: p, maj: maj };
  }

  // ---------------------------------------------------------------- 1. Générateur de prompt
  var MODELES = [
    ["", "Partir de zéro", {}],
    ["email", "E-mail professionnel", { role: "assistant de rédaction professionnelle", tache: "Rédige un e-mail pour [objet de l'e-mail].", contexte: "Je m'adresse à [destinataire et lien avec moi]. Points à faire passer : [point 1], [point 2].", public: "un interlocuteur professionnel", ton: "professionnel", format: "email", longueur: "courte" }],
    ["resume", "Résumer un document", { role: "analyste qui sait aller à l'essentiel", tache: "Résume le texte ci-dessous.", contexte: "Je dois [usage : préparer une réunion, réviser, décider…].", public: "", ton: "neutre", format: "puces", longueur: "courte", exemples: "", contraintes: "Garde les chiffres et les noms propres exacts. Signale ce qui est incertain." }],
    ["linkedin", "Post LinkedIn", { role: "rédacteur spécialisé LinkedIn", tache: "Écris un post LinkedIn sur [sujet].", contexte: "Je suis [votre métier]. Je veux partager [expérience, conseil, annonce].", public: "mon réseau professionnel", ton: "amical", format: "texte", longueur: "moyenne", contraintes: "Une première ligne qui donne envie de lire la suite. Pas plus de 3 émojis. Termine par une question." }],
    ["produit", "Fiche produit e-commerce", { role: "rédacteur e-commerce et SEO", tache: "Rédige la fiche produit de [nom du produit].", contexte: "Caractéristiques : [matière, dimensions, usage]. Prix : [prix]. Points forts : [points forts].", public: "des acheteurs en ligne", ton: "persuasif", format: "sections", longueur: "moyenne", contraintes: "N'invente aucune caractéristique. Ajoute un titre de 60 caractères maximum et une méta description de 155 caractères." }],
    ["cours", "Préparer un cours", { role: "enseignant expérimenté", tache: "Prépare une séance de [durée] sur [notion].", contexte: "Niveau : [classe ou niveau]. Les élèves savent déjà [prérequis].", public: "des élèves de [niveau]", ton: "pedagogique", format: "etapes", longueur: "longue", contraintes: "Prévois une activité de découverte, une trace écrite et un exercice d'évaluation rapide." }],
    ["lettre", "Lettre de motivation", { role: "conseiller en recrutement", tache: "Rédige une lettre de motivation pour le poste de [intitulé] chez [entreprise].", contexte: "Mon parcours : [expériences clés]. Ce qui m'attire dans ce poste : [raison].", public: "un recruteur", ton: "professionnel", format: "texte", longueur: "moyenne", contraintes: "Pas de formules toutes faites. Une seule page. Appuie-toi sur des faits de mon parcours, sans en inventer." }],
    ["simple", "Expliquer simplement", { role: "vulgarisateur", tache: "Explique [notion] simplement.", contexte: "Je n'y connais rien et je veux comprendre l'idée générale.", public: "un débutant complet", ton: "pedagogique", format: "texte", longueur: "courte", contraintes: "Utilise une comparaison de la vie de tous les jours. Pas de jargon sans l'expliquer." }],
    ["corriger", "Corriger et reformuler", { role: "correcteur professionnel", tache: "Corrige les fautes du texte ci-dessous puis propose une version plus claire.", contexte: "Le texte est destiné à [usage].", public: "", ton: "neutre", format: "texte", longueur: "libre", contraintes: "Garde mon sens et mon niveau de langue. Liste ensuite les principales corrections." }],
    ["reseaux", "Idées de publications", { role: "community manager", tache: "Propose 10 idées de publications pour [réseau] sur le thème [thème].", contexte: "Mon activité : [activité]. Mon objectif : [objectif].", public: "[votre clientèle]", ton: "amical", format: "tableau", longueur: "moyenne", contraintes: "Pour chaque idée : le format (photo, vidéo, carrousel), l'accroche et le meilleur moment pour la publier." }],
    ["excel", "Formule Excel", { role: "expert Excel et Google Sheets", tache: "Donne-moi la formule pour [calcul voulu].", contexte: "Mes données : colonne A = [contenu], colonne B = [contenu], à partir de la ligne 2.", public: "", ton: "pedagogique", format: "etapes", longueur: "courte", contraintes: "Donne la formule pour Excel en français (noms de fonctions français, séparateur point-virgule) puis explique-la." }],
    ["code", "Déboguer du code", { role: "développeur senior", tache: "Trouve et corrige l'erreur dans le code ci-dessous.", contexte: "Langage : [langage et version]. Message d'erreur : [erreur]. Ce que le code doit faire : [comportement attendu].", public: "", ton: "neutre", format: "code", longueur: "libre", contraintes: "Explique la cause avant de donner la correction. Ne change pas ce qui marche." }],
    ["blog", "Article de blog SEO", { role: "rédacteur web SEO", tache: "Rédige un article sur [sujet], optimisé pour la requête « [mot-clé] ».", contexte: "Mon site : [thème du site].", public: "[lecteurs visés]", ton: "pedagogique", format: "sections", longueur: "longue", contraintes: "Un plan avec des titres H2 et H3, une introduction qui répond tout de suite à la question, aucune statistique inventée." }],
    ["avis", "Répondre à un avis client", { role: "responsable de la relation client", tache: "Rédige une réponse à cet avis client : « [avis] ».", contexte: "Mon commerce : [type de commerce]. Ce qui s'est passé de notre côté : [explication].", public: "le client et les futurs clients qui liront la réponse", ton: "professionnel", format: "texte", longueur: "courte", contraintes: "Remercie, reconnais le problème sans te justifier longuement, propose une solution concrète." }]
  ];
  var TONS = [["neutre", "Neutre"], ["professionnel", "Professionnel"], ["amical", "Amical et chaleureux"], ["pedagogique", "Pédagogique"],
    ["persuasif", "Persuasif"], ["formel", "Formel"], ["humour", "Avec une pointe d'humour"], ["direct", "Direct et concis"]];
  var TON_TXT = { neutre: "neutre et factuel", professionnel: "professionnel", amical: "amical et chaleureux", pedagogique: "pédagogique et bienveillant",
    persuasif: "persuasif, sans exagération", formel: "formel (vouvoiement)", humour: "léger, avec une pointe d'humour", direct: "direct et concis" };
  var FORMATS = [["texte", "Texte suivi"], ["puces", "Liste à puces"], ["etapes", "Étapes numérotées"], ["tableau", "Tableau"],
    ["sections", "Sections avec titres"], ["email", "E-mail (objet + corps)"], ["code", "Code commenté"], ["json", "JSON"]];
  var FORMAT_TXT = { texte: "un texte suivi en paragraphes", puces: "une liste à puces", etapes: "des étapes numérotées", tableau: "un tableau",
    sections: "des sections avec des titres", email: "un e-mail avec une ligne « Objet : » puis le corps du message", code: "du code commenté, dans un bloc de code", json: "du JSON valide, sans texte autour" };
  var LONG = [["libre", "Libre"], ["courte", "Courte (environ 100 mots)"], ["moyenne", "Moyenne (environ 300 mots)"], ["longue", "Longue (environ 800 mots)"]];
  var LONG_TXT = { courte: "environ 100 mots", moyenne: "environ 300 mots", longue: "environ 800 mots" };

  if (EN) {
    MODELES = [
      ["", "Start from scratch", {}],
      ["email", "Professional email", { role: "a professional writing assistant", tache: "Write an email about [subject of the email].", contexte: "I am writing to [recipient and how we know each other]. Key points: [point 1], [point 2].", public: "a professional contact", ton: "professionnel", format: "email", longueur: "courte" }],
      ["resume", "Summarize a document", { role: "an analyst who gets straight to the point", tache: "Summarize the text below.", contexte: "I need to [use: prepare a meeting, study, make a decision…].", public: "", ton: "neutre", format: "puces", longueur: "courte", exemples: "", contraintes: "Keep numbers and names exactly as written. Flag anything uncertain." }],
      ["linkedin", "LinkedIn post", { role: "a LinkedIn content writer", tache: "Write a LinkedIn post about [topic].", contexte: "I am a [your job]. I want to share [experience, tip, announcement].", public: "my professional network", ton: "amical", format: "texte", longueur: "moyenne", contraintes: "An opening line that makes people want to read on. No more than 3 emojis. End with a question." }],
      ["produit", "E-commerce product description", { role: "an e-commerce and SEO copywriter", tache: "Write the product description for [product name].", contexte: "Features: [material, size, use]. Price: [price]. Key benefits: [benefits].", public: "online shoppers", ton: "persuasif", format: "sections", longueur: "moyenne", contraintes: "Do not make up any feature. Add a title of 60 characters max and a meta description of 155 characters." }],
      ["cours", "Plan a lesson", { role: "an experienced teacher", tache: "Plan a [length] lesson on [topic].", contexte: "Level: [grade or level]. Students already know [prerequisites].", public: "[grade] students", ton: "pedagogique", format: "etapes", longueur: "longue", contraintes: "Include a warm-up activity, written notes and a quick check for understanding." }],
      ["lettre", "Cover letter", { role: "a recruitment advisor", tache: "Write a cover letter for the [job title] position at [company].", contexte: "My background: [key experience]. Why this job appeals to me: [reason].", public: "a recruiter", ton: "professionnel", format: "texte", longueur: "moyenne", contraintes: "No stock phrases. One page. Draw on facts from my background without making any up." }],
      ["simple", "Explain it simply", { role: "a science communicator", tache: "Explain [concept] simply.", contexte: "I know nothing about it and want to understand the big picture.", public: "a complete beginner", ton: "pedagogique", format: "texte", longueur: "courte", contraintes: "Use an everyday comparison. No jargon without explaining it." }],
      ["corriger", "Proofread and rewrite", { role: "a professional proofreader", tache: "Fix the mistakes in the text below, then suggest a clearer version.", contexte: "The text is meant for [use].", public: "", ton: "neutre", format: "texte", longueur: "libre", contraintes: "Keep my meaning and my level of language. Then list the main corrections." }],
      ["reseaux", "Social media post ideas", { role: "a social media manager", tache: "Suggest 10 post ideas for [platform] on the theme [theme].", contexte: "My business: [business]. My goal: [goal].", public: "[your customers]", ton: "amical", format: "tableau", longueur: "moyenne", contraintes: "For each idea: the format (photo, video, carousel), the hook and the best time to post it." }],
      ["excel", "Excel formula", { role: "an Excel and Google Sheets expert", tache: "Give me the formula to [calculation you need].", contexte: "My data: column A = [content], column B = [content], starting at row 2.", public: "", ton: "pedagogique", format: "etapes", longueur: "courte", contraintes: "Give the formula for English-language Excel (English function names, comma as the separator), then explain it." }],
      ["code", "Debug code", { role: "a senior developer", tache: "Find and fix the bug in the code below.", contexte: "Language: [language and version]. Error message: [error]. What the code should do: [expected behavior].", public: "", ton: "neutre", format: "code", longueur: "libre", contraintes: "Explain the cause before giving the fix. Don't change what works." }],
      ["blog", "SEO blog post", { role: "an SEO content writer", tache: "Write an article about [topic], optimized for the search query \"[keyword]\".", contexte: "My website: [site topic].", public: "[target readers]", ton: "pedagogique", format: "sections", longueur: "longue", contraintes: "An outline with H2 and H3 headings, an introduction that answers the question right away, no made-up statistics." }],
      ["avis", "Reply to a customer review", { role: "a customer service manager", tache: "Write a reply to this customer review: \"[review]\".", contexte: "My business: [type of business]. What happened on our side: [explanation].", public: "the customer and future customers who will read the reply", ton: "professionnel", format: "texte", longueur: "courte", contraintes: "Thank them, acknowledge the problem without long justifications, offer a concrete solution." }]
    ];
    TONS = [["neutre", "Neutral"], ["professionnel", "Professional"], ["amical", "Friendly and warm"], ["pedagogique", "Educational"],
      ["persuasif", "Persuasive"], ["formel", "Formal"], ["humour", "With a touch of humor"], ["direct", "Direct and concise"]];
    TON_TXT = { neutre: "neutral and factual", professionnel: "professional", amical: "friendly and warm", pedagogique: "educational and supportive",
      persuasif: "persuasive, without exaggeration", formel: "formal", humour: "light, with a touch of humor", direct: "direct and concise" };
    FORMATS = [["texte", "Plain paragraphs"], ["puces", "Bullet list"], ["etapes", "Numbered steps"], ["tableau", "Table"],
      ["sections", "Sections with headings"], ["email", "Email (subject + body)"], ["code", "Commented code"], ["json", "JSON"]];
    FORMAT_TXT = { texte: "plain text in paragraphs", puces: "a bulleted list", etapes: "numbered steps", tableau: "a table",
      sections: "sections with headings", email: "an email with a \"Subject:\" line followed by the body", code: "commented code, in a code block", json: "valid JSON, with no text around it" };
    LONG = [["libre", "Any"], ["courte", "Short (about 100 words)"], ["moyenne", "Medium (about 300 words)"], ["longue", "Long (about 800 words)"]];
    LONG_TXT = { courte: "about 100 words", moyenne: "about 300 words", longue: "about 800 words" };
  }

  function outilPrompt(racine) {
    var modele = choix(MODELES.map(function (m) { return [m[0], m[1]]; }), "");
    var role = texte({ placeholder: T("ex. expert-comptable, professeur de français, community manager", "e.g. an accountant, an English teacher, a social media manager") });
    var tache = zone({ rows: 3, placeholder: T("ex. Rédige un e-mail pour relancer un client qui n'a pas payé sa facture.", "e.g. Write an email to follow up with a client who hasn't paid their invoice.") });
    var contexte = zone({ rows: 3, placeholder: T("Qui vous êtes, la situation, ce qui a déjà été fait, les informations utiles.", "Who you are, the situation, what has already been done, any useful details.") });
    var pub = texte({ placeholder: T("ex. des clients particuliers, des élèves de 4e, un directeur financier", "e.g. retail customers, 8th-grade students, a CFO") });
    var ton = choix(TONS, "neutre"), format = choix(FORMATS, "texte"), longueur = choix(LONG, "libre");
    var exemples = zone({ rows: 2, placeholder: T("Facultatif : un exemple de ce que vous attendez (un texte que vous aimez, une réponse modèle).", "Optional: an example of what you expect (a text you like, a model answer).") });
    var contraintes = zone({ rows: 2, placeholder: T("Facultatif : ce qu'il faut faire ou éviter (pas de jargon, 3 idées maximum, citer les sources…).", "Optional: what to do or avoid (no jargon, 3 ideas max, cite sources…).") });
    var style = choix([["simple", T("Texte simple (toutes les IA)", "Plain text (all AIs)")], ["titres", T("Avec des titres ### (ChatGPT, Gemini)", "With ### headings (ChatGPT, Gemini)")], ["xml", T("Avec des balises <role> (Claude)", "With <role> tags (Claude)")]], "simple");
    var cQuestions = caseACocher(T("Demander à l'IA de me poser d'abord ses questions", "Have the AI ask me its questions first"), true);
    var cIncertain = caseACocher(T("Demander de signaler ce qui est incertain plutôt que d'inventer", "Ask it to flag anything uncertain instead of making things up"), true);
    var cVersions = caseACocher(T("Demander 2 versions différentes", "Ask for 2 different versions"), false);
    var out = sortie(14), cpt = compteur(out);

    function remplir() {
      var m = MODELES.filter(function (x) { return x[0] === modele.value; })[0][2];
      role.value = m.role || ""; tache.value = m.tache || ""; contexte.value = m.contexte || ""; pub.value = m.public || "";
      ton.value = m.ton || "neutre"; format.value = m.format || "texte"; longueur.value = m.longueur || "libre";
      exemples.value = m.exemples || ""; contraintes.value = m.contraintes || "";
      maj(); frapper(out);
    }
    function maj() {
      var b = [];
      var r = role.value.trim(), t = tache.value.trim(), c = contexte.value.trim(), p = pub.value.trim(),
        ex = exemples.value.trim(), co = contraintes.value.trim();
      var consignes = [];
      consignes.push(T("Ton : ", "Tone: ") + TON_TXT[ton.value] + ".");
      consignes.push(T("Format de la réponse : ", "Response format: ") + FORMAT_TXT[format.value] + ".");
      if (LONG_TXT[longueur.value]) consignes.push(T("Longueur : ", "Length: ") + LONG_TXT[longueur.value] + ".");
      consignes.push(T("Réponds en français.", "Respond in English."));
      if (cVersions.input.checked) consignes.push(T("Propose 2 versions différentes et indique laquelle tu recommandes.", "Give 2 different versions and say which one you recommend."));
      if (cIncertain.input.checked) consignes.push(T("Si une information te manque ou si tu n'es pas sûr, dis-le au lieu d'inventer.", "If you're missing information or aren't sure, say so instead of making things up."));
      if (co) consignes.push(co);
      var q = cQuestions.input.checked ? T("Avant de répondre, pose-moi les questions dont tu as besoin pour faire un travail précis. Attends mes réponses.", "Before you answer, ask me the questions you need to do a precise job. Wait for my answers.") : "";
      var s = style.value, vide = T("[Décrivez la tâche]", "[Describe the task]"), tues = T("Tu es ", "You are ");
      if (s === "xml") {
        var bal = EN ? ["task", "context", "audience", "example", "instructions"] : ["tache", "contexte", "public", "exemple", "consignes"];
        if (r) b.push("<role>" + tues + r + ".</role>");
        b.push("<" + bal[0] + ">" + (t || vide) + "</" + bal[0] + ">");
        if (c) b.push("<" + bal[1] + ">" + c + "</" + bal[1] + ">");
        if (p) b.push("<" + bal[2] + ">" + p + "</" + bal[2] + ">");
        if (ex) b.push("<" + bal[3] + ">" + ex + "</" + bal[3] + ">");
        b.push("<" + bal[4] + ">\n- " + consignes.join("\n- ") + "\n</" + bal[4] + ">");
        if (q) b.push(q);
      } else if (s === "titres") {
        if (r) b.push(T("### Rôle\n", "### Role\n") + tues + r + ".");
        b.push(T("### Tâche\n", "### Task\n") + (t || vide));
        if (c) b.push(T("### Contexte\n", "### Context\n") + c);
        if (p) b.push(T("### Public visé\n", "### Audience\n") + p);
        if (ex) b.push(T("### Exemple de ce que j'attends\n", "### Example of what I expect\n") + ex);
        b.push(T("### Consignes\n- ", "### Instructions\n- ") + consignes.join("\n- "));
        if (q) b.push(q);
      } else {
        b.push((r ? tues + r + ". " : "") + (t || vide));
        if (c) b.push(T("Contexte : ", "Context: ") + c);
        if (p) b.push(T("Public visé : ", "Audience: ") + p + ".");
        if (ex) b.push(T("Voici un exemple de ce que j'attends :\n", "Here is an example of what I expect:\n") + "\"\"\"\n" + ex + "\n\"\"\"");
        b.push(consignes.join("\n"));
        if (q) b.push(q);
      }
      out.value = b.join("\n\n");
      cpt.maj();
    }
    modele.addEventListener("change", remplir);
    [role, tache, contexte, pub, ton, format, longueur, exemples, contraintes, style, cQuestions.input, cIncertain.input, cVersions.input]
      .forEach(function (x) { x.addEventListener("input", maj); x.addEventListener("change", maj); });
    racine.appendChild(el("div", { classe: "pile premier" }, [
      champ(T("Tâche (ce que l'IA doit faire)", "Task (what the AI should do)"), tache),
      champ(T("Modèle de départ", "Starting template"), modele, T("Remplit le formulaire avec un exemple à adapter.", "Fills in the form with an example you can adapt."))]));
    racine.appendChild(replie(T("Plus d'options : rôle, contexte, ton, format…", "More options: role, context, tone, format…"), [
      el("div", { classe: "pile" }, [champ(T("Rôle donné à l'IA", "Role given to the AI"), role), champ(T("Contexte", "Context"), contexte), champ(T("Public visé", "Audience"), pub)]),
      el("div", { classe: "grille" }, [champ(T("Ton", "Tone"), ton), champ("Format", format), champ(T("Longueur", "Length"), longueur)]),
      el("div", { classe: "pile" }, [champ(T("Style du prompt", "Prompt style"), style), champ(T("Exemple", "Example"), exemples), champ(T("Contraintes", "Constraints"), contraintes),
        cQuestions.boite, cIncertain.boite, cVersions.boite])]));
    racine.appendChild(el("h2", { classe: "titre-outil", texte: T("Votre prompt", "Your prompt") }));
    racine.appendChild(out); racine.appendChild(cpt.p);
    racine.appendChild(el("div", { classe: "boutons" }, [grand(boutonCopier(T("Copier le prompt", "Copy prompt"), function () { return out.value; }))]));
    maj();
  }

  // ---------------------------------------------------------------- 2. Améliorer un prompt (analyse par règles)
  var REGLES = [
    { id: "role", nom: "Un rôle pour l'IA", re: /\b(tu es|vous êtes|agis comme|agissez comme|en tant qu|joue le rôle|jouez le rôle|mets-toi dans la peau|you are|act as)\b/i,
      conseil: "Dites à l'IA qui elle est : « Tu es un [expert du domaine] ». Elle choisit alors le bon vocabulaire et le bon niveau.",
      ajout: "Tu es [un expert du domaine concerné]." },
    { id: "contexte", nom: "Du contexte", re: /\b(contexte|je suis|nous sommes|mon entreprise|ma société|mon projet|mon site|mon client|ma classe|situation|j'ai besoin|je travaille|je prépare|je dois|pour mon|pour ma|pour notre)\b/i,
      conseil: "Expliquez la situation : qui vous êtes, pourquoi vous en avez besoin, ce qui existe déjà. C'est souvent ce qui manque le plus.",
      ajout: "Contexte : [qui je suis, la situation, pourquoi j'en ai besoin]." },
    { id: "public", nom: "Le public visé", re: /\b(public|lecteurs?|destiné|destinée|cible|audience|clients?|élèves|étudiants|débutants?|enfants?|experts?|recruteur|patron|collègues?|abonnés)\b/i,
      conseil: "Précisez à qui s'adresse la réponse (débutant, client, directeur…) : le niveau d'explication change tout.",
      ajout: "Public visé : [à qui s'adresse le résultat]." },
    { id: "format", nom: "Un format de réponse", re: /\b(format|liste|tableau|puces|étapes|plan|json|markdown|paragraphes?|sections?|titres?|colonnes?|bullet|numérot)/i,
      conseil: "Dites sous quelle forme vous voulez la réponse : liste, tableau, étapes, e-mail, plan…",
      ajout: "Format : [liste à puces, tableau, étapes numérotées…]." },
    { id: "longueur", nom: "Une longueur", re: /(\d+\s*(mots|lignes|phrases|caractères|paragraphes|points|idées|exemples|questions|pages|minutes)|\b(court|courte|bref|brève|concis|détaillé|détaillée|une page|en une phrase|résumé)\b)/i,
      conseil: "Donnez une longueur (« 150 mots », « 5 idées », « une page ») pour éviter une réponse trop longue ou trop courte.",
      ajout: "Longueur : [environ N mots / N idées]." },
    { id: "ton", nom: "Un ton", re: /\b(ton|style|registre|formel|informel|amical|professionnel|chaleureux|vouvoie|vouvoiement|tutoie|tutoiement|humour|sérieux|simple|vulgaris)/i,
      conseil: "Précisez le ton : professionnel, amical, pédagogique, direct…",
      ajout: "Ton : [professionnel, amical, pédagogique…]." },
    { id: "exemple", nom: "Un exemple", re: /(\bexemples?\b|\bpar ex|comme ceci|comme celui|voici un modèle|"""|```|« [^»]{20,}»)/i,
      conseil: "Montrez un exemple de ce que vous attendez : c'est le moyen le plus sûr d'obtenir le bon style.",
      ajout: "Exemple de ce que j'attends : \"\"\"[collez un exemple]\"\"\"" },
    { id: "contraintes", nom: "Des contraintes", re: /\b(ne pas|n'utilise|n'invente|évite|sans |interdit|uniquement|seulement|maximum|minimum|au moins|au plus|obligatoire|doit|doivent|jamais|toujours)/i,
      conseil: "Ajoutez ce qu'il faut faire ou éviter : « n'invente pas de chiffres », « pas de jargon », « 3 idées maximum »…",
      ajout: "Contraintes : [ce qu'il faut faire ou éviter]." },
    { id: "verif", nom: "Une demande de vérification", re: /\b(source|sources|vérifi|incertain|pas sûr|si tu ne sais pas|n'invente|questions? avant|pose-moi|posez-moi|demande-moi)/i,
      conseil: "Demandez à l'IA de signaler ce qui est incertain, ou de vous poser des questions avant de répondre : vous évitez les réponses inventées.",
      ajout: "Si une information te manque, pose-moi d'abord tes questions. Signale ce qui est incertain au lieu d'inventer." }
  ];
  var VERBES = /^(\s*(s'il te plaît|stp|svp|peux-tu|pourrais-tu|pouvez-vous|merci de|j'aimerais que tu|je voudrais que tu|aide-moi à|aidez-moi à)?\s*)?(rédige|rédigez|écris|écrivez|résume|résumez|explique|expliquez|traduis|traduisez|crée|créez|propose|proposez|analyse|analysez|corrige|corrigez|liste|listez|compare|comparez|génère|générez|fais|faites|donne|donnez|aide|aidez|trouve|trouvez|calcule|calculez|reformule|reformulez|prépare|préparez|imagine|imaginez|conçois|concevez|classe|classez|transforme|transformez|vérifie|vérifiez|optimise|optimisez|améliore|améliorez|organise|organisez|planifie|planifiez|identifie|identifiez|évalue|évaluez)\b/im;
  var VAGUES = /\b(quelque chose|truc|trucs|machin|des choses|un peu|etc\.?|bien|super|génial|le mieux possible|n'importe)\b/gi;

  if (EN) {
    REGLES = [
      { id: "role", nom: "A role for the AI", re: /\b(you are|you're|act as|acting as|play the role|pretend you are|pretend to be|take on the role|as an? (expert|specialist|professional|consultant|coach|teacher|tutor|writer|editor|copywriter|developer|marketer|analyst|recruiter))\b/i,
        conseil: "Tell the AI who it is: \"You are a [subject-matter expert]\". It will then pick the right vocabulary and level.",
        ajout: "You are [an expert in the relevant field]." },
      { id: "contexte", nom: "Some context", re: /\b(context|background|i am|i'm|we are|we're|my company|my business|my project|my website|my site|my client|my class|my team|situation|i need|i work|i'm preparing|i have to|for my|for our)\b/i,
        conseil: "Explain the situation: who you are, why you need it, what already exists. This is often what's missing most.",
        ajout: "Context: [who I am, the situation, why I need this]." },
      { id: "public", nom: "The target audience", re: /\b(audience|readers?|aimed at|intended for|target|customers?|clients?|students?|pupils|beginners?|kids|children|experts?|recruiters?|boss|managers?|colleagues?|followers|subscribers)\b/i,
        conseil: "Say who the answer is for (beginner, customer, executive…): the level of explanation changes everything.",
        ajout: "Audience: [who the result is for]." },
      { id: "format", nom: "A response format", re: /\b(format|list|table|bullets?|steps|outline|json|markdown|paragraphs?|sections?|headings?|headers?|columns?|numbered)/i,
        conseil: "Say what form you want the answer in: list, table, steps, email, outline…",
        ajout: "Format: [bullet list, table, numbered steps…]." },
      { id: "longueur", nom: "A length", re: /(\d+\s*(words?|lines?|sentences?|characters?|paragraphs?|points?|ideas?|examples?|questions?|pages?|minutes?|bullets?)|\b(short|brief|concise|detailed|in-depth|one page|one sentence|in a sentence|summary)\b)/i,
        conseil: "Give a length (\"150 words\", \"5 ideas\", \"one page\") to avoid an answer that's too long or too short.",
        ajout: "Length: [about N words / N ideas]." },
      { id: "ton", nom: "A tone", re: /\b(tone|style|voice|formal|informal|casual|friendly|professional|warm|humor|humour|funny|serious|simple|plain english|conversational)/i,
        conseil: "Specify the tone: professional, friendly, educational, direct…",
        ajout: "Tone: [professional, friendly, educational…]." },
      { id: "exemple", nom: "An example", re: /(\bexamples?\b|\be\.g\.|\bfor instance\b|like this|like the one|here is a (sample|template)|"""|```|"[^"\n]{20,}")/i,
        conseil: "Show an example of what you expect: it's the surest way to get the right style.",
        ajout: "Example of what I expect: \"\"\"[paste an example]\"\"\"" },
      { id: "contraintes", nom: "Some constraints", re: /\b(do not|don't|never|avoid|without|no more than|at least|at most|only|must|maximum|minimum|always|make sure|limit)\b/i,
        conseil: "Add what to do or avoid: \"don't make up numbers\", \"no jargon\", \"3 ideas max\"…",
        ajout: "Constraints: [what to do or avoid]." },
      { id: "verif", nom: "A request to double-check", re: /\b(sources?|verify|fact-check|uncertain|not sure|unsure|if you don't know|make up|made up|ask me|questions? (first|before)|before you answer)/i,
        conseil: "Ask the AI to flag anything uncertain, or to ask you questions before answering: you avoid made-up answers.",
        ajout: "If you're missing information, ask me your questions first. Flag anything uncertain instead of making things up." }
    ];
    VERBES = /^(\s*(please|can you|could you|would you|i'd like you to|i would like you to|i want you to|help me)?\s*)?(write|draft|summarize|summarise|explain|translate|create|suggest|propose|analyze|analyse|fix|correct|list|compare|generate|make|give|help|find|calculate|rewrite|rephrase|prepare|imagine|design|classify|sort|turn|convert|check|review|optimize|improve|organize|plan|identify|evaluate|outline|brainstorm|edit|proofread|describe|build)\b/im;
    VAGUES = /\b(something|stuff|things|kind of|sort of|a bit|etc\.?|good|nice|great|awesome|the best possible|whatever)\b/gi;
  }

  function analyser(t) {
    var res = [], n = mots(t);
    res.push({ ok: VERBES.test(t), nom: T("Une tâche claire (verbe d'action)", "A clear task (action verb)"),
      conseil: T("Commencez par un verbe précis : « Rédige », « Résume », « Compare », « Propose 5… ». « Parle-moi de » ou « Je veux » donnent des réponses vagues.",
        "Start with a precise verb: \"Write\", \"Summarize\", \"Compare\", \"Suggest 5…\". \"Tell me about\" or \"I want\" lead to vague answers.") });
    REGLES.forEach(function (r) { res.push({ ok: r.re.test(t), nom: r.nom, conseil: r.conseil, ajout: r.ajout, id: r.id }); });
    var vagues = (t.match(VAGUES) || []).map(function (x) { return x.toLowerCase(); });
    vagues = vagues.filter(function (x, i) { return vagues.indexOf(x) === i; });
    res.push({ ok: vagues.length === 0, nom: T("Pas de mots vagues", "No vague words"),
      conseil: vagues.length ? T("Remplacez les mots vagues (", "Replace vague words (") + vagues.join(", ") + T(") par des précisions : quoi exactement, combien, pour qui.", ") with specifics: what exactly, how many, for whom.") : "" });
    res.push({ ok: n >= 25, nom: T("Assez de détails (au moins 25 mots)", "Enough detail (at least 25 words)"),
      conseil: T("Votre prompt fait ", "Your prompt is ") + n + T(" mot", " word") + (n > 1 ? "s" : "") + T(". Un bon prompt fait souvent 40 à 150 mots : chaque précision évite une supposition de l'IA.", " long. A good prompt is often 40 to 150 words: every detail saves the AI a guess.") });
    var long = n > 150, delim = (EN ? /("""|```|<[a-z_]+>|---|\[start\])/i : /("""|```|<[a-z_]+>|---|\[début\]|«)/i).test(t);
    if (long) res.push({ ok: delim, nom: T("Texte collé bien délimité", "Pasted text clearly marked off"),
      conseil: T("Quand vous collez un long texte, entourez-le de \"\"\" ou de balises <texte>…</texte> pour que l'IA distingue vos consignes du texte à traiter.",
        "When you paste a long text, wrap it in \"\"\" or in <text>…</text> tags so the AI can tell your instructions from the text to work on.") });
    return res;
  }
  function versionEnrichie(t, res) {
    var manque = res.filter(function (r) { return !r.ok && r.ajout; });
    var lignes = [];
    var role = manque.filter(function (r) { return r.id === "role"; })[0];
    if (role) lignes.push(role.ajout);
    lignes.push(t.trim());
    var reste = manque.filter(function (r) { return r.id !== "role"; });
    if (reste.length) lignes.push(reste.map(function (r) { return r.ajout; }).join("\n"));
    return lignes.join("\n\n");
  }
  function outilAmeliorer(racine) {
    var entree = zone({ rows: 7, placeholder: T("Collez votre prompt ici. Exemple : écris un post sur mon nouveau produit", "Paste your prompt here. Example: write a post about my new product") });
    var cpt = compteur(entree);
    var score = el("div", { classe: "resultats" });
    var liste = el("ul", { classe: "verdicts" });
    var out = sortie(10);
    var note = el("p", { classe: "aide", texte: T("Les passages entre [crochets] sont à remplir avec vos informations avant d'envoyer le prompt.", "Fill in the parts in [brackets] with your own details before you send the prompt.") });
    function maj() {
      cpt.maj();
      liste.textContent = ""; score.textContent = "";
      var t = entree.value;
      if (!t.trim()) { out.value = ""; return; }
      var res = analyser(t), ok = res.filter(function (r) { return r.ok; }).length;
      var pc = Math.round(ok / res.length * 100);
      var appr = EN ? (pc >= 85 ? "Very complete" : pc >= 60 ? "Decent, needs more detail" : pc >= 35 ? "Too vague" : "Very vague")
        : (pc >= 85 ? "Très complet" : pc >= 60 ? "Correct, à préciser" : pc >= 35 ? "Trop vague" : "Très vague");
      score.appendChild(el("div", { classe: "tuile forte" }, [el("span", { classe: "valeur", texte: pc + " / 100" }), el("span", { classe: "libelle", texte: appr })]));
      score.appendChild(el("div", { classe: "tuile" }, [el("span", { classe: "valeur", texte: ok + T(" sur ", " of ") + res.length }), el("span", { classe: "libelle", texte: T("points présents", "checks passed") })]));
      res.forEach(function (r) {
        liste.appendChild(el("li", { classe: r.ok ? "v-ok" : "v-ko" }, [el("strong", { texte: (r.ok ? "✓ " : "✗ ") + r.nom }),
          !r.ok && r.conseil ? el("span", { texte: " : " + r.conseil }) : null]));
      });
      out.value = versionEnrichie(t, res);
    }
    entree.addEventListener("input", maj);
    racine.appendChild(champ(T("Votre prompt", "Your prompt"), entree)); racine.appendChild(cpt.p);
    racine.appendChild(el("button", { type: "button", classe: "lien-bouton", texte: T("Essayer un exemple", "Try an example"), onclick: function () { entree.value = T("écris un post sur mon nouveau produit, un truc qui donne envie", "write a post about my new product, something that makes people want it"); maj(); frapper(out); } }));
    racine.appendChild(score);
    racine.appendChild(el("h2", { classe: "titre-outil", texte: T("Version enrichie", "Improved version") }));
    racine.appendChild(out); racine.appendChild(note);
    racine.appendChild(el("div", { classe: "boutons" }, [grand(boutonCopier(T("Copier la version enrichie", "Copy improved version"), function () { return out.value; }))]));
    racine.appendChild(replie(T("Le détail des 12 points", "The 12 checks in detail"), [liste]));
  }

  // ---------------------------------------------------------------- 3. Compteur de tokens + 4. prix API
  function prix() {
    var n = document.getElementById("donnees-prix");
    try { return n ? JSON.parse(n.textContent) : null; } catch (e) { return null; }
  }
  var tokenizer = null;
  function chargerTokenizer() {
    if (!tokenizer) tokenizer = import(BASE + "/assets/lib/gpt-tokenizer-4.1.2/encoding/o200k_base.js");
    return tokenizer;
  }
  function tableauPrix(P, calc, entetes) {
    var corps = el("tbody");
    var t = el("table", {}, [el("thead", {}, [el("tr", {}, entetes.map(function (h, i) { return el("th", { classe: i ? "nombre" : null, texte: h }); }))]), corps]);
    function maj() {
      corps.textContent = "";
      var lignes = P.modeles.map(function (m) { return { m: m, v: calc(m) }; });
      lignes.sort(function (a, b) { return a.v[a.v.length - 1] - b.v[b.v.length - 1]; });
      lignes.forEach(function (l, i) {
        corps.appendChild(el("tr", { classe: i === 0 ? "meilleur" : null }, [el("td", {}, [el("strong", { texte: l.m.nom }), el("br"), el("small", { texte: l.m.editeur })])]
          .concat(l.v.map(function (x) { return el("td", { classe: "nombre", texte: dollars(x) }); }))));
      });
    }
    return { table: el("div", { classe: "tableau-defile" }, [t]), maj: maj };
  }
  function outilTokens(racine) {
    var P = prix();
    var entree = zone({ rows: 9, placeholder: T("Collez ou tapez votre texte : le nombre de tokens s'affiche tout de suite.", "Paste or type your text: the token count shows up instantly.") });
    var tuiles = el("div", { classe: "resultats" });
    var etat = el("p", { classe: "message" });
    var voir = caseACocher(T("Afficher le découpage en tokens (couleurs)", "Show how the text splits into tokens (colors)"), false);
    var vue = el("div", { classe: "tokens-vue", hidden: true });
    var sortieRep = nombre({ value: "500", min: "0", step: "100" });
    var tp = P ? tableauPrix(P, function (m) {
      var e = n * m.entree / 1e6, s = (Number(sortieRep.value) || 0) * m.sortie / 1e6;
      return [e, s, e + s];
    }, EN ? ["Model", "Your text as input", "Response", "Total"] : ["Modèle", "Votre texte en entrée", "Réponse", "Total"]) : null;
    var n = 0, enc = null, minuterie = null;
    function tuile(v, l, forte) { return el("div", { classe: "tuile" + (forte ? " forte" : "") }, [el("span", { classe: "valeur", texte: v }), el("span", { classe: "libelle", texte: l })]); }
    function compter() {
      var t = entree.value;
      tuiles.textContent = "";
      if (!enc) { tuiles.appendChild(tuile("…", T("chargement du découpeur", "loading the tokenizer"))); return; }
      var ids = enc.encode(t);
      n = ids.length;
      tuiles.appendChild(tuile(nf(n), "tokens (GPT-4o, GPT-5, o200k)", true));
      tuiles.appendChild(tuile(nf(t.length), T("caractères", "characters")));
      tuiles.appendChild(tuile(nf(mots(t)), T("mots", "words")));
      tuiles.appendChild(tuile(n ? nf(t.length / n, 1) : "–", T("caractères par token", "characters per token")));
      if (tp) tp.maj();
      vue.textContent = "";
      if (voir.input.checked && n) {
        var max = Math.min(ids.length, 3000);
        for (var i = 0; i < max; i++) vue.appendChild(el("span", { classe: "tk tk" + (i % 5), texte: enc.decode([ids[i]]) }));
        if (ids.length > max) vue.appendChild(el("p", { classe: "aide", texte: T("Affichage limité aux 3 000 premiers tokens.", "Display limited to the first 3,000 tokens.") }));
      }
      vue.hidden = !voir.input.checked;
    }
    function planifier() { clearTimeout(minuterie); minuterie = setTimeout(compter, entree.value.length > 50000 ? 400 : 60); }
    entree.addEventListener("input", planifier);
    voir.input.addEventListener("change", compter);
    sortieRep.addEventListener("input", function () { if (tp) tp.maj(); });
    racine.appendChild(champ(T("Votre texte", "Your text"), entree));
    racine.appendChild(tuiles); racine.appendChild(etat); racine.appendChild(voir.boite); racine.appendChild(vue);
    if (tp) {
      racine.appendChild(replie(T("Combien coûte ce texte avec l'API ?", "How much does this text cost with the API?"), [
        el("div", { classe: "grille" }, [champ(T("Longueur de la réponse (tokens)", "Response length (tokens)"), sortieRep, T("Une page de texte fait souvent 500 à 800 tokens.", "A page of text is often 500 to 800 tokens."))]),
        tp.table,
        el("p", { classe: "aide", texte: EN ? "Official prices in US dollars, excluding tax, checked on " + P.date + ". For Claude and Gemini, the token count comes from the GPT tokenizer: it's an estimate (their tokenizers aren't published for local counting)."
          : "Prix officiels en dollars, hors taxes, relevés le " + P.date + ". Pour Claude et Gemini, le nombre de tokens est celui du découpeur GPT : c'est une estimation (leurs découpeurs ne sont pas publiés pour un calcul local)." })]));
    }
    compter();
    chargerTokenizer().then(function (m) { enc = m; compter(); }, function () {
      message(etat, T("Le découpeur de tokens n'a pas pu se charger. Rechargez la page.", "The tokenizer could not load. Please reload the page."));
    });
  }
  function outilPrixApi(racine) {
    var P = prix();
    if (!P) return;
    var te = nombre({ value: "1000", min: "0", step: "100" }), ts = nombre({ value: "500", min: "0", step: "100" });
    var rq = nombre({ value: "100", min: "0", step: "10" }), jr = nombre({ value: "30", min: "1", max: "31", step: "1" });
    var cache = nombre({ value: "0", min: "0", max: "100", step: "10" });
    function v(x) { return Math.max(0, Number(x.value) || 0); }
    var tp = tableauPrix(P, function (m) {
      var part = Math.min(100, v(cache)) / 100;
      var pe = m.cache !== null && m.cache !== undefined ? m.entree * (1 - part) + m.cache * part : m.entree;
      var r = v(te) * pe / 1e6 + v(ts) * m.sortie / 1e6;
      return [r, r * v(rq), r * v(rq) * v(jr)];
    }, EN ? ["Model", "Per request", "Per day", "Per month"] : ["Modèle", "Par requête", "Par jour", "Par mois"]);
    [te, ts, rq, jr, cache].forEach(function (x) { x.addEventListener("input", tp.maj); });
    racine.appendChild(el("div", { classe: "grille" }, [
      champ(T("Tokens en entrée par requête", "Input tokens per request"), te, T("Votre prompt + le contexte envoyé.", "Your prompt + the context you send.")),
      champ(T("Tokens en sortie par requête", "Output tokens per request"), ts, T("La réponse générée.", "The generated response.")),
      champ(T("Requêtes par jour", "Requests per day"), rq)]));
    racine.appendChild(replie(T("Plus d'options : jours par mois, cache", "More options: days per month, cache"), [el("div", { classe: "grille" }, [champ(T("Jours par mois", "Days per month"), jr),
      champ(T("Part de l'entrée lue en cache (%)", "Share of input read from cache (%)"), cache, T("0 si vous ne savez pas. Le cache réduit le prix des parties répétées.", "0 if you don't know. Caching lowers the price of repeated parts."))])]));
    racine.appendChild(tp.table);
    racine.appendChild(el("p", { classe: "aide", texte: EN ? "Sorted from cheapest to most expensive. Official prices in US dollars, excluding tax, checked on " + P.date + " (sources below the pricing table)."
      : "Tri du moins cher au plus cher. Prix officiels en dollars, hors taxes, relevés le " + P.date + " (sources sous le tableau des tarifs)." }));
    tp.maj();
  }

  // ---------------------------------------------------------------- 5. Nettoyer un texte ChatGPT (markdown, invisibles)
  var INVISIBLES = /[​-‏⁠-⁤﻿­‪-‮⁦-⁩᠎؜]/g;
  var ESPACES = /[      　 - ]/g;
  function sansMd(t, puces) {
    var l = t.replace(/\r\n?/g, "\n").split("\n"), o = [], dansCode = false;
    l.forEach(function (x) {
      if (/^\s*(```|~~~)/.test(x)) { dansCode = !dansCode; return; }
      if (dansCode) { o.push(x); return; }
      if (/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(x)) return; // ligne de séparation de tableau
      if (/^\s*([-*_]\s*){3,}$/.test(x)) { o.push(""); return; }
      x = x.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/\s+#+\s*$/, "");
      x = x.replace(/^(\s*)>\s?/, "$1");
      x = x.replace(/^(\s*)[-*+]\s+\[[ xX]\]\s+/, "$1" + (puces ? "• " : ""));
      x = x.replace(/^(\s*)[-*+]\s+/, "$1" + (puces ? "• " : ""));
      if (/^\s*\|.*\|\s*$/.test(x)) x = x.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return c.trim(); }).join("\t");
      x = x.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, "$1 ($2)");
      x = x.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "$2").replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, "$1$2")
        .replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?!\w)/g, "$1$2").replace(/~~(?=\S)([\s\S]*?\S)~~/g, "$1")
        .replace(/`([^`]+)`/g, "$1");
      o.push(x);
    });
    return o.join("\n").replace(/\n{3,}/g, "\n\n");
  }
  function inline(t) {
    // t est déjà échappé ; on ajoute seulement des balises sûres
    return t.replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s"]+)\)/g, '<a href="$2">$1</a>')
      .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>")
      .replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, "$1<em>$2</em>")
      .replace(/(^|[^\w_])_(?=\S)([^_\n]*?\S)_(?!\w)/g, "$1<em>$2</em>")
      .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");
  }
  function md2html(t) {
    var l = t.replace(/\r\n?/g, "\n").split("\n"), o = [], i = 0, para = [];
    function fermerPara() { if (para.length) { o.push("<p>" + inline(esc(para.join(" "))) + "</p>"); para = []; } }
    while (i < l.length) {
      var x = l[i], m;
      if (/^\s*(```|~~~)/.test(x)) {
        fermerPara(); var code = []; i++;
        while (i < l.length && !/^\s*(```|~~~)/.test(l[i])) { code.push(l[i]); i++; }
        o.push("<pre><code>" + esc(code.join("\n")) + "</code></pre>"); i++; continue;
      }
      if (!x.trim()) { fermerPara(); i++; continue; }
      if ((m = x.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/))) { fermerPara(); var h = m[1].length; o.push("<h" + h + ">" + inline(esc(m[2])) + "</h" + h + ">"); i++; continue; }
      if (/^\s*([-*_]\s*){3,}$/.test(x)) { fermerPara(); o.push("<hr>"); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(x) && i + 1 < l.length && /^\s*\|?\s*:?-{3,}/.test(l[i + 1])) {
        fermerPara();
        var cel = function (s) { return s.trim().replace(/^\||\|$/g, "").split("|").map(function (c) { return inline(esc(c.trim())); }); };
        var tete = cel(x); i += 2; var rows = [];
        while (i < l.length && /^\s*\|.*\|\s*$/.test(l[i])) { rows.push(cel(l[i])); i++; }
        o.push("<table><thead><tr>" + tete.map(function (c) { return "<th>" + c + "</th>"; }).join("") + "</tr></thead><tbody>" +
          rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>");
        continue;
      }
      if (/^\s*>/.test(x)) {
        fermerPara(); var q = [];
        while (i < l.length && /^\s*>/.test(l[i])) { q.push(l[i].replace(/^\s*>\s?/, "")); i++; }
        o.push("<blockquote>" + md2html(q.join("\n")) + "</blockquote>"); continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(x)) {
        fermerPara();
        var ordonnee = /^\s*\d+[.)]\s+/.test(x), items = [];
        while (i < l.length && (/^\s*([-*+]|\d+[.)])\s+/.test(l[i]) || (/^\s{2,}\S/.test(l[i]) && items.length))) {
          if (/^\s*([-*+]|\d+[.)])\s+/.test(l[i]) && !/^\s{2,}/.test(l[i])) items.push([l[i].replace(/^\s*([-*+]|\d+[.)])\s+/, "")]);
          else items[items.length - 1].push(l[i].replace(/^\s{2,}/, ""));
          i++;
        }
        var tag = ordonnee ? "ol" : "ul";
        o.push("<" + tag + ">" + items.map(function (it) {
          var tete = it[0], sous = it.slice(1);
          return "<li>" + inline(esc(tete.replace(/^\[[ xX]\]\s+/, ""))) + (sous.length ? md2html(sous.join("\n")) : "") + "</li>";
        }).join("") + "</" + tag + ">");
        continue;
      }
      para.push(x.trim()); i++;
    }
    fermerPara();
    return o.join("\n");
  }
  function outilNettoyer(racine) {
    var entree = zone({ rows: 10, placeholder: T("Collez ici la réponse copiée depuis ChatGPT, Claude, Gemini ou Copilot.", "Paste the answer you copied from ChatGPT, Claude, Gemini or Copilot.") });
    var mode = choix([["texte", T("Texte propre (sans ** ni #)", "Clean text (no ** or #)")], ["html", T("Code HTML", "HTML code")], ["md", T("Garder le markdown, nettoyer seulement", "Keep the markdown, just clean it")]], racine.getAttribute("data-mode") || "texte");
    var tiret = choix([["garder", T("Garder les tirets longs —", "Keep em dashes —")], ["court", T("Remplacer — par un tiret court –", "Replace — with a spaced hyphen -")], ["virgule", T("Remplacer — par une virgule", "Replace — with a comma")]], "court");
    var cInv = caseACocher(T("Retirer les caractères invisibles", "Remove invisible characters"), true);
    var cEsp = caseACocher(T("Remplacer les espaces spéciales par des espaces normales", "Replace special spaces with regular spaces"), false);
    var cPuces = caseACocher(T("Garder les puces (•)", "Keep bullets (•)"), true);
    var cGuil = caseACocher(T("Guillemets “anglais” → « français »", "Curly quotes “ ” ‘ ’ → straight quotes \" '"), false);
    var cEmoji = caseACocher(T("Retirer les émojis", "Remove emojis"), false);
    var out = sortie(10), bilan = el("p", { classe: "message" }), apercu = el("div", { classe: "apercu", hidden: true });
    var dernier = { brut: "", html: "" };
    function maj() {
      var t = entree.value, notes = [];
      var nInv = (t.match(INVISIBLES) || []).length, nEsp = (t.match(ESPACES) || []).length, nTir = (t.match(/—/g) || []).length;
      if (cInv.input.checked && nInv) { t = t.replace(INVISIBLES, ""); notes.push(nInv + T(" caractère(s) invisible(s) retiré(s)", " invisible character(s) removed")); }
      else if (nInv) notes.push(nInv + T(" caractère(s) invisible(s) trouvé(s)", " invisible character(s) found"));
      if (cEsp.input.checked && nEsp) { t = t.replace(ESPACES, " "); notes.push(nEsp + T(" espace(s) spéciale(s) remplacée(s)", " special space(s) replaced")); }
      else if (nEsp) notes.push(nEsp + T(" espace(s) insécable(s) gardée(s)", " non-breaking space(s) kept"));
      if (nTir && tiret.value !== "garder") {
        t = tiret.value === "court" ? t.replace(/\s*—\s*/g, T(" – ", " - ")) : t.replace(/\s*—\s*/g, ", ");
        notes.push(nTir + T(" tiret(s) long(s) remplacé(s)", " em dash(es) replaced"));
      }
      if (cGuil.input.checked) t = EN ? t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'") : t.replace(/[“"]([^”"\n]+)[”"]/g, "« $1 »");
      if (cEmoji.input.checked) {
        var avant = t.length;
        try { t = t.replace(/(\p{Extended_Pictographic}|️|‍)/gu, ""); } catch (e) { /* navigateur ancien */ }
        if (t.length !== avant) notes.push(T("émojis retirés", "emojis removed"));
      }
      var nMd = (t.match(/\*\*|^#{1,6}\s|^\s*[-*+]\s|`/gm) || []).length;
      if (mode.value === "texte") {
        t = sansMd(t, cPuces.input.checked); if (nMd) notes.push(nMd + T(" marque(s) markdown converties", " markdown mark(s) converted"));
        dernier = { brut: t, html: md2html(entree.value.replace(INVISIBLES, "")) };
        out.value = t;
      } else if (mode.value === "html") {
        var h = md2html(t); out.value = h; dernier = { brut: sansMd(t, true), html: h };
      } else { out.value = t; dernier = { brut: t, html: md2html(t) }; }
      apercu.innerHTML = dernier.html; // md2html échappe tout le texte saisi ; seuls des liens http(s) sont créés
      apercu.querySelectorAll("a").forEach(function (a) { a.setAttribute("rel", "nofollow noopener"); a.setAttribute("target", "_blank"); });
      apercu.hidden = !entree.value.trim();
      message(bilan, entree.value.trim() ? (notes.length ? notes.join(" · ") + "." : T("Rien à corriger dans ce texte.", "Nothing to fix in this text.")) : "");
    }
    [entree, mode, tiret, cInv.input, cEsp.input, cPuces.input, cGuil.input, cEmoji.input].forEach(function (x) {
      x.addEventListener("input", maj); x.addEventListener("change", maj);
    });
    racine.appendChild(champ(T("Texte à nettoyer", "Text to clean"), entree));
    racine.appendChild(el("div", { classe: "grille" }, [champ(T("Résultat voulu", "Output"), mode)]));
    racine.appendChild(bilan);
    racine.appendChild(el("h2", { classe: "titre-outil", texte: T("Résultat", "Result") }));
    racine.appendChild(out);
    racine.appendChild(el("div", { classe: "boutons" }, [
      grand(boutonCopier(T("Copier le résultat", "Copy result"), function () { return out.value; })),
      secondaire(boutonCopier(T("Copier avec la mise en forme (Word, Google Docs, e-mail)", "Copy with formatting (Word, Google Docs, email)"), function () { return dernier.html ? dernier : null; }, true))]));
    racine.appendChild(replie(T("Plus d'options : tirets, espaces, guillemets, émojis", "More options: dashes, spaces, quotes, emojis"), [
      el("div", { classe: "grille" }, [champ(T("Tirets longs", "Em dashes"), tiret)]),
      el("div", { classe: "cases" }, [cInv.boite, cEsp.boite, cPuces.boite, cGuil.boite, cEmoji.boite])]));
    racine.appendChild(replie(T("Aperçu mis en forme", "Formatted preview"), [apercu]));
    maj();
  }

  // ---------------------------------------------------------------- 6. Générateur de prompt d'image
  var STYLES = [["photo", "Photo réaliste", "photorealistic photo", "une photo réaliste"], ["cine", "Image de cinéma", "cinematic film still", "une image de film, rendu cinéma"],
    ["illu", "Illustration", "digital illustration", "une illustration numérique"], ["aquarelle", "Aquarelle", "watercolor painting", "une peinture à l'aquarelle"],
    ["huile", "Peinture à l'huile", "oil painting", "une peinture à l'huile"], ["3d", "Rendu 3D", "3D render", "un rendu 3D"],
    ["anime", "Style anime", "anime style illustration", "une illustration de style anime"], ["pixel", "Pixel art", "pixel art", "un pixel art"],
    ["ligne", "Dessin au trait", "line art drawing, black ink", "un dessin au trait à l'encre noire"], ["affiche", "Affiche vintage", "vintage poster", "une affiche vintage"],
    ["flat", "Illustration plate (flat design)", "flat design vector illustration", "une illustration vectorielle plate (flat design)"],
    ["iso", "Vue isométrique", "isometric illustration", "une illustration isométrique"], ["croquis", "Croquis au crayon", "pencil sketch", "un croquis au crayon"]];
  var LUMIERES = [["", "Libre", "", ""], ["doree", "Heure dorée", "golden hour light", "lumière chaude de fin de journée (heure dorée)"],
    ["douce", "Lumière douce", "soft diffused light", "lumière douce et diffuse"], ["studio", "Éclairage studio", "studio lighting", "éclairage de studio"],
    ["neon", "Néons", "neon lights", "éclairage aux néons"], ["nuit", "Nuit", "night, moonlight", "de nuit, au clair de lune"],
    ["contre", "Contre-jour", "backlit, rim light", "en contre-jour"], ["dramatique", "Dramatique", "dramatic chiaroscuro lighting", "lumière dramatique très contrastée"],
    ["naturelle", "Lumière naturelle", "natural daylight", "lumière naturelle du jour"]];
  var PLANS = [["", "Libre", "", ""], ["gros", "Gros plan", "close-up shot", "en gros plan"], ["portrait", "Portrait (buste)", "medium close-up portrait", "en portrait cadré à la poitrine"],
    ["pied", "En pied", "full body shot", "en pied (le corps entier)"], ["large", "Plan large", "wide shot", "en plan large"],
    ["aerien", "Vue aérienne", "aerial view, drone shot", "vu du ciel (vue aérienne)"], ["plongee", "Plongée", "high angle shot", "vu d'en haut (plongée)"],
    ["contreplongee", "Contre-plongée", "low angle shot", "vu d'en bas (contre-plongée)"], ["macro", "Macro", "macro shot, extreme detail", "en macro, avec beaucoup de détails"]];
  var FORMATS_IMG = [["1:1", "Carré 1:1 (Instagram)"], ["4:5", "Portrait 4:5 (Instagram)"], ["9:16", "Vertical 9:16 (stories, TikTok)"],
    ["16:9", "Paysage 16:9 (YouTube, écran)"], ["3:2", "Photo 3:2"], ["2:3", "Affiche 2:3"]];
  var FORMAT_FR = { "1:1": "carré", "4:5": "vertical au format 4:5", "9:16": "vertical au format 9:16", "16:9": "horizontal au format 16:9", "3:2": "horizontal au format 3:2", "2:3": "vertical au format 2:3" };
  if (EN) {
    STYLES = [["photo", "Realistic photo", "photorealistic photo", "a realistic photo"], ["cine", "Cinematic still", "cinematic film still", "a cinematic film still"],
      ["illu", "Illustration", "digital illustration", "a digital illustration"], ["aquarelle", "Watercolor", "watercolor painting", "a watercolor painting"],
      ["huile", "Oil painting", "oil painting", "an oil painting"], ["3d", "3D render", "3D render", "a 3D render"],
      ["anime", "Anime style", "anime style illustration", "an anime-style illustration"], ["pixel", "Pixel art", "pixel art", "a pixel art image"],
      ["ligne", "Line drawing", "line art drawing, black ink", "a line drawing in black ink"], ["affiche", "Vintage poster", "vintage poster", "a vintage poster"],
      ["flat", "Flat illustration (flat design)", "flat design vector illustration", "a flat vector illustration"],
      ["iso", "Isometric view", "isometric illustration", "an isometric illustration"], ["croquis", "Pencil sketch", "pencil sketch", "a pencil sketch"]];
    LUMIERES = [["", "Any", "", ""], ["doree", "Golden hour", "golden hour light", "warm late-afternoon light (golden hour)"],
      ["douce", "Soft light", "soft diffused light", "soft, diffused light"], ["studio", "Studio lighting", "studio lighting", "studio lighting"],
      ["neon", "Neon", "neon lights", "neon lighting"], ["nuit", "Night", "night, moonlight", "at night, in moonlight"],
      ["contre", "Backlit", "backlit, rim light", "backlit, with a rim of light"], ["dramatique", "Dramatic", "dramatic chiaroscuro lighting", "dramatic, high-contrast light"],
      ["naturelle", "Natural light", "natural daylight", "natural daylight"]];
    PLANS = [["", "Any", "", ""], ["gros", "Close-up", "close-up shot", "close-up"], ["portrait", "Portrait (chest up)", "medium close-up portrait", "portrait, framed from the chest up"],
      ["pied", "Full body", "full body shot", "full body"], ["large", "Wide shot", "wide shot", "wide shot"],
      ["aerien", "Aerial view", "aerial view, drone shot", "seen from above (aerial view)"], ["plongee", "High angle", "high angle shot", "from a high angle"],
      ["contreplongee", "Low angle", "low angle shot", "from a low angle"], ["macro", "Macro", "macro shot, extreme detail", "macro, with lots of detail"]];
    FORMATS_IMG = [["1:1", "Square 1:1 (Instagram)"], ["4:5", "Portrait 4:5 (Instagram)"], ["9:16", "Vertical 9:16 (Stories, TikTok)"],
      ["16:9", "Landscape 16:9 (YouTube, screens)"], ["3:2", "Photo 3:2"], ["2:3", "Poster 2:3"]];
    FORMAT_FR = { "1:1": "square (1:1)", "4:5": "vertical (4:5)", "9:16": "vertical (9:16)", "16:9": "horizontal (16:9)", "3:2": "horizontal (3:2)", "2:3": "vertical (2:3)" };
  }
  function trouve(liste, v) { return liste.filter(function (x) { return x[0] === v; })[0]; }
  function outilImage(racine) {
    var outilCible = choix([["mj", "Midjourney"], ["gemini", "Nano Banana (Gemini)"], ["gpt", T("ChatGPT (génération d'images)", "ChatGPT (image generation)")], ["sd", "Stable Diffusion / Flux"]], "mj");
    var sujet = zone({ rows: 3, placeholder: T("ex. un chat roux endormi sur une pile de livres dans une librairie ancienne", "e.g. a ginger cat asleep on a pile of books in an old bookshop") });
    var style = choix(STYLES.map(function (s) { return [s[0], s[1]]; }), "photo");
    var lumiere = choix(LUMIERES.map(function (s) { return [s[0], s[1]]; }), "");
    var plan = choix(PLANS.map(function (s) { return [s[0], s[1]]; }), "");
    var fmt = choix(FORMATS_IMG, "16:9");
    var ambiance = texte({ placeholder: T("ex. couleurs pastel, ambiance calme, automne", "e.g. pastel colors, calm mood, fall") });
    var ecrit = texte({ placeholder: T("Facultatif : texte exact à écrire dans l'image", "Optional: exact text to write in the image") });
    var eviter = texte({ placeholder: T("ex. texte, filigrane, personnes floues", "e.g. text, watermark, blurry people") });
    var out = sortie(7), aideOutil = el("p", { classe: "aide" });
    function maj() {
      var s = trouve(STYLES, style.value), lu = trouve(LUMIERES, lumiere.value), pl = trouve(PLANS, plan.value);
      var suj = sujet.value.trim() || T("[votre sujet]", "[your subject]"), amb = ambiance.value.trim(), tx = ecrit.value.trim(), ev = eviter.value.trim();
      var o = outilCible.value, r;
      if (o === "mj" || o === "sd") {
        var p = [suj, s[2]];
        if (pl[2]) p.push(pl[2]);
        if (lu[2]) p.push(lu[2]);
        if (amb) p.push(amb);
        if (tx) p.push('text "' + tx.replace(/"/g, "'") + '"');
        p.push(o === "sd" ? "highly detailed, sharp focus" : "highly detailed");
        if (o === "mj") {
          r = p.join(", ") + " --ar " + fmt.value + (ev ? " --no " + ev : "");
          aideOutil.textContent = T("Midjourney comprend mieux l'anglais : les réglages sont traduits, écrivez si possible votre sujet en anglais. --ar fixe le format, --no retire ce que vous ne voulez pas.",
            "Midjourney works best with short, comma-separated descriptions. --ar sets the aspect ratio, --no removes what you don't want.");
        } else {
          r = T("Prompt : ", "Prompt: ") + p.join(", ") + T("\n\nPrompt négatif : ", "\n\nNegative prompt: ") + (ev ? ev + ", " : "") + "blurry, low quality, deformed, watermark" + T("\n\nFormat : ", "\n\nAspect ratio: ") + fmt.value;
          aideOutil.textContent = T("Stable Diffusion et Flux comprennent mieux l'anglais. Le format se règle dans les dimensions de l'image ; le prompt négatif va dans son propre champ (Flux n'en a pas toujours).",
            "Stable Diffusion and Flux work best with keywords. Set the aspect ratio in the image size settings; the negative prompt goes in its own field (Flux doesn't always have one).");
        }
      } else if (EN) {
        var phe = "Create " + s[3] + ": " + suj + ".";
        if (pl[3]) phe += " Framing: " + pl[3] + ".";
        if (lu[3]) phe += " Lighting: " + lu[3] + ".";
        if (amb) phe += " Mood: " + amb + ".";
        if (tx) phe += " Write exactly this text in the image, with no typos: \"" + tx + "\".";
        phe += " Aspect ratio: " + FORMAT_FR[fmt.value] + ".";
        if (ev) phe += " Avoid: " + ev + ".";
        r = phe;
        aideOutil.textContent = o === "gemini" ? "Nano Banana (Gemini's image model) understands full sentences well; describe the scene as you would to a photographer. To make changes, follow up with a short instruction (\"same image, but at night\")."
          : "ChatGPT understands full sentences well. To fix an image, ask for one change at a time.";
      } else {
        var phr = "Crée " + s[3] + " : " + suj + ".";
        if (pl[3]) phr += " Cadrage " + pl[3] + ".";
        if (lu[3]) phr += " Éclairage : " + lu[3] + ".";
        if (amb) phr += " Ambiance : " + amb + ".";
        if (tx) phr += " Écris exactement ce texte dans l'image, sans faute : « " + tx + " ».";
        phr += " Format " + FORMAT_FR[fmt.value] + ".";
        if (ev) phr += " À éviter : " + ev + ".";
        r = phr;
        aideOutil.textContent = o === "gemini" ? "Nano Banana (le modèle d'image de Gemini) comprend bien les phrases en français ; décrivez la scène comme à un photographe. Pour retoucher, envoyez ensuite une consigne courte (« même image, mais de nuit »)."
          : "ChatGPT comprend bien les phrases en français. Pour corriger une image, demandez une seule modification à la fois.";
      }
      out.value = r;
    }
    [outilCible, sujet, style, lumiere, plan, fmt, ambiance, ecrit, eviter].forEach(function (x) { x.addEventListener("input", maj); x.addEventListener("change", maj); });
    racine.appendChild(champ(T("Sujet de l'image", "Image subject"), sujet));
    racine.appendChild(el("div", { classe: "grille" }, [champ(T("Outil d'image", "Image tool"), outilCible), champ("Style", style), champ(T("Format", "Aspect ratio"), fmt)]));
    racine.appendChild(replie(T("Plus d'options : lumière, cadrage, ambiance…", "More options: lighting, framing, mood…"), [
      el("div", { classe: "grille" }, [champ(T("Lumière", "Lighting"), lumiere), champ(T("Cadrage", "Framing"), plan)]),
      el("div", { classe: "grille" }, [champ(T("Ambiance, couleurs", "Mood, colors"), ambiance), champ(T("Texte dans l'image", "Text in the image"), ecrit), champ(T("À éviter", "Avoid"), eviter)])]));
    racine.appendChild(el("h2", { classe: "titre-outil", texte: T("Votre prompt d'image", "Your image prompt") }));
    racine.appendChild(out); racine.appendChild(aideOutil);
    racine.appendChild(el("div", { classe: "boutons" }, [grand(boutonCopier(T("Copier le prompt", "Copy prompt"), function () { return out.value; }))]));
    maj();
  }

  // ---------------------------------------------------------------- 7. Instructions personnalisées
  function outilInstructions(racine) {
    var metier = texte({ placeholder: T("ex. infirmière, gérant d'une boulangerie, étudiant en droit", "e.g. a nurse, a bakery owner, a law student") });
    var usage = zone({ rows: 2, placeholder: T("ex. écrire des e-mails, préparer mes cours, comprendre des documents administratifs", "e.g. writing emails, planning my lessons, understanding paperwork") });
    var niveau = choix([["debutant", T("Débutant : expliquer simplement", "Beginner: explain things simply")], ["moyen", T("Intermédiaire", "Intermediate")], ["expert", T("Expert : aller droit au technique", "Expert: get straight to the technical details")]], "moyen");
    var ton = choix(TONS, "direct");
    var longueur = choix([["courte", T("Courtes et directes", "Short and direct")], ["adaptee", T("Adaptées à la question", "Matched to the question")], ["detaillee", T("Détaillées", "Detailed")]], "adaptee");
    // Le français choisit tu / vous ; l'anglais n'en a pas besoin, il demande le pays (références locales).
    var adresse = EN ? texte({ value: "the United States", placeholder: "e.g. the United States, the UK, Canada" }) : choix([["vous", "Me vouvoyer"], ["tu", "Me tutoyer"]], "vous");
    var eviter = zone({ rows: 2, placeholder: T("ex. les listes trop longues, les émojis, les formules de politesse inutiles", "e.g. long lists, emojis, unnecessary pleasantries") });
    var cSources = caseACocher(T("Signaler quand il n'est pas sûr", "Say when it isn't sure"), true);
    var cQuestions = caseACocher(T("Me poser une question si ma demande est floue", "Ask me a question if my request is unclear"), true);
    var cResume = caseACocher(T("Commencer par la réponse courte, puis détailler", "Start with the short answer, then go into detail"), true);
    var o1 = sortie(5), o2 = sortie(8), c1 = compteur(o1), c2 = compteur(o2);
    function maj() {
      var a = [], b;
      if (EN) {
        if (metier.value.trim()) a.push("I am " + metier.value.trim() + ".");
        if (usage.value.trim()) a.push("I mainly use AI for: " + usage.value.trim() + ".");
        a.push({ debutant: "I'm a beginner on most technical topics: explain things without jargon.", moyen: "I'm at an intermediate level: no need to start from the very beginning.", expert: "I know my field well: go straight to the technical details." }[niveau.value]);
        if (adresse.value.trim()) a.push("I live in " + adresse.value.trim() + ": use local references (laws, units, currency, date format).");
        b = ["Respond in English, in a " + TON_TXT[ton.value] + " tone.",
          { courte: "Keep your answers short and direct.", adaptee: "Match the length to the question: short for a simple question, detailed for a complex topic.", detaillee: "Give detailed answers, with examples." }[longueur.value]];
        if (cResume.input.checked) b.push("Start with the answer in one or two sentences, then go into detail if it helps.");
        if (cQuestions.input.checked) b.push("If my request is unclear, ask me a question before answering.");
        if (cSources.input.checked) b.push("If you're not sure about something, say so clearly instead of making it up.");
        if (eviter.value.trim()) b.push("Avoid: " + eviter.value.trim() + ".");
        o1.value = a.join("\n"); o2.value = b.join("\n");
        c1.maj(); c2.maj();
        return;
      }
      if (metier.value.trim()) a.push("Je suis " + metier.value.trim() + ".");
      if (usage.value.trim()) a.push("J'utilise l'IA surtout pour : " + usage.value.trim() + ".");
      a.push({ debutant: "Je débute sur la plupart des sujets techniques : explique sans jargon.", moyen: "J'ai un niveau intermédiaire : pas besoin de tout reprendre depuis le début.", expert: "Je connais bien mon domaine : va droit aux détails techniques." }[niveau.value]);
      a.push("Je vis en France : utilise les références françaises (lois, unités, euros, dates au format jour/mois/année).");
      o1.value = a.join("\n");
      b = ["Réponds en français, avec un ton " + TON_TXT[ton.value] + ".",
        adresse.value === "vous" ? "Vouvoie-moi." : "Tutoie-moi.",
        { courte: "Fais des réponses courtes et directes.", adaptee: "Adapte la longueur à la question : court pour une question simple, détaillé pour un sujet complexe.", detaillee: "Donne des réponses détaillées, avec des exemples." }[longueur.value]];
      if (cResume.input.checked) b.push("Commence par la réponse en une ou deux phrases, puis détaille si c'est utile.");
      if (cQuestions.input.checked) b.push("Si ma demande est floue, pose-moi une question avant de répondre.");
      if (cSources.input.checked) b.push("Si tu n'es pas sûr d'une information, dis-le clairement au lieu d'inventer.");
      if (eviter.value.trim()) b.push("À éviter : " + eviter.value.trim() + ".");
      o2.value = b.join("\n");
      c1.maj(); c2.maj();
    }
    [metier, usage, niveau, ton, longueur, adresse, eviter, cSources.input, cQuestions.input, cResume.input].forEach(function (x) { x.addEventListener("input", maj); x.addEventListener("change", maj); });
    racine.appendChild(el("div", { classe: "pile premier" }, [champ(T("Votre métier ou situation", "Your job or situation"), metier), champ(T("Ce que vous faites avec l'IA", "What you use AI for"), usage)]));
    racine.appendChild(replie(T("Plus d'options : niveau, ton, longueur…", "More options: level, tone, length…"), [
      el("div", { classe: "grille" }, [champ(T("Votre niveau", "Your level"), niveau), champ(T("Ton des réponses", "Response tone"), ton), champ(T("Longueur", "Length"), longueur), champ(T("Tutoiement", "Country you live in"), adresse)]),
      champ(T("À éviter", "Avoid"), eviter),
      el("div", { classe: "cases" }, [cResume.boite, cQuestions.boite, cSources.boite])]));
    racine.appendChild(el("h2", { classe: "titre-outil", texte: T("1. Ce que l'IA doit savoir sur vous", "1. What the AI should know about you") }));
    racine.appendChild(o1); racine.appendChild(c1.p);
    racine.appendChild(el("div", { classe: "boutons" }, [secondaire(boutonCopier(T("Copier le bloc 1", "Copy block 1"), function () { return o1.value; }))]));
    racine.appendChild(el("h2", { classe: "titre-outil", texte: T("2. Comment l'IA doit vous répondre", "2. How the AI should respond") }));
    racine.appendChild(o2); racine.appendChild(c2.p);
    racine.appendChild(el("div", { classe: "boutons" }, [secondaire(boutonCopier(T("Copier le bloc 2", "Copy block 2"), function () { return o2.value; }))]));
    racine.appendChild(el("div", { classe: "boutons" }, [grand(boutonCopier(T("Copier les deux blocs ensemble", "Copy both blocks together"), function () { return o1.value + "\n\n" + o2.value; }))]));
    maj();
  }

  // ---------------------------------------------------------------- boutons « Copier » des pages de prompts
  function boutonsCopierPrompts() {
    document.querySelectorAll("[data-copier]").forEach(function (b) {
      var cible = document.getElementById(b.getAttribute("data-copier"));
      if (!cible) return;
      b.hidden = false;
      var libelle = b.textContent;
      b.addEventListener("click", function () {
        copierTexte(cible.textContent).then(function () { copie(b, libelle); });
      });
    });
  }

  var OUTILS = { prompt: outilPrompt, ameliorer: outilAmeliorer, tokens: outilTokens, "prix-api": outilPrixApi,
    nettoyer: outilNettoyer, image: outilImage, instructions: outilInstructions };
  function demarrer() {
    document.querySelectorAll("section.outil[data-outil]").forEach(function (s) {
      var f = OUTILS[s.getAttribute("data-outil")];
      if (!f) return;
      var ns = s.querySelector("noscript"); if (ns) ns.remove();
      try { f(s); } catch (e) { s.appendChild(el("p", { classe: "message", texte: T("L'outil n'a pas pu démarrer dans ce navigateur. Essayez avec un navigateur à jour.", "The tool couldn't start in this browser. Please try an up-to-date browser.") })); }
    });
    boutonsCopierPrompts();
    document.documentElement.classList.add("outils-prets");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
