#!/usr/bin/env python3
"""Create a deterministic SHA-256 inventory of every distributable course asset."""
import argparse
import hashlib
import json
from pathlib import Path


def generate(root: Path) -> dict:
    files = []
    for path in sorted(root.rglob('*'), key=lambda p: p.relative_to(root).as_posix()):
        if not path.is_file():
            continue
        relative = path.relative_to(root)
        if any(part.startswith('.') for part in relative.parts):
            continue
        if relative.as_posix() in ('offline-manifest.json', 'sw.js'):
            continue
        if path.name.startswith('_') and path.suffix.lower() == '.html':
            continue
        if path.is_symlink():
            raise ValueError(f'Symlink not allowed in offline resources: {relative}')
        content = path.read_bytes()
        files.append({'url': relative.as_posix(), 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})
    if not any(file['url'] == 'index.html' for file in files):
        raise ValueError('Course root must contain index.html')
    canonical = json.dumps(files, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    return {'version': 'sha256-' + hashlib.sha256(canonical).hexdigest(), 'count': len(files), 'bytes': sum(f['bytes'] for f in files), 'files': files}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=Path(__file__).resolve().parents[1] / 'docs')
    parser.add_argument('--check', action='store_true', help='Verify the existing manifest without writing it')
    args = parser.parse_args()
    root = args.dist.resolve()
    manifest = generate(root)
    target = root / 'offline-manifest.json'
    if args.check:
        if not target.is_file() or json.loads(target.read_text(encoding='utf-8')) != manifest:
            raise SystemExit('Offline manifest is missing or stale. Run build-offline-manifest.py.')
    else:
        target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({key: manifest[key] for key in ('version', 'count', 'bytes')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
