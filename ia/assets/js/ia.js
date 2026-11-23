/* Outils IA (maxicards.net/ia) : tout tourne dans le navigateur. Aucun appel à une IA, aucune clé, rien n'est envoyé.
   Chaque outil se monte dans <section class="outil" data-outil="...">. Le texte saisi n'est jamais injecté en HTML
   sans échappement (textContent ou esc()). */
(function () {
  "use strict";
  var BASE = document.documentElement.getAttribute("data-base") || "";

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
    return Number(x).toLocaleString("fr-FR", { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d });
  }
  function dollars(x) {
    if (!isFinite(x)) return "–";
    var d = x === 0 ? 2 : x < 0.01 ? 5 : x < 1 ? 4 : 2;
    return nf(x, d) + " $";
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
      p.then(function () {
        b.textContent = "Copié ✓";
        setTimeout(function () { b.textContent = libelle; }, 1600);
      }, function () { b.textContent = "Copie impossible : sélectionnez le texte"; });
    });
    return b;
  }
  function sortie(lignes) {
    var z = zone({ rows: lignes || 12, readonly: true, classe: "sortie", "aria-live": "polite" });
    return z;
  }
  function compteur(z) {
    var p = el("p", { classe: "aide" });
    function maj() { p.textContent = nf(z.value.length) + " caractères · " + nf(mots(z.value)) + " mots"; }
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
    ["cours", "Préparer un cours", { role: "enseignant expérimenté", tache: "Prépare une séance de [durée] sur [notion].", contexte: "Niveau : [classe ou niveau]. Les élèves savent déjà [prérequis].", public: "des élèves de [niveau]", ton: "pédagogique", format: "etapes", longueur: "longue", contraintes: "Prévois une activité de découverte, une trace écrite et un exercice d'évaluation rapide." }],
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

  function outilPrompt(racine) {
    var modele = choix(MODELES.map(function (m) { return [m[0], m[1]]; }), "");
    var role = texte({ placeholder: "ex. expert-comptable, professeur de français, community manager" });
    var tache = zone({ rows: 3, placeholder: "ex. Rédige un e-mail pour relancer un client qui n'a pas payé sa facture." });
    var contexte = zone({ rows: 3, placeholder: "Qui vous êtes, la situation, ce qui a déjà été fait, les informations utiles." });
    var pub = texte({ placeholder: "ex. des clients particuliers, des élèves de 4e, un directeur financier" });
    var ton = choix(TONS, "neutre"), format = choix(FORMATS, "texte"), longueur = choix(LONG, "libre");
    var exemples = zone({ rows: 2, placeholder: "Facultatif : un exemple de ce que vous attendez (un texte que vous aimez, une réponse modèle)." });
    var contraintes = zone({ rows: 2, placeholder: "Facultatif : ce qu'il faut faire ou éviter (pas de jargon, 3 idées maximum, citer les sources…)." });
    var style = choix([["simple", "Texte simple (toutes les IA)"], ["titres", "Avec des titres ### (ChatGPT, Gemini)"], ["xml", "Avec des balises <role> (Claude)"]], "simple");
    var cQuestions = caseACocher("Demander à l'IA de me poser d'abord ses questions", true);
    var cIncertain = caseACocher("Demander de signaler ce qui est incertain plutôt que d'inventer", true);
    var cVersions = caseACocher("Demander 2 versions différentes", false);
    var out = sortie(14), cpt = compteur(out);

    function remplir() {
      var m = MODELES.filter(function (x) { return x[0] === modele.value; })[0][2];
      role.value = m.role || ""; tache.value = m.tache || ""; contexte.value = m.contexte || ""; pub.value = m.public || "";
      ton.value = m.ton || "neutre"; format.value = m.format || "texte"; longueur.value = m.longueur || "libre";
      exemples.value = m.exemples || ""; contraintes.value = m.contraintes || "";
      maj();
    }
    function maj() {
      var b = [];
      var r = role.value.trim(), t = tache.value.trim(), c = contexte.value.trim(), p = pub.value.trim(),
        ex = exemples.value.trim(), co = contraintes.value.trim();
      var consignes = [];
      consignes.push("Ton : " + TON_TXT[ton.value] + ".");
      consignes.push("Format de la réponse : " + FORMAT_TXT[format.value] + ".");
      if (LONG_TXT[longueur.value]) consignes.push("Longueur : " + LONG_TXT[longueur.value] + ".");
      consignes.push("Réponds en français.");
      if (cVersions.input.checked) consignes.push("Propose 2 versions différentes et indique laquelle tu recommandes.");
      if (cIncertain.input.checked) consignes.push("Si une information te manque ou si tu n'es pas sûr, dis-le au lieu d'inventer.");
      if (co) consignes.push(co);
      var q = cQuestions.input.checked ? "Avant de répondre, pose-moi les questions dont tu as besoin pour faire un travail précis. Attends mes réponses." : "";
      var s = style.value;
      if (s === "xml") {
        if (r) b.push("<role>Tu es " + r + ".</role>");
        b.push("<tache>" + (t || "[Décrivez la tâche]") + "</tache>");
        if (c) b.push("<contexte>" + c + "</contexte>");
        if (p) b.push("<public>" + p + "</public>");
        if (ex) b.push("<exemple>" + ex + "</exemple>");
        b.push("<consignes>\n- " + consignes.join("\n- ") + "\n</consignes>");
        if (q) b.push(q);
      } else if (s === "titres") {
        if (r) b.push("### Rôle\nTu es " + r + ".");
        b.push("### Tâche\n" + (t || "[Décrivez la tâche]"));
        if (c) b.push("### Contexte\n" + c);
        if (p) b.push("### Public visé\n" + p);
        if (ex) b.push("### Exemple de ce que j'attends\n" + ex);
        b.push("### Consignes\n- " + consignes.join("\n- "));
        if (q) b.push(q);
      } else {
        b.push((r ? "Tu es " + r + ". " : "") + (t || "[Décrivez la tâche]"));
        if (c) b.push("Contexte : " + c);
        if (p) b.push("Public visé : " + p + ".");
        if (ex) b.push("Voici un exemple de ce que j'attends :\n\"\"\"\n" + ex + "\n\"\"\"");
        b.push(consignes.join("\n"));
        if (q) b.push(q);
      }
      out.value = b.join("\n\n");
      cpt.maj();
    }
    modele.addEventListener("change", remplir);
    [role, tache, contexte, pub, ton, format, longueur, exemples, contraintes, style, cQuestions.input, cIncertain.input, cVersions.input]
      .forEach(function (x) { x.addEventListener("input", maj); x.addEventListener("change", maj); });
    racine.appendChild(el("div", { classe: "grille" }, [champ("Modèle de départ", modele, "Remplit le formulaire avec un exemple à adapter."), champ("Style du prompt", style)]));
    racine.appendChild(el("div", { classe: "pile" }, [
      champ("Rôle donné à l'IA", role),
      champ("Tâche (ce que l'IA doit faire)", tache),
      champ("Contexte", contexte),
      champ("Public visé", pub)]));
    racine.appendChild(el("div", { classe: "grille" }, [champ("Ton", ton), champ("Format", format), champ("Longueur", longueur)]));
    racine.appendChild(el("div", { classe: "pile" }, [champ("Exemple", exemples), champ("Contraintes", contraintes),
      cQuestions.boite, cIncertain.boite, cVersions.boite]));
    racine.appendChild(el("h2", { classe: "titre-outil", texte: "Votre prompt" }));
    racine.appendChild(out); racine.appendChild(cpt.p);
    racine.appendChild(el("div", { classe: "boutons" }, [boutonCopier("Copier le prompt", function () { return out.value; })]));
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

  function analyser(t) {
    var res = [], n = mots(t);
    res.push({ ok: VERBES.test(t), nom: "Une tâche claire (verbe d'action)",
      conseil: "Commencez par un verbe précis : « Rédige », « Résume », « Compare », « Propose 5… ». « Parle-moi de » ou « Je veux » donnent des réponses vagues." });
    REGLES.forEach(function (r) { res.push({ ok: r.re.test(t), nom: r.nom, conseil: r.conseil, ajout: r.ajout, id: r.id }); });
    var vagues = (t.match(VAGUES) || []).map(function (x) { return x.toLowerCase(); });
    vagues = vagues.filter(function (x, i) { return vagues.indexOf(x) === i; });
    res.push({ ok: vagues.length === 0, nom: "Pas de mots vagues",
      conseil: vagues.length ? "Remplacez les mots vagues (" + vagues.join(", ") + ") par des précisions : quoi exactement, combien, pour qui." : "" });
    res.push({ ok: n >= 25, nom: "Assez de détails (au moins 25 mots)",
      conseil: "Votre prompt fait " + n + " mot" + (n > 1 ? "s" : "") + ". Un bon prompt fait souvent 40 à 150 mots : chaque précision évite une supposition de l'IA." });
    var long = n > 150, delim = /("""|```|<[a-z_]+>|---|\[début\]|«)/i.test(t);
    if (long) res.push({ ok: delim, nom: "Texte collé bien délimité",
      conseil: "Quand vous collez un long texte, entourez-le de \"\"\" ou de balises <texte>…</texte> pour que l'IA distingue vos consignes du texte à traiter." });
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
    var entree = zone({ rows: 7, placeholder: "Collez votre prompt ici. Exemple : écris un post sur mon nouveau produit" });
    var cpt = compteur(entree);
    var score = el("div", { classe: "resultats" });
    var liste = el("ul", { classe: "verdicts" });
    var out = sortie(10);
    var note = el("p", { classe: "aide", texte: "Les passages entre [crochets] sont à remplir avec vos informations avant d'envoyer le prompt." });
    function maj() {
      cpt.maj();
      liste.textContent = ""; score.textContent = "";
      var t = entree.value;
      if (!t.trim()) { out.value = ""; return; }
      var res = analyser(t), ok = res.filter(function (r) { return r.ok; }).length;
      var pc = Math.round(ok / res.length * 100);
      var appr = pc >= 85 ? "Très complet" : pc >= 60 ? "Correct, à préciser" : pc >= 35 ? "Trop vague" : "Très vague";
      score.appendChild(el("div", { classe: "tuile forte" }, [el("span", { classe: "valeur", texte: pc + " / 100" }), el("span", { classe: "libelle", texte: appr })]));
      score.appendChild(el("div", { classe: "tuile" }, [el("span", { classe: "valeur", texte: ok + " sur " + res.length }), el("span", { classe: "libelle", texte: "points présents" })]));
      res.forEach(function (r) {
        liste.appendChild(el("li", { classe: r.ok ? "v-ok" : "v-ko" }, [el("strong", { texte: (r.ok ? "✓ " : "✗ ") + r.nom }),
          !r.ok && r.conseil ? el("span", { texte: " : " + r.conseil }) : null]));
      });
      out.value = versionEnrichie(t, res);
    }
    entree.addEventListener("input", maj);
    racine.appendChild(champ("Votre prompt", entree)); racine.appendChild(cpt.p);
    racine.appendChild(score); racine.appendChild(liste);
    racine.appendChild(el("h2", { classe: "titre-outil", texte: "Version enrichie" }));
    racine.appendChild(out); racine.appendChild(note);
    racine.appendChild(el("div", { classe: "boutons" }, [boutonCopier("Copier la version enrichie", function () { return out.value; }),
      el("button", { type: "button", texte: "Essayer un exemple", onclick: function () { entree.value = "écris un post sur mon nouveau produit, un truc qui donne envie"; maj(); } })]));
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
    var entree = zone({ rows: 9, placeholder: "Collez ou tapez votre texte : le nombre de tokens s'affiche tout de suite." });
    var tuiles = el("div", { classe: "resultats" });
    var etat = el("p", { classe: "message" });
    var voir = caseACocher("Afficher le découpage en tokens (couleurs)", false);
    var vue = el("div", { classe: "tokens-vue", hidden: true });
    var sortieRep = nombre({ value: "500", min: "0", step: "100" });
    var tp = P ? tableauPrix(P, function (m) {
      var e = n * m.entree / 1e6, s = (Number(sortieRep.value) || 0) * m.sortie / 1e6;
      return [e, s, e + s];
    }, ["Modèle", "Votre texte en entrée", "Réponse", "Total"]) : null;
    var n = 0, enc = null, minuterie = null;
    function tuile(v, l, forte) { return el("div", { classe: "tuile" + (forte ? " forte" : "") }, [el("span", { classe: "valeur", texte: v }), el("span", { classe: "libelle", texte: l })]); }
    function compter() {
      var t = entree.value;
      tuiles.textContent = "";
      if (!enc) { tuiles.appendChild(tuile("…", "chargement du découpeur")); return; }
      var ids = enc.encode(t);
      n = ids.length;
      tuiles.appendChild(tuile(nf(n), "tokens (GPT-4o, GPT-5, o200k)", true));
      tuiles.appendChild(tuile(nf(t.length), "caractères"));
      tuiles.appendChild(tuile(nf(mots(t)), "mots"));
      tuiles.appendChild(tuile(n ? nf(t.length / n, 1) : "–", "caractères par token"));
      if (tp) tp.maj();
      vue.textContent = "";
      if (voir.input.checked && n) {
        var max = Math.min(ids.length, 3000);
        for (var i = 0; i < max; i++) vue.appendChild(el("span", { classe: "tk tk" + (i % 5), texte: enc.decode([ids[i]]) }));
        if (ids.length > max) vue.appendChild(el("p", { classe: "aide", texte: "Affichage limité aux 3 000 premiers tokens." }));
      }
      vue.hidden = !voir.input.checked;
    }
    function planifier() { clearTimeout(minuterie); minuterie = setTimeout(compter, entree.value.length > 50000 ? 400 : 60); }
    entree.addEventListener("input", planifier);
    voir.input.addEventListener("change", compter);
    sortieRep.addEventListener("input", function () { if (tp) tp.maj(); });
    racine.appendChild(champ("Votre texte", entree));
    racine.appendChild(tuiles); racine.appendChild(etat); racine.appendChild(voir.boite); racine.appendChild(vue);
    if (tp) {
      racine.appendChild(el("h2", { classe: "titre-outil", texte: "Combien coûte ce texte avec l'API ?" }));
      racine.appendChild(el("div", { classe: "grille" }, [champ("Longueur de la réponse (tokens)", sortieRep, "Une page de texte fait souvent 500 à 800 tokens.")]));
      racine.appendChild(tp.table);
      racine.appendChild(el("p", { classe: "aide", texte: "Prix officiels en dollars, hors taxes, relevés le " + P.date + ". Pour Claude et Gemini, le nombre de tokens est celui du découpeur GPT : c'est une estimation (leurs découpeurs ne sont pas publiés pour un calcul local)." }));
    }
    compter();
    chargerTokenizer().then(function (m) { enc = m; compter(); }, function () {
      message(etat, "Le découpeur de tokens n'a pas pu se charger. Rechargez la page.");
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
    }, ["Modèle", "Par requête", "Par jour", "Par mois"]);
    [te, ts, rq, jr, cache].forEach(function (x) { x.addEventListener("input", tp.maj); });
    racine.appendChild(el("div", { classe: "grille" }, [
      champ("Tokens en entrée par requête", te, "Votre prompt + le contexte envoyé."),
      champ("Tokens en sortie par requête", ts, "La réponse générée."),
      champ("Requêtes par jour", rq), champ("Jours par mois", jr),
      champ("Part de l'entrée lue en cache (%)", cache, "0 si vous ne savez pas. Le cache réduit le prix des parties répétées.")]));
    racine.appendChild(tp.table);
    racine.appendChild(el("p", { classe: "aide", texte: "Tri du moins cher au plus cher. Prix officiels en dollars, hors taxes, relevés le " + P.date + " (sources sous le tableau des tarifs)." }));
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
    var entree = zone({ rows: 10, placeholder: "Collez ici la réponse copiée depuis ChatGPT, Claude, Gemini ou Copilot." });
    var mode = choix([["texte", "Texte propre (sans ** ni #)"], ["html", "Code HTML"], ["md", "Garder le markdown, nettoyer seulement"]], racine.getAttribute("data-mode") || "texte");
    var tiret = choix([["garder", "Garder les tirets longs —"], ["court", "Remplacer — par un tiret court –"], ["virgule", "Remplacer — par une virgule"]], "court");
    var cInv = caseACocher("Retirer les caractères invisibles", true);
    var cEsp = caseACocher("Remplacer les espaces spéciales par des espaces normales", false);
    var cPuces = caseACocher("Garder les puces (•)", true);
    var cGuil = caseACocher("Guillemets “anglais” → « français »", false);
    var cEmoji = caseACocher("Retirer les émojis", false);
    var out = sortie(10), bilan = el("p", { classe: "message" }), apercu = el("div", { classe: "apercu", hidden: true });
    var dernier = { brut: "", html: "" };
    function maj() {
      var t = entree.value, notes = [];
      var nInv = (t.match(INVISIBLES) || []).length, nEsp = (t.match(ESPACES) || []).length, nTir = (t.match(/—/g) || []).length;
      if (cInv.input.checked && nInv) { t = t.replace(INVISIBLES, ""); notes.push(nInv + " caractère(s) invisible(s) retiré(s)"); }
      else if (nInv) notes.push(nInv + " caractère(s) invisible(s) trouvé(s)");
      if (cEsp.input.checked && nEsp) { t = t.replace(ESPACES, " "); notes.push(nEsp + " espace(s) spéciale(s) remplacée(s)"); }
      else if (nEsp) notes.push(nEsp + " espace(s) insécable(s) gardée(s)");
      if (nTir && tiret.value !== "garder") {
        t = tiret.value === "court" ? t.replace(/\s*—\s*/g, " – ") : t.replace(/\s*—\s*/g, ", ");
        notes.push(nTir + " tiret(s) long(s) remplacé(s)");
      }
      if (cGuil.input.checked) t = t.replace(/[“"]([^”"\n]+)[”"]/g, "« $1 »");
      if (cEmoji.input.checked) {
        var avant = t.length;
        try { t = t.replace(/(\p{Extended_Pictographic}|️|‍)/gu, ""); } catch (e) { /* navigateur ancien */ }
        if (t.length !== avant) notes.push("émojis retirés");
      }
      var nMd = (t.match(/\*\*|^#{1,6}\s|^\s*[-*+]\s|`/gm) || []).length;
      if (mode.value === "texte") {
        t = sansMd(t, cPuces.input.checked); if (nMd) notes.push(nMd + " marque(s) markdown converties");
        dernier = { brut: t, html: md2html(entree.value.replace(INVISIBLES, "")) };
        out.value = t;
      } else if (mode.value === "html") {
        var h = md2html(t); out.value = h; dernier = { brut: sansMd(t, true), html: h };
      } else { out.value = t; dernier = { brut: t, html: md2html(t) }; }
      apercu.innerHTML = dernier.html; // md2html échappe tout le texte saisi ; seuls des liens http(s) sont créés
      apercu.querySelectorAll("a").forEach(function (a) { a.setAttribute("rel", "nofollow noopener"); a.setAttribute("target", "_blank"); });
      apercu.hidden = !entree.value.trim();
      message(bilan, entree.value.trim() ? (notes.length ? notes.join(" · ") + "." : "Rien à corriger dans ce texte.") : "");
    }
    [entree, mode, tiret, cInv.input, cEsp.input, cPuces.input, cGuil.input, cEmoji.input].forEach(function (x) {
      x.addEventListener("input", maj); x.addEventListener("change", maj);
    });
    racine.appendChild(champ("Texte à nettoyer", entree));
    racine.appendChild(el("div", { classe: "grille" }, [champ("Résultat voulu", mode), champ("Tirets longs", tiret)]));
    racine.appendChild(el("div", { classe: "cases" }, [cInv.boite, cEsp.boite, cPuces.boite, cGuil.boite, cEmoji.boite]));
    racine.appendChild(bilan);
    racine.appendChild(el("h2", { classe: "titre-outil", texte: "Résultat" }));
    racine.appendChild(out);
    racine.appendChild(el("div", { classe: "boutons" }, [
      boutonCopier("Copier le résultat", function () { return out.value; }),
      boutonCopier("Copier avec la mise en forme (Word, Google Docs, e-mail)", function () { return dernier.html ? dernier : null; }, true)]));
    racine.appendChild(el("h3", { texte: "Aperçu mis en forme" }));
    racine.appendChild(apercu);
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
  function trouve(liste, v) { return liste.filter(function (x) { return x[0] === v; })[0]; }
  function outilImage(racine) {
    var outilCible = choix([["mj", "Midjourney"], ["gemini", "Nano Banana (Gemini)"], ["gpt", "ChatGPT (génération d'images)"], ["sd", "Stable Diffusion / Flux"]], "mj");
    var sujet = zone({ rows: 3, placeholder: "ex. un chat roux endormi sur une pile de livres dans une librairie ancienne" });
    var style = choix(STYLES.map(function (s) { return [s[0], s[1]]; }), "photo");
    var lumiere = choix(LUMIERES.map(function (s) { return [s[0], s[1]]; }), "");
    var plan = choix(PLANS.map(function (s) { return [s[0], s[1]]; }), "");
    var fmt = choix(FORMATS_IMG, "16:9");
    var ambiance = texte({ placeholder: "ex. couleurs pastel, ambiance calme, automne" });
    var ecrit = texte({ placeholder: "Facultatif : texte exact à écrire dans l'image" });
    var eviter = texte({ placeholder: "ex. texte, filigrane, personnes floues" });
    var out = sortie(7), aideOutil = el("p", { classe: "aide" });
    function maj() {
      var s = trouve(STYLES, style.value), lu = trouve(LUMIERES, lumiere.value), pl = trouve(PLANS, plan.value);
      var suj = sujet.value.trim() || "[votre sujet]", amb = ambiance.value.trim(), tx = ecrit.value.trim(), ev = eviter.value.trim();
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
          aideOutil.textContent = "Midjourney comprend mieux l'anglais : les réglages sont traduits, écrivez si possible votre sujet en anglais. --ar fixe le format, --no retire ce que vous ne voulez pas.";
        } else {
          r = "Prompt : " + p.join(", ") + "\n\nPrompt négatif : " + (ev ? ev + ", " : "") + "blurry, low quality, deformed, watermark" + "\n\nFormat : " + fmt.value;
          aideOutil.textContent = "Stable Diffusion et Flux comprennent mieux l'anglais. Le format se règle dans les dimensions de l'image ; le prompt négatif va dans son propre champ (Flux n'en a pas toujours).";
        }
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
    racine.appendChild(el("div", { classe: "grille" }, [champ("Outil d'image", outilCible), champ("Format", fmt)]));
    racine.appendChild(champ("Sujet de l'image", sujet));
    racine.appendChild(el("div", { classe: "grille" }, [champ("Style", style), champ("Lumière", lumiere), champ("Cadrage", plan)]));
    racine.appendChild(el("div", { classe: "grille" }, [champ("Ambiance, couleurs", ambiance), champ("Texte dans l'image", ecrit), champ("À éviter", eviter)]));
    racine.appendChild(el("h2", { classe: "titre-outil", texte: "Votre prompt d'image" }));
    racine.appendChild(out); racine.appendChild(aideOutil);
    racine.appendChild(el("div", { classe: "boutons" }, [boutonCopier("Copier le prompt", function () { return out.value; })]));
    maj();
  }

  // ---------------------------------------------------------------- 7. Instructions personnalisées
  function outilInstructions(racine) {
    var metier = texte({ placeholder: "ex. infirmière, gérant d'une boulangerie, étudiant en droit" });
    var usage = zone({ rows: 2, placeholder: "ex. écrire des e-mails, préparer mes cours, comprendre des documents administratifs" });
    var niveau = choix([["debutant", "Débutant : expliquer simplement"], ["moyen", "Intermédiaire"], ["expert", "Expert : aller droit au technique"]], "moyen");
    var ton = choix(TONS, "direct");
    var longueur = choix([["courte", "Courtes et directes"], ["adaptee", "Adaptées à la question"], ["detaillee", "Détaillées"]], "adaptee");
    var adresse = choix([["vous", "Me vouvoyer"], ["tu", "Me tutoyer"]], "vous");
    var eviter = zone({ rows: 2, placeholder: "ex. les listes trop longues, les émojis, les formules de politesse inutiles" });
    var cSources = caseACocher("Signaler quand il n'est pas sûr", true);
    var cQuestions = caseACocher("Me poser une question si ma demande est floue", true);
    var cResume = caseACocher("Commencer par la réponse courte, puis détailler", true);
    var o1 = sortie(5), o2 = sortie(8), c1 = compteur(o1), c2 = compteur(o2);
    function maj() {
      var a = [];
      if (metier.value.trim()) a.push("Je suis " + metier.value.trim() + ".");
      if (usage.value.trim()) a.push("J'utilise l'IA surtout pour : " + usage.value.trim() + ".");
      a.push({ debutant: "Je débute sur la plupart des sujets techniques : explique sans jargon.", moyen: "J'ai un niveau intermédiaire : pas besoin de tout reprendre depuis le début.", expert: "Je connais bien mon domaine : va droit aux détails techniques." }[niveau.value]);
      a.push("Je vis en France : utilise les références françaises (lois, unités, euros, dates au format jour/mois/année).");
      o1.value = a.join("\n");
      var b = ["Réponds en français, avec un ton " + TON_TXT[ton.value] + ".",
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
    racine.appendChild(el("div", { classe: "grille" }, [champ("Votre métier ou situation", metier), champ("Votre niveau", niveau)]));
    racine.appendChild(champ("Ce que vous faites avec l'IA", usage));
    racine.appendChild(el("div", { classe: "grille" }, [champ("Ton des réponses", ton), champ("Longueur", longueur), champ("Tutoiement", adresse)]));
    racine.appendChild(champ("À éviter", eviter));
    racine.appendChild(el("div", { classe: "cases" }, [cResume.boite, cQuestions.boite, cSources.boite]));
    racine.appendChild(el("h2", { classe: "titre-outil", texte: "1. Ce que l'IA doit savoir sur vous" }));
    racine.appendChild(o1); racine.appendChild(c1.p);
    racine.appendChild(el("div", { classe: "boutons" }, [boutonCopier("Copier le bloc 1", function () { return o1.value; })]));
    racine.appendChild(el("h2", { classe: "titre-outil", texte: "2. Comment l'IA doit vous répondre" }));
    racine.appendChild(o2); racine.appendChild(c2.p);
    racine.appendChild(el("div", { classe: "boutons" }, [boutonCopier("Copier le bloc 2", function () { return o2.value; }),
      boutonCopier("Copier les deux blocs ensemble", function () { return o1.value + "\n\n" + o2.value; })]));
    maj();
  }

  // ---------------------------------------------------------------- boutons « Copier » des pages de prompts
  function boutonsCopierPrompts() {
    document.querySelectorAll("[data-copier]").forEach(function (b) {
      var cible = document.getElementById(b.getAttribute("data-copier"));
      if (!cible) return;
      b.hidden = false;
      b.addEventListener("click", function () {
        copierTexte(cible.textContent).then(function () {
          var t = b.textContent; b.textContent = "Copié ✓";
          setTimeout(function () { b.textContent = t; }, 1600);
        });
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
      try { f(s); } catch (e) { s.appendChild(el("p", { classe: "message", texte: "L'outil n'a pas pu démarrer dans ce navigateur. Essayez avec un navigateur à jour." })); }
    });
    boutonsCopierPrompts();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarrer); else demarrer();
})();
