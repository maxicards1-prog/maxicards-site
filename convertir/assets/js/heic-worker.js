/* Décodage HEIC/HEIF dans un worker (libheif, LGPL-3.0). Rien ne sort de l'appareil. */
'use strict';
let pret = null;

function charger(base) {
  if (!pret) {
    pret = new Promise((ok, ko) => {
      try {
        importScripts(base + 'libheif.js');
        let mod;
        mod = self.libheif({
          locateFile: (f) => base + f,
          onRuntimeInitialized: () => setTimeout(() => ok(mod), 0),
          onAbort: (e) => ko(new Error('Le décodeur HEIC n\'a pas pu démarrer : ' + e)),
        });
      } catch (e) {
        ko(e);
      }
    });
  }
  return pret;
}

self.onmessage = async (e) => {
  const { id, base, buffer } = e.data;
  try {
    const lib = await charger(base);
    const decodeur = new lib.HeifDecoder();
    const images = decodeur.decode(new Uint8Array(buffer));
    if (!images || !images.length) throw new Error('Aucune image trouvée dans ce fichier HEIC.');
    const im = images[0];
    const w = im.get_width();
    const h = im.get_height();
    const donnees = await new Promise((ok, ko) => {
      im.display({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h },
        (d) => (d ? ok(d.data) : ko(new Error('Décodage HEIC impossible : fichier abîmé ou variante non prise en charge.'))));
    });
    for (const x of images) { if (x && typeof x.free === 'function') x.free(); }
    self.postMessage({ id, w, h, data: donnees.buffer }, [donnees.buffer]);
  } catch (err) {
    self.postMessage({ id, erreur: String((err && err.message) || err) });
  }
};
