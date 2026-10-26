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
# DSH stores each session as $DSH_HOME/sessions/<project-slug>/<session-id>/session*.jsonl.zstd.
# The project slug is the cwd with its leading slash removed, every "/" replaced
# by "-", wrapped in "--". Plain .jsonl logs are supported too.
set -euo pipefail

home="${DSH_HOME:-$HOME/.dsh}"
sessions="$home/sessions"
slug="--$(printf '%s' "${PWD#/}" | tr '/' '-')--"

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
