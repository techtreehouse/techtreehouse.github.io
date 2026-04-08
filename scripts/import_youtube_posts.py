#!/usr/bin/env python3
"""Create missing Jekyll posts from the Tech Treehouse YouTube channel feed.

The script:
1. Resolves a YouTube handle like ``@techtreehouse`` to a channel id.
2. Downloads the public Atom feed for that channel.
3. Extracts video ids already referenced in ``_posts``.
4. Creates markdown posts only for feed entries that are not already present.

Usage:
    python3 scripts/import_youtube_posts.py
    python3 scripts/import_youtube_posts.py --dry-run
    python3 scripts/import_youtube_posts.py --handle @techtreehouse
"""

from __future__ import annotations

import argparse
import datetime as dt
import pathlib
import re
import sys
import textwrap
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET


ROOT = pathlib.Path(__file__).resolve().parents[1]
DEFAULT_POSTS_DIR = ROOT / "_posts"
DEFAULT_IMAGES_DIR = ROOT / "assets" / "images"
DEFAULT_HANDLE = "@techtreehouse"

YOUTUBE_HANDLE_URL = "https://www.youtube.com/{handle}/videos"
YOUTUBE_FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
YOUTUBE_WATCH_URL = "https://youtube.com/watch?v={video_id}"
YOUTUBE_THUMBNAIL_URL = "https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "media": "http://search.yahoo.com/mrss/"}
VIDEO_ID_RE = re.compile(r"(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]{11})")
URL_RE = re.compile(r"(?<![\]\)])(https?://[^\s<>()]+)")
TIMESTAMP_RE = re.compile(r"(?<!\d)(\d{1,2}:\d{2}(?::\d{2})?)(?!\d)")
INVALID_FILENAME_CHARS_RE = re.compile(r'[<>:"/\\|?*\x00-\x1F]')
MULTISPACE_RE = re.compile(r"\s+")


