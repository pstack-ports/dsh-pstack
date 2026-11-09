#!/usr/bin/env bash
# Read DSH session logs without assuming a compression format.
#
# Usage:
#   session-log.sh                 # current session ($DSH_SESSION_ID)
#   session-log.sh <session-id>    # one session
#   session-log.sh --list [n]      # newest sessions in this project, default 10
#   session-log.sh --grep <text> [n]
#                                  # search the newest n sessions, default 10
#   session-log.sh --all           # with --list or --grep, search every project
#
# DSH stores each session as $DSH_HOME/sessions/<projectKey>/<session-id>/session*.jsonl.zstd.
# projectKey (@deepseek-ai/dsh-session-persistence-jsonl): separators (/ \ :)
# become "-", runs collapse to one "-", a code unit outside [A-Za-z0-9._-]
# or "~" becomes "~" plus 4 uppercase hex, leading hyphens are stripped
# (empty becomes "root"), then cut at 251 chars and wrapped in "--".
# /Users/you/My Projects/repo -> --Users-you-My~0020Projects-repo--.
# Plain .jsonl logs are supported too.
set -euo pipefail

home="${DSH_HOME:-$HOME/.dsh}"
sessions="$home/sessions"

# Same directory name as dsh-session-persistence-jsonl projectKey.
project_key() {
	PROJECT_KEY_CWD="$1" node -e '
const cwd = process.env.PROJECT_KEY_CWD ?? ""
if (cwd.length === 0) throw new Error("empty cwd")
let readable = ""
let separatorRun = false
for (let i = 0; i < cwd.length; i++) {
  const code = cwd.charCodeAt(i)
  const ch = String.fromCharCode(code)
  if (ch === "/" || ch === "\\" || ch === ":") {
    if (!separatorRun) readable += "-"
    separatorRun = true
  } else if (ch !== "~" && /^[A-Za-z0-9._-]$/.test(ch)) {
    readable += ch
    separatorRun = false
  } else {
    readable += "~" + code.toString(16).toUpperCase().padStart(4, "0")
    separatorRun = false
  }
}
const body = (readable.replace(/^-+/, "") || "root").slice(0, 251)
process.stdout.write("--" + body + "--")
'
}

slug="$(project_key "$PWD")"

die() { printf 'session-log: %s\n' "$*" >&2; exit 2; }

project_dir() {
	local all="${1:-false}"
	if [ "$all" = true ]; then printf '%s' "$sessions"
	else printf '%s' "$sessions/$slug"; fi
}

fmt_time() {
	date -r "$1" '+%Y-%m-%d %H:%M' 2>/dev/null || date -d "@$1" '+%Y-%m-%d %H:%M' 2>/dev/null || printf '%s' "$1"
}

list_logs() {
	local all="${1:-false}" limit="${2:-10}"
	local dir
	dir="$(project_dir "$all")"
	[ -d "$dir" ] || return 0
	find "$dir" -mindepth 2 -maxdepth 2 -type f \( -name 'session*.jsonl' -o -name 'session*.jsonl.zstd' \) -print 2>/dev/null \
		| while IFS= read -r file; do
			stat -f '%m %N' "$file" 2>/dev/null || stat -c '%Y %n' "$file" 2>/dev/null
		done \
		| sort -rn \
		| head -n "$limit" \
		| while IFS= read -r line; do
			ts="${line%% *}"
			file="${line#* }"
			file="${file#\'}"
			file="${file%\'}"
			printf '%s\t%s\n' "$(fmt_time "$ts")" "$file"
		done
}

find_log() {
	local id="$1"
	find "$sessions" -mindepth 3 -maxdepth 3 -type f -path "*/$id/session*.jsonl*" 2>/dev/null | head -n 1
}

emit() {
	local file="$1"
	case "$file" in
	*.zstd)
		command -v zstd >/dev/null 2>&1 || die "zstd is required to read $file"
		zstd -dc "$file"
		;;
	*) cat "$file" ;;
	esac
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
	sed -n '2,/^set -euo/p' "$0" | sed '$d; s/^# \{0,1\}//'
	exit 0
fi

all=false
if [ "${1:-}" = "--all" ]; then all=true; shift; fi

case "${1:-}" in
--list)
	shift
	limit="${1:-10}"
	list_logs "$all" "$limit"
	;;
--grep)
	shift
	pattern="${1:-}"
	[ -n "$pattern" ] || die "--grep needs a pattern"
	limit="${2:-10}"
	dir="$(project_dir "$all")"
	[ -d "$dir" ] || die "no sessions under $dir"
	find "$dir" -mindepth 2 -maxdepth 2 -type f \( -name 'session*.jsonl' -o -name 'session*.jsonl.zstd' \) -print 2>/dev/null \
		| while IFS= read -r file; do
			stat -f '%m %N' "$file" 2>/dev/null || stat -c '%Y %n' "$file" 2>/dev/null
		done \
		| sort -rn \
		| head -n "$limit" \
		| awk '{ $1=""; sub(/^ /, ""); print }' \
		| while IFS= read -r file; do
			matches="$(emit "$file" | grep -n -i -E "$pattern" || true)"
			[ -n "$matches" ] || continue
			printf '=== %s ===\n%s\n' "$file" "$matches"
		done
	;;
"")
	id="${DSH_SESSION_ID:-}"
	[ -n "$id" ] || die "no session id given and DSH_SESSION_ID is unset"
	file="$(find_log "$id")"
	[ -n "$file" ] || die "no log for session $id"
	emit "$file"
	;;
*)
	id="$1"
	file="$(find_log "$id")"
	[ -n "$file" ] || die "no log for session $id"
	emit "$file"
	;;
esac
