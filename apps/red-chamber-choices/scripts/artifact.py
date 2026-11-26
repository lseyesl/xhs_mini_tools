"""Build the offline H5 files and package a verified ZIP."""
import hashlib
from html.parser import HTMLParser
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory
from zipfile import ZIP_DEFLATED, ZipFile

APP = Path(__file__).resolve().parents[1]
SKILL = APP.parents[1] / ".agents/skills/minitool-zip-builder"
FILES = (
    "index.html", "styles.css", "story-data.js", "story.js",
    "paper-pieces.js", "paper-world.js", "app.js",
    "assets/papercraft/rongguo-courtyard.webp", "assets/papercraft/flower-mound.webp",
    "assets/papercraft/xiaoxiang-rain.webp", "assets/papercraft/moon-pavilion.webp",
    "assets/papercraft/daiyu.webp", "assets/papercraft/matron.webp", "assets/papercraft/zijuan.webp",
    "assets/papercraft/baochai.webp", "assets/papercraft/xiangyun.webp",
    "assets/papercraft/garden-map-portrait.webp", "assets/papercraft/garden-map-landscape.webp",
    "assets/papercraft/garden-map-portrait-ground.webp", "assets/papercraft/garden-map-portrait-pieces.webp",
    "assets/papercraft/garden-map-landscape-ground.webp", "assets/papercraft/garden-map-landscape-pieces.webp",
    "assets/papercraft/garden-map-portrait-foundations.webp", "assets/papercraft/garden-map-portrait-paths.webp",
    "assets/papercraft/garden-map-landscape-foundations.webp", "assets/papercraft/garden-map-landscape-paths.webp",
    "assets/papercraft/badge-self.webp", "assets/papercraft/badge-care.webp",
    "assets/papercraft/badge-plan.webp", "assets/papercraft/badge-balance.webp",
)
DIST = APP / "dist"
ARTIFACTS = APP / "artifacts"


class Entry(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag in {"base", "iframe", "object"} or any(key.startswith("on") for key in attributes):
            raise ValueError(f"不支持的 HTML 元素或事件属性: {tag}")
        if tag == "script" and (not attributes.get("src") or attributes.get("type") == "module"):
            raise ValueError("脚本必须使用包内经典外置脚本")
        for name in ("src", "href"):
            if name in attributes:
                path = attributes[name]
                if not path.startswith("./") or path[2:] not in FILES:
                    raise ValueError(f"资源路径不在产物清单中: {path}")


def build():
    Entry().feed((APP / "src/index.html").read_text(encoding="utf-8"))
    DIST.mkdir(exist_ok=True)
    for relative in FILES:
        source = APP / "src" / relative
        target = DIST / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    print(f"构建完成 {DIST}", flush=True)


def audit(target):
    script = SKILL / "scripts/audit_artifact.py"
    subprocess.run([sys.executable, str(script), str(target)], check=True)


def package():
    members = tuple(sorted(path.relative_to(DIST).as_posix() for path in DIST.rglob("*") if path.is_file()))
    if members != tuple(sorted(FILES)):
        raise ValueError("dist 包含清单以外的文件或缺少运行资源")
    audit(DIST)
    ARTIFACTS.mkdir(exist_ok=True)
    artifact = ARTIFACTS / "red-chamber-choices.zip"
    with TemporaryDirectory(dir=ARTIFACTS) as staging:
        draft = Path(staging) / artifact.name
        with ZipFile(draft, "w", ZIP_DEFLATED) as archive:
            for relative in FILES:
                archive.write(DIST / relative, relative)
        with ZipFile(draft) as archive:
            if archive.testzip() or set(archive.namelist()) != set(FILES):
                raise ValueError("ZIP 完整性或文件列表校验失败")
        audit(draft)
        draft.replace(artifact)
    print(f"ZIP {artifact}")
    print(f"体积 {artifact.stat().st_size:,} 字节，共 {len(FILES)} 个文件")
    print(f"SHA-256 {hashlib.sha256(artifact.read_bytes()).hexdigest()}")


if __name__ == "__main__":
    commands = {"build": build, "package": package}
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        raise SystemExit("用法: python3 scripts/artifact.py build|package")
    commands[sys.argv[1]]()
