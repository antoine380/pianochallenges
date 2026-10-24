/* Piano Challenges — song catalogue (C6), shared by the host page (PLAY tiles) and the Play player (play/index.html).
   Public domain only: traditional tunes, carols, and works by composers who died long before 1955, published before 1929.
   The arrangements below are our own (melody + generated left hand); no lyrics.
   Format of a song:
     id      letters only (used in #song=<id>; the first arrangement keeps the bare id for its stars)
     t       [French title, English title]
     by      composer (or "trad"), from = origin of a traditional tune, d = date (composition / first publication)
     c       collection: first | classic | xmas | world
     o, k    tile object (OBJ key on the host) and tile colour (white text ≥ 4.5:1)
     bpm, m  tempo (quarter notes per minute) and meter [beats, unit]; p = pickup length in quarter notes
     mel     right-hand melody: NOTE:duration tokens (durations in quarter notes, R = rest), C4 = middle C
     ch      chords from the first full bar: bars separated by "|", chords in a bar share it equally, or "Chord:duration"
     lv      arrangements: 1 Easy (melody, one hand), 2 Medium (melody + left-hand roots), 3 Advanced (melody + left-hand pattern)
             solo = level of the one-hand arrangement when the song has no chords (e.g. Für Elise = 3)
     f       fingering of the melody (else computed when the melody fits in a five-finger position)
*/
(function (G) {
  const SONGS = [
  // ---------- Premiers pas ----------
  { id:"lune", t:["Au clair de la lune","Au clair de la lune"], by:"trad", from:"fr", d:"XVIIIe s.", c:"first", o:"moon", k:"#2c56d6", bpm:96, m:[4,4],
    f:{C4:1,D4:2,E4:3},
    mel:"C4:1 C4:1 C4:1 D4:1 E4:2 D4:2 C4:1 E4:1 D4:1 D4:1 C4:4 C4:1 C4:1 C4:1 D4:1 E4:2 D4:2 C4:1 E4:1 D4:1 D4:1 C4:4",
    ch:"C|C G|C G|C|C|C G|C G|C" },
  { id:"maman", t:["Ah ! vous dirai-je, maman","Twinkle, Twinkle, Little Star"], by:"trad", from:"fr", d:"1761 (var. Mozart 1781)", c:"first", o:"star", k:"#6a3fd1", bpm:100, m:[4,4],
    f:{C4:1,D4:2,E4:3,F4:4,G4:5,A4:5},
    mel:"C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2",
    ch:"C|F C|F C|G C|C F|C G|C F|C G|C|F C|F C|G C" },
  { id:"jacques", t:["Frère Jacques","Frère Jacques"], by:"trad", from:"fr", d:"XVIIIe s.", c:"first", o:"bell", k:"#b4461a", bpm:108, m:[4,4],
    f:{G4:1,C5:1,D5:2,E5:3,F5:4,G5:5,A5:5},
    mel:"C5:1 D5:1 E5:1 C5:1 C5:1 D5:1 E5:1 C5:1 E5:1 F5:1 G5:2 E5:1 F5:1 G5:2 G5:.5 A5:.5 G5:.5 F5:.5 E5:1 C5:1 G5:.5 A5:.5 G5:.5 F5:.5 E5:1 C5:1 C5:1 G4:1 C5:2 C5:1 G4:1 C5:2",
    ch:"C|C|C|C|C|C|C|C" },
  { id:"agneau", t:["Marie avait un petit agneau","Mary Had a Little Lamb"], by:"trad", from:"us", d:"1830", c:"first", o:"leaf", k:"#1f7a52", bpm:100, m:[4,4],
    mel:"E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:2 E4:1 G4:1 G4:2 E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:1 E4:1 D4:1 D4:1 E4:1 D4:1 C4:4",
    ch:"C|C|G|C|C|C|G|C" },
  { id:"buns", t:["Hot Cross Buns","Hot Cross Buns"], by:"trad", from:"gb", d:"1798", c:"first", o:"croissant", k:"#a3306b", bpm:96, m:[4,4],
    mel:"E4:1 D4:1 C4:2 E4:1 D4:1 C4:2 C4:.5 C4:.5 C4:.5 C4:.5 D4:.5 D4:.5 D4:.5 D4:.5 E4:1 D4:1 C4:2",
    ch:"C|C|C G|C" },
  { id:"hansel", t:["Hänschen klein","Hänschen klein"], by:"trad", from:"de", d:"1830", c:"first", o:"paw", k:"#0e7490", bpm:100, m:[4,4],
    mel:"G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 D4:1 E4:1 F4:1 G4:1 G4:1 G4:2 G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 C4:1 E4:1 G4:1 G4:1 C4:4",
    ch:"C|G|C|G|C|G|C|C" },
  { id:"londres", t:["Le pont de Londres","London Bridge"], by:"trad", from:"gb", d:"1744", c:"first", o:"castle", k:"#2c56d6", bpm:104, m:[4,4],
    mel:"G4:1.5 A4:.5 G4:1 F4:1 E4:1 F4:1 G4:2 D4:1 E4:1 F4:2 E4:1 F4:1 G4:2 G4:1.5 A4:.5 G4:1 F4:1 E4:1 F4:1 G4:2 D4:2 G4:2 E4:1 C4:3",
    ch:"C|C|G|C|C|C|G|C" },
  { id:"oldmac", t:["Old MacDonald","Old MacDonald Had a Farm"], by:"trad", from:"us", d:"1917", c:"first", o:"apple", k:"#c9463c", bpm:112, m:[4,4],
    mel:"G4:1 G4:1 G4:1 D4:1 E4:1 E4:1 D4:2 B4:1 B4:1 A4:1 A4:1 G4:3 D4:.5 D4:.5 G4:1 G4:1 G4:1 D4:1 E4:1 E4:1 D4:2 B4:1 B4:1 A4:1 A4:1 G4:4",
    ch:"G|C G|G D|G|G|C G|G D|G" },
  { id:"barque", t:["Rame, rame, rame","Row, Row, Row Your Boat"], by:"trad", from:"us", d:"1852", c:"first", o:"fish", k:"#0e7490", bpm:84, m:[6,8],
    mel:"C4:1.5 C4:1.5 C4:1 D4:.5 E4:1.5 E4:1 D4:.5 E4:1 F4:.5 G4:3 C5:.5 C5:.5 C5:.5 G4:.5 G4:.5 G4:.5 E4:.5 E4:.5 E4:.5 C4:.5 C4:.5 C4:.5 G4:1 F4:.5 E4:1 D4:.5 C4:3",
    ch:"C|C|C|C|C|C|G|C" },
  { id:"alouette", t:["Alouette","Alouette"], by:"trad", from:"qc", d:"1879", c:"first", o:"sun", k:"#6a3fd1", bpm:104, m:[4,4],
    mel:"F4:1.5 G4:.5 A4:1 A4:1 G4:.5 F4:.5 G4:.5 A4:.5 F4:1 C4:1 F4:1.5 G4:.5 A4:1 A4:1 G4:.5 F4:.5 G4:.5 A4:.5 F4:2",
    ch:"F|C F|F|C F" },

  // ---------- Classiques célèbres ----------
  { id:"ode", t:["Ode à la joie","Ode to Joy"], by:"L. van Beethoven", d:"1824", c:"classic", o:"staff", k:"#1f7a52", bpm:104, m:[4,4],
    f:{C4:1,D4:2,E4:3,F4:4,G4:5},
    mel:"E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2 E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2",
    ch:"C|G|C|C G|C|G|C|G C" },
  { id:"elise", t:["Lettre à Élise","Für Elise"], by:"L. van Beethoven", d:"1810", c:"classic", o:"heart", k:"#b02a6b", bpm:76, m:[3,8], p:1, solo:3,
    f:{E5:4,"D#5":3,D5:3,C5:2,B4:1,A4:1,"G#4":2,E4:2,C4:1},
    mel:"E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 G#4:.5 B4:.5 C5:1.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1.5 C4:.5 E4:.5 A4:.5 B4:1.5 E4:.5 C5:.5 B4:.5 A4:1.5" },
  { id:"canon", t:["Canon de Pachelbel","Pachelbel's Canon"], by:"J. Pachelbel", d:"vers 1680", c:"classic", o:"crown", k:"#b4461a", bpm:72, m:[4,4],
    mel:"E5:2 D5:2 C5:2 B4:2 A4:2 G4:2 A4:2 B4:2 C5:2 B4:2 A4:2 G4:2 F4:2 E4:2 F4:2 D4:2 C5:1 E5:1 G5:1 F5:1 E5:1 C5:1 E5:1 D5:1 C5:1 A4:1 C5:1 G4:1 F4:1 A4:1 G4:1 F4:1 E4:4",
    ch:"C G|Am Em|F C|F G|C G|Am Em|F C|F G|C G|Am Em|F C|F G|C" },
  { id:"menuet", t:["Menuet en sol","Minuet in G"], by:"C. Petzold", d:"1725", c:"classic", o:"palette", k:"#2c56d6", bpm:100, m:[3,4],
    mel:"D5:1 G4:.5 A4:.5 B4:.5 C5:.5 D5:1 G4:1 G4:1 E5:1 C5:.5 D5:.5 E5:.5 F#5:.5 G5:1 G4:1 G4:1 C5:1 D5:.5 C5:.5 B4:.5 A4:.5 B4:1 C5:.5 B4:.5 A4:.5 G4:.5 F#4:1 G4:.5 A4:.5 B4:.5 G4:.5 B4:1 A4:2 D5:1 G4:.5 A4:.5 B4:.5 C5:.5 D5:1 G4:1 G4:1 E5:1 C5:.5 D5:.5 E5:.5 F#5:.5 G5:1 G4:1 G4:1 C5:1 D5:.5 C5:.5 B4:.5 A4:.5 B4:1 C5:.5 B4:.5 A4:.5 G4:.5 A4:1 B4:.5 A4:.5 G4:.5 F#4:.5 G4:3",
    ch:"G|G|C|G|Am|G|D|G:1 D:2|G|G|C|G|Am|G|D|G" },
  { id:"berceuse", t:["Berceuse de Brahms","Brahms' Lullaby"], by:"J. Brahms", d:"1868", c:"classic", o:"moon", k:"#6a3fd1", bpm:84, m:[3,4], p:1,
    mel:"E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5:1 B4:1.5 A4:.5 A4:1 G4:1 D4:.5 E4:.5 F4:1 D4:1 D4:.5 E4:.5 F4:2 D4:.5 F4:.5 B4:.5 A4:.5 G4:1 B4:1 C5:2 C4:.5 C4:.5 C5:2 A4:.5 F4:.5 G4:2 E4:.5 C4:.5 F4:1 G4:1 A4:1 G4:2 C4:.5 C4:.5 C5:2 A4:.5 F4:.5 G4:2 E4:.5 C4:.5 F4:1 E4:1 D4:1 C4:2",
    ch:"C|C|G|G|G|G|G|C|F|C|G|C|F|C|G|C:2" },
  { id:"montagne", t:["Dans l'antre du roi de la montagne","In the Hall of the Mountain King"], by:"E. Grieg", d:"1875", c:"classic", o:"mountain", k:"#26805a", bpm:96, m:[4,4],
    mel:"A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5:1 D#5:.5 B4:.5 D#5:1 D5:.5 A#4:.5 D5:1 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5:.5 A5:.5 G5:.5 E5:.5 C5:.5 E5:.5 G5:2 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5:1 D#5:.5 B4:.5 D#5:1 D5:.5 A#4:.5 D5:1 A4:.5 B4:.5 C5:.5 D5:.5 E5:.5 C5:.5 E5:.5 A5:.5 G5:.5 E5:.5 C5:.5 E5:.5 G5:2 A4:4",
    ch:"Am|B Bb|Am|C|Am|B Bb|Am|C|Am" },
  { id:"largo", t:["Symphonie du Nouveau Monde (Largo)","New World Symphony (Largo)"], by:"A. Dvořák", d:"1893", c:"classic", o:"globe", k:"#0e7490", bpm:72, m:[4,4],
    f:{C4:1,D4:2,E4:3,G4:5},
    mel:"E4:1.5 G4:.5 G4:2 E4:1.5 D4:.5 C4:2 D4:1 E4:1 G4:1 E4:1 D4:4 E4:1.5 G4:.5 G4:2 E4:1.5 D4:.5 C4:2 D4:1 E4:1 D4:1 C4:1 C4:4",
    ch:"C|C|G C|G|C|C|G|C" },
  { id:"nachtmusik", t:["Petite musique de nuit (début)","Eine kleine Nachtmusik (opening)"], by:"W. A. Mozart", d:"1787", c:"classic", o:"planet", k:"#8a3fd1", bpm:120, m:[4,4],
    mel:"G4:1 R:.5 D4:.5 G4:1 R:.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5:1 R:.5 A4:.5 C5:1 R:.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 D4:2 G4:4",
    ch:"G|G|D|D|G" },

  // ---------- Noël ----------
  { id:"jingle", t:["Jingle Bells","Jingle Bells"], by:"J. L. Pierpont", d:"1857", c:"xmas", o:"bell", k:"#c9463c", bpm:116, m:[4,4],
    mel:"E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1 D4:1 E4:4 F4:1 F4:1 F4:1 F4:1 F4:1 E4:1 E4:1 E4:.5 E4:.5 E4:1 D4:1 D4:1 E4:1 D4:2 G4:2 E4:1 E4:1 E4:2 E4:1 E4:1 E4:2 E4:1 G4:1 C4:1 D4:1 E4:4 F4:1 F4:1 F4:1 F4:1 F4:1 E4:1 E4:1 E4:.5 E4:.5 G4:1 G4:1 F4:1 D4:1 C4:4",
    ch:"C|C|C|C|F|F C|G|G|C|C|C|C|F|F C|G|C" },
  { id:"douce", t:["Douce nuit","Silent Night"], by:"F. X. Gruber", d:"1818", c:"xmas", o:"star", k:"#2c56d6", bpm:66, m:[6,8],
    mel:"G4:1.5 A4:.5 G4:1 E4:3 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 B4:3 C5:2 C5:1 G4:3 A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3 A4:2 A4:1 C5:1.5 B4:.5 A4:1 G4:1.5 A4:.5 G4:1 E4:3 D5:2 D5:1 F5:1.5 D5:.5 B4:1 C5:3 E5:3 C5:1.5 G4:.5 E4:1 G4:1.5 F4:.5 D4:1 C4:3",
    ch:"C|C|C|C|G|G|C|C|F|F|C|C|F|F|C|C|G|G|C|C|C|G|C" },
  { id:"deck", t:["Deck the Halls","Deck the Halls"], by:"trad", from:"wa", d:"XVIe s.", c:"xmas", o:"gift", k:"#1f7a52", bpm:112, m:[4,4],
    mel:"C5:1.5 A#4:.5 A4:1 G4:1 F4:1 G4:1 A4:1 F4:1 G4:.5 A4:.5 A#4:.5 G4:.5 A4:1.5 G4:.5 F4:1 E4:1 F4:2 C5:1.5 A#4:.5 A4:1 G4:1 F4:1 G4:1 A4:1 F4:1 G4:.5 A4:.5 A#4:.5 G4:.5 A4:1.5 G4:.5 F4:1 E4:1 F4:2 G4:1.5 A4:.5 A#4:1 G4:1 A4:1.5 A#4:.5 C5:1 G4:1 A4:.5 B4:.5 C5:1 D5:.5 E5:.5 F5:1 E5:1 D5:1 C5:2 C5:1.5 A#4:.5 A4:1 G4:1 F4:1 G4:1 A4:1 F4:1 D5:.5 D5:.5 D5:.5 D5:.5 C5:1.5 A#4:.5 A4:1 G4:1 F4:2",
    ch:"F|F|C F|C F|F|F|C F|C F|C|F C|F Bb|C|F|F|Bb C|C F" },
  { id:"wewish", t:["We Wish You a Merry Christmas","We Wish You a Merry Christmas"], by:"trad", from:"gb", d:"XVIe s.", c:"xmas", o:"gift", k:"#b02a6b", bpm:132, m:[3,4], p:1,
    mel:"C4:1 F4:1 F4:.5 G4:.5 F4:.5 E4:.5 D4:1 D4:1 D4:1 G4:1 G4:.5 A4:.5 G4:.5 F4:.5 E4:1 C4:1 C4:1 A4:1 A4:.5 A#4:.5 A4:.5 G4:.5 F4:1 D4:1 C4:.5 C4:.5 D4:1 G4:1 E4:1 F4:2",
    ch:"F|Bb|G|C|A|Dm|Bb:1 C:2|F:2" },
  { id:"wenceslas", t:["Good King Wenceslas","Good King Wenceslas"], by:"trad", from:"fi", d:"1582", c:"xmas", o:"crown", k:"#6a3fd1", bpm:104, m:[4,4],
    mel:"G4:1 G4:1 G4:1 A4:1 G4:1 G4:1 D4:2 E4:1 D4:1 E4:1 F#4:1 G4:2 G4:2 G4:1 G4:1 G4:1 A4:1 G4:1 G4:1 D4:2 E4:1 D4:1 E4:1 F#4:1 G4:2 G4:2 D5:1 C5:1 B4:1 A4:1 B4:1 A4:1 G4:2 E4:1 D4:1 E4:1 F#4:1 G4:2 G4:2 D4:1 D4:1 E4:1 F#4:1 G4:1 G4:1 A4:2 D5:1 C5:1 B4:1 A4:1 G4:2 C5:2 G4:4",
    ch:"G|G|Em D|G|G|G|Em D|G|G|G|Em D|G|D|G D|G|G C|G" },
  { id:"anges", t:["Les anges dans nos campagnes","Angels We Have Heard on High"], by:"trad", from:"fr", d:"XVIIIe s.", c:"xmas", o:"bell", k:"#0e7490", bpm:100, m:[4,4],
    mel:"B4:1 B4:1 B4:1 D5:1 D5:1.5 C5:.5 B4:2 B4:1 A4:1 B4:1 D5:1 B4:1.5 A4:.5 G4:2 B4:1 B4:1 B4:1 D5:1 D5:1.5 C5:.5 B4:2 B4:1 A4:1 B4:1 D5:1 B4:1.5 A4:.5 G4:2 D5:2 E5:.5 D5:.5 C5:.5 B4:.5 C5:2 D5:.5 C5:.5 B4:.5 A4:.5 B4:2 C5:.5 B4:.5 A4:.5 G4:.5 A4:1.5 D4:.5 D4:2 G4:1 A4:1 B4:1 C5:1 B4:2 A4:2 G4:4",
    ch:"G|D G|G|G|G|D G|G|G|G C|Am D|G C|D|G|G D|G" },
  { id:"noel", t:["Le premier Noël","The First Noel"], by:"trad", from:"gb", d:"1823", c:"xmas", o:"sun", k:"#b4461a", bpm:96, m:[3,4], p:1,
    mel:"E4:.5 D4:.5 C4:1.5 D4:.5 E4:.5 F4:.5 G4:2 A4:.5 B4:.5 C5:1 B4:1 A4:1 G4:2 A4:.5 B4:.5 C5:1 B4:1 A4:1 G4:1 A4:1 B4:1 C5:1 G4:1 F4:1 E4:2 E4:.5 D4:.5 C4:1.5 D4:.5 E4:.5 F4:.5 G4:2 A4:.5 B4:.5 C5:1 B4:1 A4:1 G4:2 A4:.5 B4:.5 C5:1 B4:1 A4:1 G4:1 A4:1 B4:1 C5:1 G4:1 F4:1 E4:2",
    ch:"C|C|F:1 G:2|C|F:1 G:2|G|C:1 G:2|C|C|C|F:1 G:2|C|F:1 G:2|G|C:1 G:2|C:2" },

  // ---------- Airs du monde ----------
  { id:"saints", t:["When the Saints Go Marching In","When the Saints Go Marching In"], by:"trad", from:"us", d:"XIXe s.", c:"world", o:"medal", k:"#a3306b", bpm:120, m:[4,4], p:3,
    mel:"C4:1 E4:1 F4:1 G4:4 R:1 C4:1 E4:1 F4:1 G4:4 R:1 C4:1 E4:1 F4:1 G4:2 E4:2 C4:2 E4:2 D4:4 R:1 E4:1 E4:1 D4:1 C4:3 C4:1 E4:2 G4:2 G4:1 F4:3 R:1 C4:1 E4:1 F4:1 G4:2 E4:2 C4:2 D4:2 C4:4",
    ch:"C|C|C|C|C|C|G|G|C|C|F|F|C|C G|C" },
  { id:"yankee", t:["Yankee Doodle","Yankee Doodle"], by:"trad", from:"us", d:"XVIIIe s.", c:"world", o:"compass", k:"#2c56d6", bpm:120, m:[4,4],
    mel:"F4:1 F4:1 G4:1 A4:1 F4:1 A4:1 G4:1 C4:1 F4:1 F4:1 G4:1 A4:1 F4:2 E4:2 F4:1 F4:1 G4:1 A4:1 A#4:1 A4:1 G4:1 F4:1 E4:1 C4:1 D4:1 E4:1 F4:2 F4:2",
    ch:"F|F C|F|F C|F|Bb C|C|F" },
  { id:"susanna", t:["Oh! Susanna","Oh! Susanna"], by:"S. Foster", d:"1848", c:"world", o:"guitar", k:"#b4461a", bpm:112, m:[4,4], p:1,
    mel:"C4:.5 D4:.5 E4:1 G4:1 G4:1.5 A4:.5 G4:1 E4:1 C4:1.5 D4:.5 E4:1 E4:1 D4:1 C4:1 D4:3 C4:.5 D4:.5 E4:1 G4:1 G4:1.5 A4:.5 G4:1 E4:1 C4:1.5 D4:.5 E4:1 E4:1 D4:1 D4:1 C4:3",
    ch:"C|C|C|G|C|C|C G|C:3" },
  { id:"greensleeves", t:["Greensleeves","Greensleeves"], by:"trad", from:"gb", d:"XVIe s.", c:"world", o:"leaf", k:"#1f7a52", bpm:96, m:[3,4], p:1,
    mel:"A4:1 C5:2 D5:1 E5:1.5 F5:.5 E5:1 D5:2 B4:1 G4:1.5 A4:.5 B4:1 C5:2 A4:1 A4:1.5 G#4:.5 A4:1 B4:2 G#4:1 E4:2 A4:1 C5:2 D5:1 E5:1.5 F5:.5 E5:1 D5:2 B4:1 G4:1.5 A4:.5 B4:1 C5:1.5 B4:.5 A4:1 G#4:1.5 F#4:.5 G#4:1 A4:3 G5:3 G5:1.5 F#5:.5 E5:1 D5:2 B4:1 G4:1.5 A4:.5 B4:1 C5:2 A4:1 A4:1.5 G#4:.5 A4:1 B4:2 G#4:1 E4:3 G5:3 G5:1.5 F#5:.5 E5:1 D5:2 B4:1 G4:1.5 A4:.5 B4:1 C5:1.5 B4:.5 A4:1 G#4:1.5 F#4:.5 G#4:1 A4:3",
    ch:"Am|C|G|Em|Am|Am|E|E|Am|C|G|Em|Am|E|Am|C|Em|G|Em|Am|Am|E|E|C|Em|G|Em|Am|E|Am" },
  { id:"korobeiniki", t:["Korobeïniki","Korobeiniki"], by:"trad", from:"ru", d:"1861", c:"world", o:"castle", k:"#c9463c", bpm:120, m:[4,4],
    mel:"E5:1 B4:.5 C5:.5 D5:1 C5:.5 B4:.5 A4:1 A4:.5 C5:.5 E5:1 D5:.5 C5:.5 B4:1.5 C5:.5 D5:1 E5:1 C5:1 A4:1 A4:2 R:.5 D5:1 F5:.5 A5:1 G5:.5 F5:.5 E5:1.5 C5:.5 E5:1 D5:.5 C5:.5 B4:1 B4:.5 C5:.5 D5:1 E5:1 C5:1 A4:1 A4:2",
    ch:"Am E|Am|E|Am|Dm|C|E|Am" },
  { id:"amazing", t:["Amazing Grace","Amazing Grace"], by:"trad", from:"us", d:"1829", c:"world", o:"sun", k:"#6a3fd1", bpm:84, m:[3,4], p:1,
    mel:"C4:1 F4:2 A4:.5 F4:.5 A4:2 G4:1 F4:2 D4:1 C4:2 C4:1 F4:2 A4:.5 F4:.5 A4:2 G4:1 C5:3 C5:2 A4:1 C5:2 A4:.5 F4:.5 A4:2 G4:1 F4:2 D4:1 C4:2 C4:1 F4:2 A4:.5 F4:.5 A4:2 G4:1 F4:2",
    ch:"F|F|Bb|F|F|F|C|F|F|F|Bb|F|F|C|F:2" },
  { id:"auld", t:["Auld Lang Syne","Auld Lang Syne"], by:"trad", from:"sc", d:"1788", c:"world", o:"heart", k:"#0e7490", bpm:88, m:[4,4], p:1,
    mel:"C4:1 F4:1.5 F4:.5 F4:1 A4:1 G4:1.5 F4:.5 G4:1 A4:1 F4:1.5 F4:.5 A4:1 C5:1 D5:3 D5:1 C5:1.5 A4:.5 A4:1 F4:1 G4:1.5 F4:.5 G4:1 A4:1 F4:1.5 D4:.5 D4:1 C4:1 F4:3",
    ch:"F|C|F|Bb|F|C|Dm C|F:3" },
  ];
  // ----- helpers shared by both pages -----
  const LETTER = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
  const toMidi = n => { const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) throw new Error("bad note " + n); return 12 * (+m[3] + 1) + LETTER[m[1]] + (m[2] ? 1 : 0); };
  const per = s => { const m = s.m || [4, 4]; return m[0] * 4 / m[1]; };
  // melody tokens → [{m, s, d, name}] (rests skipped, start s in quarter notes)
  function parseSeq(seq) { let b = 0; const out = []; for (const tok of seq.trim().split(/\s+/)) { const [n, d] = tok.split(":"); const dur = parseFloat(d); if (!(dur > 0)) throw new Error("bad duration " + tok); if (n !== "R") out.push({ name: n, m: toMidi(n), s: b, d: dur }); b += dur; } return { notes: out, len: b }; }
  // chord symbol → {root pc, minor}
  function chordOf(sym) { const m = /^([A-G])([#b]?)(m?)(7?)$/.exec(sym); if (!m) throw new Error("bad chord " + sym); return { pc: (LETTER[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? 11 : 0)) % 12, minor: !!m[3], sev: !!m[4], sym }; }
  // chord chart → [{s, d, chord}]
  function parseChart(s) { if (!s.ch) return []; const P = per(s); let t = s.p || 0; const out = [];
    s.ch.split("|").forEach(bar => { const toks = bar.trim().split(/\s+/); const fixed = toks.filter(x => x.includes(":")); let left = P;
      const items = toks.map(x => { const [c, d] = x.split(":"); return { c, d: d ? parseFloat(d) : null }; });
      const exp = items.filter(x => x.d != null).reduce((a, x) => a + x.d, 0); const free = items.filter(x => x.d == null).length;
      items.forEach(x => { const d = x.d != null ? x.d : (P - exp) / free; out.push({ s: t, d, chord: chordOf(x.c) }); t += d; left -= d; }); });
    return out; }
  // chord tones placed in the octave C3..B3 (MIDI 48..59), so the left hand never meets the melody (which stays at C4 or above)
  const low = pc => 48 + ((pc % 12) + 12) % 12;
  function leftHand(s, lvl) { const segs = parseChart(s), out = []; const m = s.m || [4, 4];
    segs.forEach(({ s: t, d, chord }) => { const r = chord.pc, th = (r + (chord.minor ? 3 : 4)) % 12, fi = (r + 7) % 12;
      if (lvl === 2) { out.push({ m: low(r), s: t, d }); return; }
      // level 3: a pattern that depends on the meter
      const push = (k, dd, pcs) => pcs.forEach(pc => out.push({ m: low(pc), s: t + k, d: dd }));
      if (m[0] === 4 && m[1] === 4 && Math.abs(d - 4) < 1e-6) { push(0, 1, [r]); push(1, 1, [fi]); push(2, 1, [th]); push(3, 1, [fi]); }
      else if (m[0] === 4 && Math.abs(d - 2) < 1e-6) { push(0, 1, [r]); push(1, 1, [fi]); }
      else if (m[0] === 3 && m[1] === 4 && Math.abs(d - 3) < 1e-6) { push(0, 1, [r]); push(1, 1, [th, fi]); push(2, 1, [th, fi]); }
      else if (m[0] === 6 && m[1] === 8 && Math.abs(d - 3) < 1e-6) { push(0, 1, [r]); push(1, .5, [th]); push(1.5, 1, [fi]); push(2.5, .5, [th]); }
      else if (Math.abs(d - Math.round(d)) < 1e-6 && d >= 2) { push(0, 1, [r]); for (let k = 1; k < d; k++) push(k, 1, [th, fi]); }
      else out.push({ m: low(r), s: t, d }); });
    return out; }
  // arrangements of a song: [{lv, key, hands}] (key = id for the first one, keeps the old stars)
  function arrs(s) { const L = s.ch ? (s.lv || [1, 2, 3]) : [s.solo || 1]; return L.map((lv, i) => ({ lv, key: i ? s.id + "@" + lv : s.id, hands: s.ch && lv > 1 ? 2 : 1 })); }
  // notes of an arrangement, sorted by time then pitch; h = 1 right hand, 2 left hand
  function build(s, lv) { const mel = parseSeq(s.mel).notes.map(n => ({ m: n.m, s: n.s, d: n.d, h: 1, name: n.name }));
    const lh = s.ch && lv > 1 ? leftHand(s, lv).map(n => ({ ...n, h: 2 })) : [];
    return mel.concat(lh).sort((a, b) => a.s - b.s || a.m - b.m); }
  G.PC_SONGS = SONGS;
  G.PC_SONG = { list: SONGS, toMidi, parseSeq, parseChart, leftHand, arrs, build, per, chordOf,
    COLL: ["first", "classic", "xmas", "world"] };
})(typeof window !== "undefined" ? window : globalThis);
