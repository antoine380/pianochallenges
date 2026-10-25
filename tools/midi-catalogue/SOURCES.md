# Catalogue des claviers MIDI — sources (25/10/2026)

Fichier : `assets/js/midi-keyboards.js` (505 modèles, 36 marques). Champs affichés, selon la demande d'Antoine :
**marque, modèle, nombre de touches, connexion (câble USB et/ou Bluetooth MIDI)**. Les alias de port (détection
automatique), `mini` (mini-touches) et `g` (forme du dessin) sont internes.

Règles suivies :
- « Bluetooth » = Bluetooth **MIDI** (intégré, ou adaptateur fourni dans la boîte comme le WU-BT10 des Casio PX-S1100).
  Un piano qui ne diffuse que de l'audio en Bluetooth (Yamaha P-225, P-145, DGX-670, Korg C1 Air / G1 Air…) est noté « USB ».
  Un adaptateur vendu à part (Yamaha UD-BT01, Casio WU-BT10 pour les Casiotone) ne compte pas.
- Quand la connexion n'a pas pu être vérifiée, elle est laissée vide (`c: []`, affichée « Connexion à vérifier ») :
  Donner (sauf DEP-20), Artesia, Medeli, Thomann (sauf SP-320), Dexibell VIVO P3.
- Le nombre de touches vient de la fiche du fabricant, d'une fiche revendeur, ou du nom du modèle quand il le contient.
- Aucune photo ni logo : les vignettes sont dessinées par l'app (SVG) et la marque est écrite en texte (usage nominatif).
- Aucun prix ni lien d'achat dans l'app.

Marques demandées non retenues faute de données vérifiables : Viscount, Fatar (fabricant des claviers Studiologic,
qui vend sous cette marque), Ketron, Ringway, Gear4music, Pearl River (modèles listés sur le site du fabricant, mais ni
nombre de touches ni connexion par modèle), Ammoon. À ajouter quand une fiche fiable est trouvée.

## Fabricants
- Yamaha, gamme P (P-525 : Bluetooth audio et MIDI ; P-225 / P-143 / P-145 : USB to Host) : https://usa.yamaha.com/products/musical_instruments/pianos/p_series/index.html
- Yamaha, claviers portables (PSR-E, PSR-EW, EZ, touches) : https://usa.yamaha.com/products/musical_instruments/keyboards/portable_keyboards/index.html
- Yamaha CLP-835 : https://usa.yamaha.com/products/musical_instruments/pianos/clavinova/clp-835/index.html
- Yamaha UD-BT01 (adaptateur Bluetooth MIDI vendu à part) : https://europe.yamaha.com/en/musical-instruments/pianos/products/accessories/ud-bt01/index.html
- Roland, pianos portables (FP-30X, FP-60X, FP-90X : Bluetooth audio/MIDI) : https://www.roland.com/global/categories/pianos/portable_pianos/
- Roland FP-10 (Bluetooth 4.0, USB) : https://www.roland.com/global/products/fp-10/
- Roland FP-40 (88 touches, GATT MIDI over BLE, USB-C MIDI/audio) : https://www.roland.com/global/products/fp-40/
- Roland FP-E50 (GATT MIDI, USB MIDI/audio) : https://www.roland.com/global/products/fp-e50/
- Roland, gammes de pianos : https://www.roland.com/global/categories/pianos/
- Korg microKEY Air (25/37/49/61, Bluetooth LE MIDI + USB) : https://www.korg.com/us/products/computergear/microkey2_air/
- Casio PX-S1100 (88 touches, adaptateur WU-BT10 fourni, USB) : https://www.casio.com/intl/electronic-musical-instruments/product.PX-S1100BK/
- Casio, gammes : https://www.casio.com/intl/electronic-musical-instruments/
- Kawai KDP120 (Bluetooth MIDI, USB to Host) : https://www.maene.be/media/akeneo_connector/media_files/K/D/KDP120_Leaflet_EN_300dpi_44d2.pdf
- Pearl River, gamme numérique : https://pearlriverpianogroup.com/digital-series/
- Hammond, produits : https://www.hammondorganco.com/products/
- Donner, DMK-25 Pro : https://donnermusic.com/articles/news_donner-announces-dmk-25-pro-midi-keyboard-controller ; gamme de pianos : https://uk.donnermusic.com/es/collections/all-products/products/ddp-200pro-digital-piano

## Revendeurs (listes de modèles et fiches techniques)
- Thomann, claviers maîtres ≤ 25 / ≤ 49 / ≤ 61 / ≤ 88 touches :
  https://www.thomannmusic.com/master_keyboards_up_to_25_keys.html ,
  https://www.thomannmusic.com/master_keyboards_up_to_49_keys.html ,
  https://www.thomannmusic.com/master_keyboards_up_to_61_keys.html ,
  https://www.thomannmusic.com/master_keyboards_up_to_88_keys.html
- Thomann, pianos de scène, pianos numériques, claviers, synthés, workstations :
  https://www.thomannmusic.com/stage_pianos.html , https://www.thomannmusic.com/digital_pianos.html ,
  https://www.thomannmusic.com/home_keyboards.html , https://www.thomannmusic.com/synthesizers.html ,
  https://www.thomannmusic.com/workstations.html
- Fiches Thomann : Yamaha P-S500 (88, USB to Host, pas de Bluetooth) https://thomannmusic.com/yamaha_p_s500_wh.htm ;
  Yamaha P-225 (Bluetooth audio seulement) https://thomannmusic.com/yamaha_p_225_b.htm ;
  Kawai ES120 (Bluetooth MIDI 5.0) https://www.thomannmusic.com/kawai_es_120_b.htm ;
  Thomann SP-320 (88, USB MIDI) https://www.thomannmusic.com/thomann_sp_320.htm ;
  Midiplus X6 Max (61, USB) https://www.thomannmusic.com/midiplus_x6_max.htm
- Kawai CN201 (Bluetooth MIDI et audio, USB-MIDI) : https://www.americanmusical.com/p/kawai-cn201-digital-home-piano
- Williams Allegro IV / Legato IV (88, USB audio/MIDI) : https://mmrmagazine.com/williams-allegro-iv-and-legato-iv-pianos-now-available
- Donner DEP-20 (88, USB MIDI) : https://ivormairants.co.uk/products/donner-dep20-88-keys-portable-piano-with-stand
- Dexibell VIVO S4 (73, Bluetooth audio et MIDI) : https://kraftmusic.com/products/dexibell-vivo-s4-stage-piano ; VIVO S7 : https://www.musicradar.com/reviews/dexibell-vivo-s7
- Artesia : https://www.adorama.com/l/Artesia~Musical-Instruments
- Rapport `midi.md` §9 (Musiciangoods, Equipboard FP-10, zZounds P-145).
