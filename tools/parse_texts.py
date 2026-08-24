"""Parse the original DISCLOG TXT files into dist/data/content.json"""
import os, re, json, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEXT = os.path.join(ROOT, "text"); PHOTOS = os.path.join(ROOT, "photos"); VIDEO = os.path.join(ROOT, "Video")
LANGS = {"english":"en","italiano":"it","espanol":"es","francais":"fr","deutch":"de"}
GOSPELS = ["mt","mk","lk","jn"]

# Place metadata: code -> (english name, video code). Order = alphabetical by code (the disc's chronological order).
PLACES = {
 "AN": ("Nazareth", "H30"),
 "BK": ("Ein Karem", None),
 "CB": ("Bethlehem", "H10"),
 "DJ": ("Jordan River & Jericho", "H20"),
 "EC": ("Cana of Galilee", "H60"),
 "FT": ("Mount Tabor", "H51"),
 "GN": ("Nain", "H50"),
 "HK": ("Capernaum", "H41"),
 "KB": ("Mount of the Beatitudes", "H42"),
 "LT": ("Tabgha", "H40"),
 "MO": ("Mount of Olives & Bethany", "H01"),
 "NZ": ("Jerusalem - Gethsemane & Mount Zion", "H00"),
 "OV": ("Via Dolorosa", None),
 "UE": ("Emmaus", None),
 "VK": ("Church of the Holy Sepulchre", "H02"),
 "WT": ("Tabgha - Lake Shore", None),
 "XA": ("Mount of Olives - The Ascension", None),
 "YD": ("Dormition Abbey", None),
 "ZD": ("Mount of Olives - St. Mary's Church", None),
}
# video code -> order on the Videos tab; titles are taken from the mapped place (5 languages)
VIDEO_ORDER = ["INTRO", "H00", "H01", "H02", "H10", "H20", "H30", "H40", "H41", "H42", "H50", "H51", "H60"]
INTRO_TITLE = {"en": "Introduction", "it": "Introduzione", "es": "Introducción", "fr": "Introduction", "de": "Einführung"}
VLANG = {"ENG":"en","ITA":"it","ESP":"es","FRA":"fr","DEU":"de"}

def read(path):
    raw = open(path, "rb").read()
    return raw.decode("cp1252", errors="replace").replace("\r\n", "\n").replace("\r", "\n")

def parse_file(path, warnings):
    s = read(path); code = os.path.basename(path).split(".")[0].upper()
    doc = {"code": code, "bible": {}, "title": {}, "text": {}}
    m = re.search(r"#BIBLE#[ \t]*\n(.*?)#end_BIBLE#", s, re.S)
    lines = [l.strip() for l in m.group(1).split("\n")] if m else []
    lines = [l for l in lines if l != ""]
    if len(lines) != 4: warnings.append(f"{code}: bible block has {len(lines)} lines")
    for g, l in zip(GOSPELS, lines + ["NONE"]*4):
        doc["bible"][g] = None if l.upper() == "NONE" else l
    for name, lang in LANGS.items():
        m = re.search(rf"#{name}#\n?(.*?)#end_{name}#", s, re.S)
        if not m:
            warnings.append(f"{code}: missing {name}"); doc["title"][lang] = ""; doc["text"][lang] = ""; continue
        body = m.group(1).strip("\n")
        parts = body.split("\n", 1)
        title = parts[0].strip()
        text = parts[1].strip() if len(parts) > 1 else ""
        text = re.sub(r"[ \t]+\n", "\n", text)
        doc["title"][lang] = title; doc["text"][lang] = text
        if not title: warnings.append(f"{code}: empty {lang} title")
    return doc

def main():
    warnings = []
    photos_on_disk = {f.split(".")[0].upper(): f for f in os.listdir(PHOTOS) if f.lower().endswith(".bmp")}
    photos = []
    for path in sorted(glob.glob(os.path.join(TEXT, "*.TXT"))):
        d = parse_file(path, warnings)
        place = d["code"][:2]
        if place not in PLACES: warnings.append(f"{d['code']}: unknown place prefix"); continue
        d["place"] = place.lower(); d["order"] = int(d["code"][2:])
        d["image"] = f"photos/{d['code']}.jpg"; d["thumb"] = f"photos/thumbs/{d['code']}.jpg"
        d["sourceBmp"] = photos_on_disk.get(d["code"])
        if not d["sourceBmp"]: warnings.append(f"{d['code']}: no photo on disk")
        photos.append(d)
    for code in photos_on_disk:
        if code != "THUMBS" and not any(p["code"] == code for p in photos): warnings.append(f"{code}: photo without text")
    places = []
    for i, (code, (name, vid)) in enumerate(sorted(PLACES.items()), start=1):
        mine = [p for p in photos if p["place"] == code.lower()]
        title = {}
        for lang in LANGS.values():
            # use the shortest common title prefix of the photos (before ' - ') as place title per language
            first = next((p["title"][lang] for p in mine if p["title"][lang]), name)
            title[lang] = re.split(r"\s+[-–]\s+|\s*\(\d+\)\s*$", first)[0].strip() or name
        title["en"] = name
        places.append({"code": code.lower(), "order": i, "title": title, "videoCode": vid,
                       "coverPhoto": mine[0]["code"] if mine else None, "photoCount": len(mine)})
    videos = []
    vfiles = os.listdir(VIDEO)
    for i, vc in enumerate(VIDEO_ORDER):
        files = {}
        for f in vfiles:
            m = re.match(rf"{vc}(ENG|ITA|ESP|FRA|DEU)\.MPG$", f, re.I)
            if m: files[VLANG[m.group(1).upper()]] = f"videos/{vc}{m.group(1).upper()}.mp4"
        if len(files) != 5: warnings.append(f"video {vc}: {len(files)} language files")
        vplaces = [p["code"] for p in places if p["videoCode"] == vc]
        title = INTRO_TITLE if vc == "INTRO" else next((p["title"] for p in places if p["code"] == vplaces[0]), {"en": vc}) if vplaces else {"en": vc}
        videos.append({"code": vc, "order": i, "title": dict(title),
                       "places": vplaces, "files": files, "sourceMpg": {l: f.replace("videos/","").replace(".mp4",".MPG") for l,f in files.items()}})
    out = {"languages": [{"code":"en","name":"English"},{"code":"it","name":"Italiano"},{"code":"es","name":"Español"},{"code":"fr","name":"Français"},{"code":"de","name":"Deutsch"}],
           "places": places, "photos": photos, "videos": videos}
    dst = os.path.join(ROOT, "dist", "data", "content.json")
    json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"places={len(places)} photos={len(photos)} videos={len(videos)} -> {dst}")
    for w in warnings: print("WARN", w)

if __name__ == "__main__": main()
