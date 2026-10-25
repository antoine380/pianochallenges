#!/bin/bash
# Piano Challenges — catalogue libre : convertit les sources LilyPond de Mutopia en MIDI, hors ligne.
# LilyPond 2.24 n'a plus de mode sûr : chaque fichier est compilé dans un bac à sable bubblewrap
# (système en lecture seule, aucun réseau, seul le dossier de travail de la pièce est inscriptible).
# Usage : tools/catalog/render_mutopia.sh <liste.tsv : id<TAB>chemin .ly> <racine ftp Mutopia> <dossier de sortie>
set -u
LIST=$1; SRC=$2; OUT=$3; mkdir -p "$OUT"
while IFS=$'\t' read -r id rel; do
  [ -s "$OUT/$id.midi" ] && continue
  d=$(dirname "$rel"); f=$(basename "$rel"); W=$(mktemp -d "$OUT/w.XXXX")
  cp -r "$SRC/$d/." "$W/" 2>/dev/null
  # parent folder too (some pieces include a shared file one level up)
  P=$(dirname "$d"); mkdir -p "$W/_up"; cp "$SRC/$P"/*.ily "$SRC/$P"/*.ly "$W/_up/" 2>/dev/null
  bwrap --ro-bind /usr /usr --symlink usr/lib /lib --symlink usr/lib64 /lib64 --symlink usr/bin /bin \
    --ro-bind /etc/fonts /etc/fonts --ro-bind /etc/alternatives /etc/alternatives --proc /proc --dev /dev --tmpfs /tmp --bind "$W" /w --chdir /w \
    --unshare-all --die-with-parent --clearenv --setenv HOME /w --setenv PATH /usr/bin \
    sh -c "timeout 60 convert-ly -e '$f' >/dev/null 2>&1; sed -i 's/Engraver_group_engraver/Engraver_group/g' '$f'; timeout 120 lilypond -dno-print-pages -dmidi-extension=midi --loglevel=ERROR -o out '$f' >/w/log.txt 2>&1"
  m=$(ls "$W"/out*.midi 2>/dev/null | head -1)
  if [ -n "$m" ]; then cp "$m" "$OUT/$id.midi"; n=$(ls "$W"/out*.midi | wc -l); [ "$n" -gt 1 ] && echo "$id multi $n" >> "$OUT/_multi.txt"; else echo "$id" >> "$OUT/_fail.txt"; tail -3 "$W/log.txt" > "$OUT/$id.err"; fi
  rm -rf "$W"
done < "$LIST"
echo done
