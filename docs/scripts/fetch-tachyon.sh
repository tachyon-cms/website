#!/bin/sh
# Downloads the tachyon release named in docs/cli-version.txt into <dir>, checks the archive
# against the sha256 pinned in docs/cli-sha256.txt (and the release's own checksums.txt),
# and prints the binary's path. gen-cli.mjs runs on that binary.
# A new release is one reviewed diff: the version in cli-version.txt and the archive lines,
# copied from the release's checksums.txt after `gh attestation verify`, in cli-sha256.txt.
# Usage: sh docs/scripts/fetch-tachyon.sh <dir> [target]   (default target: x86_64-unknown-linux-musl)
set -eu
docs=$(cd "$(dirname "$0")/.." && pwd)
dir=$1
target=${2:-x86_64-unknown-linux-musl}
version=$(cat "$docs/cli-version.txt")
name=tachyon_${version}_${target}
base=https://github.com/tachyon-cms/tachyoncms/releases/download/v${version}
pinned=$(grep "  $name.tar.gz\$" "$docs/cli-sha256.txt") || {
  echo "fetch-tachyon: no pinned sha256 for $name.tar.gz in docs/cli-sha256.txt" >&2
  exit 1
}
mkdir -p "$dir"
cd "$dir"
curl --proto '=https' --tlsv1.2 -fsSL -o "$name.tar.gz" "$base/$name.tar.gz" -o checksums.txt "$base/checksums.txt"
# The pinned hash is the trust anchor; the release's checksums.txt must agree with it.
echo "$pinned" | shasum -a 256 -c - >&2
grep -qxF "$pinned" checksums.txt || {
  echo "fetch-tachyon: the release's checksums.txt disagrees with the pinned hash" >&2
  exit 1
}
tar xzf "$name.tar.gz"
echo "$PWD/$name/tachyon"
