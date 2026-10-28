#!/bin/sh
# Downloads the tachyon release named in docs/cli-version.txt into <dir>, checks it against
# the release's checksums.txt, and prints the binary's path. gen-cli.mjs runs on that binary.
# Usage: sh docs/scripts/fetch-tachyon.sh <dir> [target]   (default target: x86_64-unknown-linux-musl)
set -eu
dir=$1
target=${2:-x86_64-unknown-linux-musl}
version=$(cat "$(dirname "$0")/../cli-version.txt")
name=tachyon_${version}_${target}
base=https://github.com/tachyon-cms/tachyoncms/releases/download/v${version}
mkdir -p "$dir"
cd "$dir"
curl -fsSL -o checksums.txt "$base/checksums.txt" -o "$name.tar.gz" "$base/$name.tar.gz"
# Exactly the archive's line (not its .sbom.json), or the check fails.
grep "  $name.tar.gz\$" checksums.txt | shasum -a 256 -c - >&2
tar xzf "$name.tar.gz"
echo "$PWD/$name/tachyon"
