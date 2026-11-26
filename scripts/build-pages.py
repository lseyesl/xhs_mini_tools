"""Assemble the GitHub Pages directory from small tools' static builds."""

from hashlib import sha256
from html import escape
import json
from os import fsdecode, fsencode
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory
from urllib.parse import quote


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = ROOT / "pages"
OUTPUT = ROOT / "dist/pages"
CACHE = ROOT / "dist/pages-cache"


def published_projects():
    projects = {}
    for manifest in sorted((ROOT / "apps").glob("*/package.json")):
        package = json.loads(manifest.read_text(encoding="utf-8"))
        metadata = package.get("pages")
        if metadata is None:
            continue
        app = manifest.parent
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", app.name):
            raise ValueError(f"Pages 项目目录需要使用小写英文、数字和连字符：{app}")
        if not package.get("scripts", {}).get("build"):
            raise ValueError(f"{app} 需要定义 build 脚本")
        projects[app] = metadata
    if not projects:
        raise ValueError("请在至少一个子项目的 package.json 中配置 pages")
    return projects


def workspace_dependencies():
    workspace = json.loads(subprocess.check_output(
        ["pnpm", "list", "-r", "--depth=0", "--json"], cwd=ROOT
    ))
    paths = {Path(project["path"]).resolve() for project in workspace}
    graph = {}
    for project in workspace:
        dependencies = set()
        for section in ("dependencies", "devDependencies", "optionalDependencies"):
            for dependency in project.get(section, {}).values():
                if "path" in dependency:
                    dependencies.add(Path(dependency["path"]).resolve())
        graph[Path(project["path"]).resolve()] = dependencies & paths
    return graph


def build_dependencies(app, graph):
    visited = set()
    pending = [app]
    while pending:
        project = pending.pop()
        if project in visited:
            continue
        visited.add(project)
        pending.extend(graph[project] - visited)
    return visited


def source_fingerprints(dependencies):
    common = sha256(b"pages-build-v1\0")
    for value in (platform.system(), platform.machine(), platform.python_version()):
        common.update(value.encode() + b"\0")
    common.update(subprocess.check_output(["node", "--version"], cwd=ROOT))
    source_files = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT
    )
    scoped = {}
    for name in sorted(set(source_files.split(b"\0")) - {b""}):
        relative = Path(fsdecode(name))
        group = relative.parts[0]
        if group in {"pages", ".github", ".planning"} or relative.as_posix() in {
            "README.md", "AGENTS.md", "scripts/build-pages.py"
        }:
            continue
        source = ROOT / relative
        if not source.is_file():
            continue
        digest = common
        if group in {"apps", "packages"} and len(relative.parts) > 2:
            scope = ROOT.joinpath(*relative.parts[:2])
            digest = scoped.setdefault(scope, sha256())
        digest.update(name + b"\0" + sha256(source.read_bytes()).digest())

    keys = {}
    for app, projects in dependencies.items():
        digest = common.copy()
        for project in sorted(projects):
            if project in scoped:
                digest.update(fsencode(project.relative_to(ROOT)) + b"\0" + scoped[project].digest())
        keys[app] = digest.hexdigest()
    return keys


def validate_dist(dist):
    if not (dist / "index.html").is_file():
        raise ValueError(f"Pages 构建产物缺少入口：{dist / 'index.html'}")
    if dist.is_symlink() or any(path.is_symlink() for path in dist.rglob("*")):
        raise ValueError(f"Pages 产物不能包含符号链接：{dist}")


def cache_hit(app, key):
    entry = CACHE / app.name
    stamp = entry / "fingerprint"
    return (entry / "dist/index.html").is_file() and stamp.is_file() and stamp.read_text() == key


def cache_build(app, key):
    validate_dist(app / "dist")
    entry = CACHE / app.name
    with TemporaryDirectory(dir=CACHE) as temp:
        target = Path(temp) / "entry"
        shutil.copytree(app / "dist", target / "dist")
        (target / "fingerprint").write_text(key)
        if entry.exists():
            shutil.rmtree(entry)
        target.rename(entry)


def prepare_builds(projects):
    graph = workspace_dependencies()
    dependencies = {app: build_dependencies(app, graph) for app in projects}
    keys = source_fingerprints(dependencies)
    changed = [app for app, key in keys.items() if not cache_hit(app, key)]
    cached = set(projects) - set(changed)
    for app in sorted(cached):
        print(f"复用 Pages 构建  {app.name}", flush=True)
    if not changed:
        return

    required = {project for app in changed for project in dependencies[app]} - {ROOT}
    for app in sorted(required & cached):
        dist = app / "dist"
        if dist.exists():
            shutil.rmtree(dist)
        shutil.copytree(CACHE / app.name / "dist", dist)
    for app in changed:
        dist = app / "dist"
        if dist.exists():
            shutil.rmtree(dist)
        print(f"构建 Pages 子项目  {app.name}", flush=True)

    filters = []
    for project in sorted(required - cached):
        filters.extend(["--filter", "{./" + project.relative_to(ROOT).as_posix() + "}"])
    subprocess.run(["pnpm", *filters, "--fail-if-no-match", "run", "--if-present", "build"],
                   cwd=ROOT, check=True)
    for app in changed:
        cache_build(app, keys[app])


def publish_project(slug, metadata, target):
    dist = CACHE / slug / "dist"
    validate_dist(dist)
    title = escape(metadata["title"])
    description = escape(metadata["description"])
    href = f"./{slug}/"
    cover = ""
    if metadata.get("cover"):
        asset = PurePosixPath(metadata["cover"])
        if asset.is_absolute() or ".." in asset.parts or not (dist / asset).is_file():
            raise ValueError(f"{slug} 的 Pages 封面需要指向 dist 内的文件：{asset}")
        cover = f'<img class="cover" src="{href}{quote(asset.as_posix())}" alt="">'

    shutil.copytree(dist, target / slug)
    return (
        f'<li><a class="project" href="{href}">{cover}'
        f'<div class="project-body"><h2>{title}</h2><p>{description}</p>'
        '<span class="project-link">打开项目 <span aria-hidden="true">→</span></span>'
        '</div></a></li>'
    )


def build():
    CACHE.mkdir(parents=True, exist_ok=True)
    projects = published_projects()
    prepare_builds(projects)
    template = (TEMPLATE / "index.html").read_text(encoding="utf-8")
    with TemporaryDirectory(dir=OUTPUT.parent) as temp:
        target = Path(temp) / "pages"
        target.mkdir()
        cards = [publish_project(app.name, metadata, target) for app, metadata in projects.items()]
        (target / "index.html").write_text(
            template.replace("<!-- PROJECTS -->", "\n      ".join(cards)), encoding="utf-8"
        )
        shutil.copyfile(TEMPLATE / "styles.css", target / "styles.css")
        if OUTPUT.exists():
            shutil.rmtree(OUTPUT)
        target.rename(OUTPUT)
    slugs = {app.name for app in projects}
    for entry in CACHE.iterdir():
        if entry.name not in slugs and entry.is_dir():
            shutil.rmtree(entry)
    print(f"Pages 构建完成  {OUTPUT}")


if __name__ == "__main__":
    build()
