"""Convert original BMP photos -> JPG (+thumbs) and MPG videos -> MP4 (H.264/AAC) into dist/media/"""
import os, sys, json, subprocess
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, "dist/data/content.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "dist", "media")
os.makedirs(os.path.join(OUT, "photos", "thumbs"), exist_ok=True); os.makedirs(os.path.join(OUT, "videos"), exist_ok=True)

def photos():
    for p in DATA["photos"]:
        if not p["sourceBmp"]: continue
        im = Image.open(os.path.join(ROOT, "photos", p["sourceBmp"])).convert("RGB")
        full = im.copy(); full.thumbnail((1600, 1600)); full.save(os.path.join(OUT, p["image"]), quality=86, optimize=True, progressive=True)
        th = im.copy(); th.thumbnail((480, 480)); th.save(os.path.join(OUT, p["thumb"]), quality=78, optimize=True)
    # disc covers
    for src, dst in [("cover_197.jpg", "cover.jpg"), ("back_19.jpg", "back.jpg")]:
        im = Image.open(os.path.join(ROOT, src)).convert("RGB"); im.thumbnail((1200, 1200)); im.save(os.path.join(OUT, dst), quality=84, optimize=True)
    n = len(os.listdir(os.path.join(OUT, "photos"))) - 1
    print(f"photos: {n} jpg + thumbs")

def videos():
    import imageio_ffmpeg
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    todo = [(v["sourceMpg"][l], v["files"][l]) for v in DATA["videos"] for l in v["files"]]
    for i, (src, dst) in enumerate(todo, 1):
        d = os.path.join(OUT, dst)
        if os.path.exists(d) and os.path.getsize(d) > 0: continue
        cmd = [ff, "-y", "-loglevel", "error", "-i", os.path.join(ROOT, "Video", src),
               "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p", "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2"]
        # The 1999 German narrations were recorded on the LEFT channel only -> duplicate it to both channels
        if "DEU" in src.upper(): cmd += ["-af", "pan=stereo|c0=c0|c1=c0"]
        cmd += ["-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", d]
        r = subprocess.run(cmd, capture_output=True, text=True)
        print(f"[{i}/{len(todo)}] {src} -> {dst} {'OK' if r.returncode==0 else 'FAIL '+r.stderr[-300:]}", flush=True)

if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("all", "photos"): photos()
    if what in ("all", "videos"): videos()
