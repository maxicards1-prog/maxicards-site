/* Vignette Crit'Air : énergie, norme Euro, date de 1re immatriculation (arrêté du 21 juin 2016). */
(function () {
  'use strict';
  var CQ = window.CQ, AU = window.AU, D = window.AU_DATA;
  function recalcul() {
    var type = CQ.valeur('type'), energie = CQ.valeur('energie');
    var r = AU.critair({ type: type, energie: energie, date: CQ.valeur('date'), euro: CQ.valeur('euro') });
    var v = CQ.el('vignette');
    if (!r) {
      v.className = 'vignette vnc'; CQ.texte('vNum', '?'); CQ.texte('vTxt', 'Crit’Air');
      CQ.texte('rClasse', '–'); CQ.texte('rCouleur', '–');
      CQ.texte('phrase', 'Choisissez la date de première immatriculation (case B de la carte grise).');
      return;
    }
    var k = r.classe;
    v.className = 'vignette ' + (k === 'nc' ? 'vnc' : 'v' + k);
    CQ.texte('vNum', k === 'nc' ? 'Non classé' : (k === '0' ? '0' : k));
    CQ.texte('vTxt', k === 'nc' ? '' : (k === '0' ? 'verte' : 'Crit’Air'));
    CQ.texte('rClasse', D.critair.noms[k]);
    CQ.texte('rCouleur', D.critair.couleurs[k]);
    var deux = type === 'moto' || type === 'cyclo';
    var t;
    if (k === 'nc') { t = 'Non classé : ce véhicule ne peut pas avoir de vignette Crit’Air. Il ne peut pas circuler dans une ZFE qui exige une vignette, sauf dérogation locale.'; }
    else if (r.par === 'energie') { t = D.critair.noms[k] + ' (' + D.critair.couleurs[k] + ') : la classe dépend seulement de l’énergie, quelle que soit la date.'; }
    else if (r.par === 'euro') { t = D.critair.noms[k] + ' (' + D.critair.couleurs[k] + ') d’après la norme Euro ' + CQ.valeur('euro') + '.'; }
    else { t = D.critair.noms[k] + ' (' + D.critair.couleurs[k] + ') d’après la date de première immatriculation.'; }
    if (deux && (energie === 'diesel' || energie === 'gaz' || energie === 'phev')) { t += ' Deux-roues : classement fait comme un moteur à essence ; vérifiez sur le site officiel.'; }
    if (k !== 'nc') { t += ' Prix : ' + CQ.souple(D.critair.prix, 2) + ' €, sur certificat-air.gouv.fr seulement.'; }
    CQ.texte('phrase', t);
  }
  CQ.initPartage(recalcul);
  CQ.surChangement(['type', 'energie', 'date', 'euro'], recalcul);
}());
