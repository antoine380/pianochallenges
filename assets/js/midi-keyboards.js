/* Piano Challenges — catalogue des claviers MIDI (chargé à la demande par mkcLoad()).
   Champs affichés : marque (b), modèle (m), nombre de touches (k), connexion MIDI (c : "usb" = câble USB, "bt" = Bluetooth MIDI intégré ou adaptateur fourni,
   "din" = prises MIDI rondes seulement ; tableau vide = non vérifié).
   Champs internes (jamais affichés) : a = noms de port MIDI connus / alias pour la détection automatique, mini = mini-touches (dessin), g = forme du dessin
   (p piano numérique, s synthé / piano de scène, c contrôleur, P contrôleur à pads, a arrangeur, l clavier lumineux).
   « Bluetooth » ne veut dire que le Bluetooth MIDI : un piano qui ne diffuse que de l'audio en Bluetooth est noté USB seulement.
   Sources (fabricants d'abord, puis revendeurs) : tools/midi-catalogue/SOURCES.md. Vérifié le 25/10/2026. Les noms sont ceux des fabricants (usage nominatif), aucun logo ni photo. */
(function(){
var L=[];
// add(marque, forme, connexion "u"|"b"|"ub"|"d"|"", touches, "Modèle 1|Modèle 2|…", options {mini, a:[alias communs]})
function add(b,g,c,k,models,o){ o=o||{}; models.split("|").forEach(function(m){ var al=(o.a||[]).slice(); var x=m.split("~"); m=x[0]; if(x[1]) al=al.concat(x[1].split(";"));
  L.push({b:b, m:m, k:k, c:c==="ub"?["usb","bt"]:c==="u"?["usb"]:c==="b"?["bt"]:c==="d"?["din"]:[], a:al, mini:!!o.mini, g:g}); }); }

/* ---------- Yamaha ---------- (port USB des pianos P / Arius : « Digital Piano », des claviers PSR / EZ : « Digital Keyboard », des Clavinova : « Clavinova ») */
add("Yamaha","p","u",88,"P-45|P-71|P-125|P-125a|P-143|P-145|P-225|P-515|P-S500",{a:["Digital Piano"]});
add("Yamaha","p","u",73,"P-121",{a:["Digital Piano"]});
add("Yamaha","p","ub",88,"P-525",{a:["Digital Piano"]});
add("Yamaha","p","u",88,"DGX-660|DGX-670",{a:["Digital Keyboard"]});
add("Yamaha","p","u",61,"NP-12|NP-15",{a:["Digital Keyboard"]});
add("Yamaha","p","u",76,"NP-32|NP-35",{a:["Digital Keyboard"]});
add("Yamaha","p","u",88,"YDP-144|YDP-145|YDP-146|YDP-164|YDP-165|YDP-166|YDP-S35|YDP-S36|YDP-S55|YDP-S56",{a:["Digital Piano"]});
add("Yamaha","p","u",88,"CLP-725|CLP-735|CLP-745|CLP-775|CLP-825|CLP-835|CLP-845",{a:["Clavinova"]});
add("Yamaha","p","u",88,"N-1X AvantGrand");
add("Yamaha","s","u",61,"CK61|YC61|MODX6|MODX6+|MONTAGE M6");
add("Yamaha","s","u",73,"YC73|CP73");
add("Yamaha","s","u",76,"CK76|MODX7|MODX7+|MONTAGE M7");
add("Yamaha","s","u",88,"CK88|YC88|CP88|MODX8|MODX8+|MONTAGE M8x");
add("Yamaha","a","u",76,"Genos2");
add("Yamaha","a","u",61,"PSR-SX600|PSR-SX620|PSR-SX700|PSR-SX900|PSR-SX920|PSR-E373|PSR-E383|PSR-E473|PSR-E483|PSR-E583",{a:["Digital Keyboard"]});
add("Yamaha","a","u",76,"PSR-EW310|PSR-EW320|PSR-EW410|PSR-EW425",{a:["Digital Keyboard"]});
add("Yamaha","l","u",61,"EZ-300|EZ-310",{a:["Digital Keyboard"]});
add("Yamaha","a","u",37,"PSS-A50",{mini:true});
add("Yamaha","s","u",37,"reface CP|reface DX|reface YC|reface CS",{mini:true});

/* ---------- Roland ---------- */
add("Roland","p","ub",88,"FP-10|FP-30|FP-30X|FP-40|FP-60|FP-60X|FP-90|FP-90X|FP-E50|GO:PIANO88~GO-88P|HP702|HP704|LX705|LX706|LX708|RP107|RP701|F701");
add("Roland","a","ub",61,"GO:KEYS~GO-61K|GO:PIANO~GO-61P|GO:KEYS 3|GO:KEYS 5");
add("Roland","s","u",88,"RD-88|RD-88 EX|RD-2000|RD-2000 EX|JUNO-DS88|FANTOM-08|FANTOM-8~FANTOM-8 EX");
add("Roland","s","u",76,"FANTOM-07|FANTOM-7~FANTOM-7 EX");
add("Roland","s","u",61,"JUNO-DS61|JUNO-X|FANTOM-06|FANTOM-6~FANTOM-6 EX|JUPITER-X");
add("Roland","s","u",49,"JD-XA");
add("Roland","s","u",37,"JD-Xi",{mini:true});
add("Roland","c","u",49,"A-49");
add("Roland","c","u",88,"A-88MKII~A-88MK2");

/* ---------- Korg ---------- */
add("Korg","c","ub",25,"microKEY Air 25~microKEY Air;microKEY2 Air;microKEY-25 Air",{mini:true});
add("Korg","c","ub",37,"microKEY Air 37~microKEY Air;microKEY2 Air;microKEY-37 Air",{mini:true});
add("Korg","c","ub",49,"microKEY Air 49~microKEY Air;microKEY2 Air;microKEY-49 Air",{mini:true});
add("Korg","c","ub",61,"microKEY Air 61~microKEY Air;microKEY2 Air;microKEY-61 Air",{mini:true});
add("Korg","c","u",25,"microKEY 25~microKEY2;microKEY-25",{mini:true});
add("Korg","c","u",37,"microKEY 37~microKEY2;microKEY-37",{mini:true});
add("Korg","c","u",49,"microKEY 49~microKEY2;microKEY-49",{mini:true});
add("Korg","c","u",61,"microKEY 61~microKEY2;microKEY-61",{mini:true});
add("Korg","c","u",25,"nanoKEY2~nanoKEY|nanoKEY Fold",{mini:true});
add("Korg","P","ub",25,"nanoKEY Studio",{mini:true});
add("Korg","c","u",49,"Keystage 49~Keystage");
add("Korg","c","u",61,"Keystage 61~Keystage");
add("Korg","p","u",88,"B2|B2N|B2SP|B2+|LP-380U|G1 Air|C1 Air|D1|Liano");
add("Korg","s","u",88,"SV-2 88|Grandstage 88|Kross 2-88|Krome EX 88|Kronos 88|Nautilus 88");
add("Korg","s","u",73,"SV-2 73|Grandstage 73|Krome EX 73|Kronos 73|Nautilus 73");
add("Korg","s","u",61,"Kross 2-61|Krome EX 61|Kronos 61|Nautilus 61|prologue 16|i3");
add("Korg","s","u",49,"prologue 8");
add("Korg","s","u",37,"minilogue|minilogue xd|opsix|wavestate|modwave");
add("Korg","s","u",37,"microKORG 2|MS-20 mini",{mini:true});
add("Korg","s","u",25,"monologue",{mini:true});
add("Korg","a","u",61,"EK-50|Pa700|Pa1000|Pa5X 61");

/* ---------- Casio ---------- (port USB : « CASIO USB-MIDI ») */
var CA={a:["CASIO USB-MIDI"]};
add("Casio","a","u",61,"CT-S1|CT-S100|CT-S200|CT-S300|CT-S400|CT-S410|CT-S500|CT-S1000V|CT-X700|CT-X800|CT-X3000|CT-X5000",CA);
add("Casio","a","u",76,"CT-S1-76",CA);
add("Casio","l","u",61,"LK-S250|LK-S450",CA);
add("Casio","p","u",88,"CDP-S100|CDP-S110|CDP-S150|CDP-S160|CDP-S350|CDP-S360|PX-S1000|PX-S3000|PX-160|PX-770|PX-870|AP-270|AP-470|AP-S450|AP-550|AP-750",CA);
add("Casio","p","ub",88,"PX-S1100|PX-S5000|PX-S6000|PX-S7000",CA);

/* ---------- Kawai ---------- */
add("Kawai","p","ub",88,"ES110|ES120|ES520|ES920|KDP120|CN29|CN39|CN201|CN301|CA401|CA501|CA701|CA901");
add("Kawai","p","u",88,"ES8|KDP75|CA49|CA59|CA79|CA99|MP7SE|MP11SE");
add("Kawai","c","u",88,"VPC1");

/* ---------- Nord (Clavia) ---------- */
add("Nord","s","u",88,"Piano 4|Piano 5 88|Piano 6 88|Stage 3 88|Stage 4 88|Grand|Grand 2");
add("Nord","s","u",73,"Piano 5 73|Stage 3 Compact|Stage 4 73|Stage 4 Compact|Electro 6D 73|Electro 6HP|Electro 7 73");
add("Nord","s","u",76,"Stage 3 76");
add("Nord","s","u",61,"Electro 6D 61|Electro 7 61|Wave 2");
add("Nord","s","u",49,"Lead A1|Lead 4");

/* ---------- Arturia ---------- */
add("Arturia","P","u",25,"MiniLab 3~Minilab3|MiniLab MkII~MiniLab mkII",{mini:true});
add("Arturia","P","u",37,"MiniLab 37",{mini:true});
add("Arturia","c","u",25,"MicroLab|MicroLab mk3",{mini:true});
add("Arturia","P","u",49,"KeyLab Essential 49|KeyLab Essential 49 mk3|KeyLab 49 MkII|KeyLab 49 mk3");
add("Arturia","P","u",61,"KeyLab Essential 61|KeyLab Essential 61 mk3|KeyLab 61 MkII|KeyLab 61 mk3");
add("Arturia","P","u",88,"KeyLab Essential 88|KeyLab Essential 88 mk3|KeyLab 88 MkII|KeyLab 88 mk3");
add("Arturia","c","u",32,"KeyStep|KeyStep mk2",{mini:true});
add("Arturia","c","u",37,"KeyStep 37|KeyStep 37 mk2|KeyStep Pro",{mini:true});
add("Arturia","s","u",25,"MicroFreak|MicroBrute",{mini:true});
add("Arturia","s","u",37,"MiniFreak",{mini:true});
add("Arturia","s","u",37,"AstroLab 37");
add("Arturia","s","u",61,"AstroLab 61~AstroLab|PolyBrute|PolyBrute 12");
add("Arturia","s","u",88,"AstroLab 88");
add("Arturia","s","u",49,"MatrixBrute");

/* ---------- Native Instruments ---------- (port : « KOMPLETE KONTROL … ») */
add("Native Instruments","c","u",25,"Komplete Kontrol A25~KOMPLETE KONTROL A25");
add("Native Instruments","c","u",49,"Komplete Kontrol A49~KOMPLETE KONTROL A49|Komplete Kontrol S49 MK2~KOMPLETE KONTROL S49 MK2|Kontrol S49 MK3~KONTROL S49 MK3");
add("Native Instruments","c","u",61,"Komplete Kontrol A61~KOMPLETE KONTROL A61|Komplete Kontrol S61 MK2~KOMPLETE KONTROL S61 MK2|Kontrol S61 MK3~KONTROL S61 MK3");
add("Native Instruments","c","u",88,"Komplete Kontrol S88 MK2~KOMPLETE KONTROL S88 MK2|Kontrol S88 MK3~KONTROL S88 MK3");
add("Native Instruments","c","u",32,"Komplete Kontrol M32~KOMPLETE KONTROL M32",{mini:true});

/* ---------- Novation ---------- */
add("Novation","P","u",25,"Launchkey Mini MK3~Launchkey Mini MK3 MIDI|Launchkey Mini 25 MK4|FLkey Mini|FLkey 2 Mini 25",{mini:true});
add("Novation","P","u",37,"Launchkey Mini 37 MK4",{mini:true});
add("Novation","P","u",25,"Launchkey 25 MK3|Launchkey 25 MK4|Impulse 25");
add("Novation","P","u",37,"Launchkey 37 MK3|Launchkey 37 MK4|FLkey 37|FLkey 2 37");
add("Novation","P","u",49,"Launchkey 49 MK3|Launchkey 49 MK4|FLkey 49|FLkey 2 49|Impulse 49|49SL MkIII");
add("Novation","P","u",61,"Launchkey 61 MK3|Launchkey 61 MK4|FLkey 61|FLkey 2 61|Impulse 61|61SL MkIII");
add("Novation","P","u",88,"Launchkey 88 MK3~Launchkey 88|Launchkey 88 MK4");
add("Novation","s","u",25,"Bass Station II");
add("Novation","s","u",61,"Summit");
var i; for(i=0;i<L.length;i++) if(L[i].b==="Novation"&&/MK3$/.test(L[i].m)&&!/Mini/.test(L[i].m)) L[i].a.push("LKMK3");

/* ---------- M-Audio ---------- */
add("M-Audio","c","u",32,"Keystation Mini 32 MK3|Oxygen Pro Mini",{mini:true});
add("M-Audio","c","u",49,"Keystation 49 MK3");
add("M-Audio","c","u",61,"Keystation 61 MK3");
add("M-Audio","c","u",88,"Keystation 88 MK3|Keystation 88 II|Hammer 88|Hammer 88 Pro");
add("M-Audio","P","u",25,"Oxygen 25 MK5|Oxygen Pro 25");
add("M-Audio","P","u",49,"Oxygen 49 MK5|Oxygen Pro 49");
add("M-Audio","P","u",61,"Oxygen 61 MK5|Oxygen Pro 61");

/* ---------- Akai Professional ---------- */
add("Akai Professional","P","u",25,"MPK Mini MK3~MPK mini 3|MPK Mini MK2~MPK Mini Mk II;MPKmini2|MPK Mini IV~MPK mini IV|MPK Mini Play MK3~MPK mini Play mk3|APC Key 25 MK2",{mini:true});
add("Akai Professional","P","u",37,"MPK Mini Plus~MPK mini Plus",{mini:true});
add("Akai Professional","c","u",25,"LPK25 MKII~LPK25",{mini:true});
add("Akai Professional","c","ub",25,"LPK25 Wireless",{mini:true});
add("Akai Professional","P","u",25,"MPK225");
add("Akai Professional","P","u",37,"MPC Key 37");
add("Akai Professional","P","u",49,"MPK249");
add("Akai Professional","P","u",61,"MPK261|MPC Key 61");
add("Akai Professional","c","u",88,"MPK Road 88");

/* ---------- Alesis ---------- */
add("Alesis","P","u",25,"V25 MKII|V Mini|VI25",{});
add("Alesis","P","u",49,"V49 MKII|VI49");
add("Alesis","P","u",61,"V61 MKII|VI61");
add("Alesis","c","u",25,"Q25");
add("Alesis","c","u",49,"Q49 MKII");
add("Alesis","c","u",88,"Q88 MKII");
add("Alesis","P","u",37,"Vortex Wireless 2");
add("Alesis","p","u",88,"Recital|Recital Pro|Prestige|Prestige Artist|Virtue|Concert");
for(i=0;i<L.length;i++) if(L[i].b==="Alesis"&&L[i].m==="V Mini") L[i].mini=true;

/* ---------- ROLI / LUMI ---------- */
add("ROLI","l","ub",24,"LUMI Keys Studio Edition|LUMI Keys 1~LUMI Keys BLOCK;LUMI Keys|Piano M~ROLI Piano M");
add("ROLI","l","ub",49,"Piano~ROLI Piano");
add("ROLI","c","ub",49,"Seaboard RISE 2~Seaboard RISE 2|Seaboard RISE 49");
add("ROLI","c","ub",25,"Seaboard RISE 25");
add("ROLI","c","ub",24,"Seaboard Block|Seaboard Block M");

/* ---------- Nektar ---------- */
add("Nektar","c","u",25,"Impact LX25+|Impact LX25 mk3|SE25");
add("Nektar","c","u",32,"Impact GX Mini|Impact LX Mini",{mini:true});
add("Nektar","c","u",49,"Impact LX49+|Impact GX49|Impact GXP49|SE49|Panorama T4|Panorama P4");
add("Nektar","c","u",61,"Impact LX61+|Impact LX61 mk3|Impact GX61|Impact GXP61|SE61|Panorama T6|Panorama P6");
add("Nektar","c","u",88,"Impact LX88+|Impact LX88 mk3|Impact GXP88");
for(i=0;i<L.length;i++) if(L[i].b==="Nektar"&&L[i].m==="SE25") L[i].mini=true;

/* ---------- Studiologic (claviers Fatar) ---------- */
add("Studiologic","c","u",88,"SL88 Studio|SL88 Grand|SL88 mk2|SL88 GT mk2");
add("Studiologic","c","u",73,"SL73 Studio");
add("Studiologic","s","u",88,"Numa Compact 2|Numa Compact 2x|Numa X Piano 88|Numa X Piano GT|Numa Stage|Numa Concert");
add("Studiologic","s","u",73,"Numa X Piano 73|Numa Organ 2");
add("Studiologic","s","u",61,"Sledge 2.0");

/* ---------- Kurzweil ---------- */
add("Kurzweil","p","u",88,"KA90|SP1|SP6|SP7 Grand|PC4|Forte|Forte SE|K2700|K2088");
add("Kurzweil","s","u",76,"PC4-7|Forte 7");
add("Kurzweil","s","u",61,"K2061|KA-E1");
for(i=0;i<L.length;i++) if(L[i].b==="Kurzweil"&&/^(SP|PC|Forte|K2)/.test(L[i].m)) L[i].g="s";

/* ---------- Donner ---------- */
add("Donner","p","u",88,"DEP-20");
add("Donner","p","",88,"DEP-1|DEP-1S|DDP-60|DDP-80|DDP-80 Plus|DDP-100|DDP-200 Pro|DP-10|OURA S100");
add("Donner","P","u",25,"DMK-25 Pro|N-25",{mini:true});
add("Donner","P","u",32,"N-32",{mini:true});

/* ---------- Williams ---------- */
add("Williams","p","u",88,"Allegro IV|Legato IV");

/* ---------- Medeli ---------- */
add("Medeli","p","",88,"SP4200");

/* ---------- Behringer ---------- */
add("Behringer","s","u",32,"Swing|Pro VS Mini",{mini:true});
add("Behringer","s","u",32,"MS-1");
add("Behringer","s","u",37,"Poly D|MonoPoly|VC340");
add("Behringer","s","u",49,"DeepMind 12");
add("Behringer","s","u",61,"UB-Xa");
add("Behringer","c","u",25,"UMX250");
add("Behringer","c","u",49,"UMX490");
add("Behringer","c","u",61,"UMX610");

/* ---------- IK Multimedia ---------- */
add("IK Multimedia","c","u",25,"iRig Keys 2 Mini",{mini:true});
add("IK Multimedia","c","u",37,"iRig Keys 2",{mini:true});
add("IK Multimedia","c","u",37,"iRig Keys 2 Pro");
add("IK Multimedia","c","u",25,"iRig Keys I/O 25");
add("IK Multimedia","c","u",49,"iRig Keys I/O 49");

/* ---------- Keith McMillen (Muse Kinetics) ---------- */
add("Keith McMillen","c","u",25,"QuNexus|K-Board|K-Board C",{mini:true});

/* ---------- CME (Xkey, distribué aujourd'hui par ESI) ---------- */
add("CME","c","u",25,"Xkey 25");
add("CME","c","u",37,"Xkey 37");
add("CME","c","ub",25,"Xkey Air 25");
add("CME","c","ub",37,"Xkey Air 37");

/* ---------- Artesia ---------- */
add("Artesia","p","",88,"PA-88H|PA-88W|PE-88|Performer");

/* ---------- Dexibell ---------- */
add("Dexibell","s","b",73,"VIVO S4");
add("Dexibell","s","",73,"VIVO P3");

/* ---------- Waldorf ---------- */
add("Waldorf","s","u",61,"Quantum|Quantum MK2");
add("Waldorf","s","u",49,"Iridium Keyboard|Blofeld Keyboard");

/* ---------- Sequential ---------- */
add("Sequential","s","u",49,"Prophet-6|OB-6");
add("Sequential","s","u",61,"Prophet Rev2|Prophet-5|Prophet-10|Prophet X");
add("Sequential","s","u",44,"Take 5");

/* ---------- Moog ---------- */
add("Moog","s","u",37,"Subsequent 37|Sub 37");
add("Moog","s","u",25,"Subsequent 25");
add("Moog","s","u",32,"Grandmother|Messenger");
add("Moog","s","u",49,"Matriarch");
add("Moog","s","u",61,"Muse|Moog One");

/* ---------- Hammond ---------- */
add("Hammond","s","u",61,"XK-5|XK-4|SK1");
add("Hammond","s","u",73,"SK1-73");

/* ---------- Thomann (marque maison) ---------- */
add("Thomann","p","u",88,"SP-320");
add("Thomann","p","",88,"SP-120|DP-26|DP-28 Plus|DP-32|DP-33|DP-95|DP-140|DP-275 GP");

/* ---------- Midiplus ---------- */
add("Midiplus","c","u",25,"X2 mini",{mini:true});
add("Midiplus","c","u",32,"AKM320",{mini:true});
add("Midiplus","c","u",61,"X6 Max|X-6 III");
add("Midiplus","c","u",88,"X8 Max|X-8 III|Stage 88");

/* ---------- autres marques ---------- */
add("Reloop","P","u",25,"Keypad Pro");
add("Swissonic","c","u",25,"MiniKey 25",{mini:true});
add("Swissonic","c","u",49,"EasyKey 49");
add("Miditech","c","u",25,"Midistart Music 25");
add("Miditech","c","u",61,"i2-61");
add("Expressive E","c","u",49,"Osmose");
add("Nux","c","u",61,"NTK-61");

window.MIDI_KEYBOARDS={v:1, at:"2026-10-25", list:L};
})();