def fetch_text(url: str) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def resolve_channel_id(handle: str) -> str:
    normalized = handle if handle.startswith("@") else f"@{handle}"
    html = fetch_text(YOUTUBE_HANDLE_URL.format(handle=normalized))

    patterns = [
        r'"channelId":"(UC[\w-]+)"',
        r'https://www\.youtube\.com/channel/(UC[\w-]+)',
        r'channel_id=(UC[\w-]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, html)
        if match:
            return match.group(1)

    raise RuntimeError(f"Could not resolve a channel id from handle {normalized!r}.")


def load_existing_video_ids(posts_dir: pathlib.Path) -> set[str]:
    existing_ids: set[str] = set()
    for post_path in posts_dir.glob("*.md"):
        text = post_path.read_text(encoding="utf-8", errors="replace")
        existing_ids.update(VIDEO_ID_RE.findall(text))
    return existing_ids


def parse_feed(feed_xml: str) -> list[dict[str, str]]:
    root = ET.fromstring(feed_xml)
    videos: list[dict[str, str]] = []

    for entry in root.findall("atom:entry", ATOM_NS):
        video_id = entry.findtext("atom:id", default="", namespaces=ATOM_NS).rsplit(":", 1)[-1]
        title = entry.findtext("atom:title", default="", namespaces=ATOM_NS).strip()
        published_text = entry.findtext("atom:published", default="", namespaces=ATOM_NS)
        description = entry.findtext("media:group/media:description", default="", namespaces=ATOM_NS).strip()

        if not video_id or not title or not published_text:
            continue

        published = dt.datetime.fromisoformat(published_text.replace("Z", "+00:00")).date()
        videos.append(
            {
                "video_id": video_id,
                "title": title,
                "published": published.isoformat(),
                "description": description,
            }
        )

    return videos


def sanitize_title_for_filename(title: str) -> str:
    cleaned = INVALID_FILENAME_CHARS_RE.sub("", title)
    cleaned = MULTISPACE_RE.sub("-", cleaned.strip())
    cleaned = cleaned.strip(". ")
    return cleaned or "untitled-video"


def find_image_path(title: str, images_dir: pathlib.Path, video_id: str) -> str:
    candidates = []
    raw_title = title.strip()
    safe_title = sanitize_title_for_filename(title)
    for base_name in {raw_title, safe_title}:
        for ext in (".jpg", ".jpeg", ".png", ".webp"):
            candidates.append(images_dir / f"{base_name}{ext}")

    for candidate in candidates:
        if candidate.exists():
            return candidate.relative_to(ROOT).as_posix()

    return YOUTUBE_THUMBNAIL_URL.format(video_id=video_id)


def normalize_url_match(match: re.Match[str]) -> str:
    url = match.group(1).rstrip(".,)")
    trailing = match.group(1)[len(url):]
    return f"[{url}]({url}){trailing}"


def timestamp_to_seconds(timestamp: str) -> int:
    parts = [int(part) for part in timestamp.split(":")]
    if len(parts) == 2:
        minutes, seconds = parts
        return minutes * 60 + seconds
    hours, minutes, seconds = parts
    return hours * 3600 + minutes * 60 + seconds


def link_timestamps(text: str, video_id: str) -> str:
    def replace(match: re.Match[str]) -> str:
        timestamp = match.group(1)
        seconds = timestamp_to_seconds(timestamp)
        return f"[{timestamp}]({YOUTUBE_WATCH_URL.format(video_id=video_id)}&t={seconds})"

    return TIMESTAMP_RE.sub(replace, text)


def format_description(description: str, video_id: str) -> str:
    if not description:
        return "New video from Tech Treehouse.<br><br>[Please subscribe!](https://youtube.com/techtreehouse/?sub_confirmation=1)"

    lines = [line.rstrip() for line in description.replace("\r\n", "\n").split("\n")]
    processed_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            processed_lines.append("")
            continue

        linked_line = URL_RE.sub(normalize_url_match, stripped)
        linked_line = link_timestamps(linked_line, video_id)
        processed_lines.append(linked_line)

    return "<br>".join(processed_lines)


def render_post(video: dict[str, str], image_path: str) -> str:
    title = video["title"]
    video_id = video["video_id"]
    description = format_description(video["description"], video_id)
    watch_url = YOUTUBE_WATCH_URL.format(video_id=video_id)

    front_matter = textwrap.dedent(
        f"""\
        ---
        layout: post
        title:  "{title}"
        author: Tech Treehouse
        categories: [ Youtube, tutorial ]
        image: {image_path}
        ---
        """
    ).strip()

    body = f"[{title}]({watch_url})\n\n{description}\n"
    return f"{front_matter}\n\n{body}"


def write_missing_posts(
    videos: list[dict[str, str]],
    existing_video_ids: set[str],
    posts_dir: pathlib.Path,
    images_dir: pathlib.Path,
    dry_run: bool,
    limit: int | None,
) -> list[pathlib.Path]:
    created: list[pathlib.Path] = []

    missing_videos = [video for video in videos if video["video_id"] not in existing_video_ids]
    missing_videos.sort(key=lambda item: (item["published"], item["video_id"]))

    if limit is not None:
        missing_videos = missing_videos[:limit]

    for video in missing_videos:
        filename = f"{video['published']}-{sanitize_title_for_filename(video['title'])}.md"
        post_path = posts_dir / filename

        if post_path.exists():
            continue

        image_path = find_image_path(video["title"], images_dir, video["video_id"])
        content = render_post(video, image_path)

        if dry_run:
            print(f"Would create: {post_path.relative_to(ROOT)}")
        else:
            post_path.write_text(content, encoding="utf-8")
            print(f"Created: {post_path.relative_to(ROOT)}")

        created.append(post_path)

    return created


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--handle", default=DEFAULT_HANDLE, help="YouTube handle to import from.")
    parser.add_argument("--posts-dir", default=str(DEFAULT_POSTS_DIR), help="Directory containing Jekyll posts.")
    parser.add_argument("--images-dir", default=str(DEFAULT_IMAGES_DIR), help="Directory containing local cover images.")
    parser.add_argument("--dry-run", action="store_true", help="Show which posts would be created without writing files.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of missing posts to create.")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    posts_dir = pathlib.Path(args.posts_dir).resolve()
    images_dir = pathlib.Path(args.images_dir).resolve()

    if not posts_dir.is_dir():
        raise SystemExit(f"Posts directory does not exist: {posts_dir}")

    try:
        channel_id = resolve_channel_id(args.handle)
        feed_xml = fetch_text(YOUTUBE_FEED_URL.format(channel_id=channel_id))
    except (urllib.error.URLError, TimeoutError) as exc:
        raise SystemExit(f"Failed to fetch YouTube data: {exc}") from exc
    except RuntimeError as exc:
        raise SystemExit(str(exc)) from exc

    videos = parse_feed(feed_xml)
    existing_video_ids = load_existing_video_ids(posts_dir)
    created = write_missing_posts(
        videos=videos,
        existing_video_ids=existing_video_ids,
        posts_dir=posts_dir,
        images_dir=images_dir,
        dry_run=args.dry_run,
        limit=args.limit,
    )

    missing_count = len([video for video in videos if video["video_id"] not in existing_video_ids])
    print(
        f"Feed videos: {len(videos)} | Existing website videos: {len(existing_video_ids)} | "
        f"Missing feed videos: {missing_count} | {'Would create' if args.dry_run else 'Created'}: {len(created)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
