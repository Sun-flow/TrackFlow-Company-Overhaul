"""Check a static site: screenshot every page at four widths and fail on what a browser can catch.

For each page and width (375, 768, 1024, 1440) it saves a full-page screenshot as <page>-<width>.png and
reports console errors, horizontal page scroll and axe-core accessibility violations (WCAG 2.1 A and AA).
It exits 1 if it finds any. Looking at the screenshots is still up to you.

Setup, once per environment:
    pip3 install -r scripts/requirements.txt
    python3 -m playwright install chromium   # skip if Chromium is already installed for Playwright

Usage:
    python3 scripts/site-check.py                           # every .html page under uis/website/
    python3 scripts/site-check.py --root uis/backoffice --pages index.html login.html
    python3 scripts/site-check.py --widths 375 1440 --out /tmp/shots --no-axe

The script serves --root itself on a free port, so no dev server needs to be running. Screenshots go to
.site-check/ (git-ignored) unless --out says otherwise. Set PLAYWRIGHT_CHROMIUM_EXECUTABLE to use a specific
Chromium binary. If cdn.jsdelivr.net is blocked, its /npm/ files are taken from the npm registry instead
(same package, same version); axe-core always comes from the npm registry.
"""

import argparse
import functools
import io
import json
import mimetypes
import os
import re
import sys
import tarfile
import threading
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Playwright isn't installed. Run `pip3 install -r scripts/requirements.txt` and "
          "`python3 -m playwright install chromium`, then try again.")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SITE = ROOT / "uis" / "website"
WIDTHS = [375, 768, 1024, 1440]
AXE_VERSION = "4.10.2"
AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]
SKIP_DIRS = {"node_modules", ".git"}


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(directory):
    handler = functools.partial(QuietHandler, directory=str(directory))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_port}/"


def find_pages(site):
    return sorted(p.relative_to(site).as_posix() for p in site.rglob("*.html")
                  if not SKIP_DIRS.intersection(p.relative_to(site).parts))


# Some networks block cdn.jsdelivr.net but allow the npm registry, which serves the same files.
JSDELIVR_NPM = re.compile(r"https://cdn\.jsdelivr\.net/npm/((?:@[^/]+/)?[^@/]+)@([^/]+)/?(.*)")
_tarballs = {}


def from_npm(package, version, path):
    """Return (file name, bytes) for a file in an npm package, read from the package's tarball."""
    key = (package, version)
    if key not in _tarballs:
        name = package.split("/")[-1]
        url = f"https://registry.npmjs.org/{package}/-/{name}-{version}.tgz"
        with urllib.request.urlopen(url, timeout=60) as response:
            _tarballs[key] = tarfile.open(fileobj=io.BytesIO(response.read()), mode="r:gz")
    tar = _tarballs[key]
    if not path:  # a bare package URL serves the package's default file, as jsdelivr does
        manifest = json.load(tar.extractfile("package/package.json"))
        path = manifest.get("jsdelivr") or manifest.get("browser") or manifest.get("main") or "index.js"
    path = path.removeprefix("./")
    return path, tar.extractfile(f"package/{path}").read()


def cdn_route(route):
    try:
        response = route.fetch()
        if response.ok:
            route.fulfill(response=response)
            return
    except Exception:
        pass
    match = JSDELIVR_NPM.match(route.request.url)
    if not match:
        route.abort()
        return
    path, body = from_npm(*match.groups())
    route.fulfill(status=200, body=body, content_type=mimetypes.guess_type(path)[0] or "text/plain")


def open_page(browser, url, viewport, errors):
    context = browser.new_context(viewport=viewport)
    page = context.new_page()
    page.route("**/favicon.ico", lambda route: route.fulfill(status=204))  # a missing favicon isn't a page error
    page.route("https://cdn.jsdelivr.net/**", cdn_route)
    page.on("console", lambda msg: msg.type == "error" and errors.append(msg.text))
    page.on("pageerror", lambda exc: errors.append(str(exc)))
    page.goto(url, wait_until="networkidle")
    return context, page


def axe_violations(page, axe_source):
    page.add_script_tag(content=axe_source)
    result = page.evaluate("tags => axe.run(document, {runOnly: {type: 'tag', values: tags}})", AXE_TAGS)
    return [f"{v['id']} ({len(v['nodes'])}x): {v['help']}" for v in result["violations"]]


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--root", type=Path, default=DEFAULT_SITE, help="folder to serve (default uis/website)")
    parser.add_argument("--pages", nargs="+", help="pages relative to --root (default: every .html file)")
    parser.add_argument("--widths", type=int, nargs="+", default=WIDTHS)
    parser.add_argument("--out", type=Path, default=ROOT / ".site-check")
    parser.add_argument("--no-axe", action="store_true", help="skip the axe-core accessibility scan")
    args = parser.parse_args()

    site = args.root.resolve()
    if not site.is_dir():
        print(f"{args.root} doesn't exist. Pass the site's folder with --root.")
        return 1
    pages = args.pages or find_pages(site)
    if not pages:
        print(f"No .html pages under {args.root}.")
        return 1
    args.out.mkdir(parents=True, exist_ok=True)

    axe_source = None
    if not args.no_axe:
        try:
            axe_source = from_npm("axe-core", AXE_VERSION, "axe.min.js")[1].decode("utf-8")
        except Exception as exc:
            print(f"Couldn't download axe-core {AXE_VERSION} from the npm registry ({exc}). "
                  "Rerun with --no-axe to skip the accessibility scan.")
            return 1

    server, base_url = serve(site)
    problems = []
    with sync_playwright() as p:
        # Chromium ignores the proxy environment variables, so pass the proxy on (CDNs need it).
        proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
        proxy = {"server": proxy_url, "bypass": "127.0.0.1,localhost"} if proxy_url else None
        try:
            browser = p.chromium.launch(executable_path=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE"), proxy=proxy)
        except Exception as exc:
            print(f"Couldn't start Chromium: {str(exc).splitlines()[0]}\n"
                  "Run `python3 -m playwright install chromium`, or set PLAYWRIGHT_CHROMIUM_EXECUTABLE.")
            return 1
        for page_path in pages:
            name = page_path.removesuffix(".html").replace("/", "-")
            for width in args.widths:
                errors = []
                context, page = open_page(browser, base_url + page_path, {"width": width, "height": 900}, errors)
                overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                page.screenshot(path=args.out / f"{name}-{width}.png", full_page=True)
                violations = axe_violations(page, axe_source) if axe_source else []
                context.close()
                found = []
                if errors:
                    problems.append(f"{page_path} {width}px: console errors: {errors}")
                    found.append("console errors")
                if overflow > 0:
                    problems.append(f"{page_path} {width}px: horizontal scroll ({overflow}px too wide)")
                    found.append("horizontal scroll")
                if violations:
                    problems += [f"{page_path} {width}px: axe: {v}" for v in violations]
                    found.append(f"{len(violations)} axe violation(s)")
                print(f"{page_path:30} {width:>4}px  {', '.join(found) or 'ok'}")
        browser.close()
    server.shutdown()

    for problem in problems:
        print(f"FAIL  {problem}")
    print(f"Screenshots in {args.out}" + ("" if not problems else f"; {len(problems)} problem(s)"))
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
