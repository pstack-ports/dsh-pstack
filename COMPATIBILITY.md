# DSH compatibility

DeepSeek Harness reads a bundle's display metadata from package files before it evaluates any plugin code. A value that breaks a limit is reported in **Settings → Plugins** as a **Package metadata error**, for example:

```text
Package metadata error: Plugin metadata for dsh-pstack: Error: /…/node_modules/dsh-pstack/package.json: icon exceeds 256 KiB
```

The skills still load, but the plugin row loses its icon and the profile reports a broken package. This file records the limits that produce that error, the rules that keep this repository inside them, and the history of the one time we crossed a limit.

## Metadata limits

| Surface | Limit | This bundle |
| --- | --- | --- |
| `package.json` `icon` | At most 262,144 bytes (256 KiB). SVG, PNG, JPEG, or WebP. A path relative to the package root that stays inside the package after resolving symlinks, and names a regular file. A manifest `icon` wins over an exported `./icon`. | [`assets/logo.png`](./assets/logo.png), 59,835 bytes, 512×512 palette PNG. |
| Locale | `locale/en.json`; `meta.title` and `meta.description` must be non-empty strings. Other locale files use a language id as the filename. | Not exported. DSH falls back to `package.json` `name` and `description`. |
| Detail document | The file named by `meta.detail` is limited to `pluginManager.detailMaxBytes`, 1 MiB by default. | Not exported. DSH shows [README.md](./README.md). |
| Bundle patch | `dsh.bundle.patch` must name an existing file. The patch must insert a row whose `name` equals the package name. | `./cordis.patch.yml` inserts the `pstack` row. |
| Runtime | Node `^22.19.0 || >=24.0.0`; peers `@deepseek-ai/cordis@^4.0.1` and `@deepseek-ai/dsh-skill@^0.2.1-rc.2`. | DSH skips the whole bundle when its peers do not match the running runtime. See [README.md](./README.md#compatibility). |

DSH measures the raw file bytes, not decoded pixels. A 512×512 image can pass or fail depending only on how it is encoded. The host limit is `MAX_ICON_BYTES = 256 * 1024` in the package metadata reader; the same reader rejects absolute paths, URLs, files outside the package, unsupported extensions, and non-regular files.

## Rules for this repository

- **Never copy the upstream icon byte-for-byte.** `cursor/plugins` ships `assets/logo.png` at 361,140 bytes (353 KiB), which DSH rejects. Re-encode it instead and keep the pixels unchanged. The current asset is the same 512×512 artwork as a 59,835-byte palette PNG.
- **Keep the icon in `files`.** `npm pack` filters by the `files` list; the `assets` directory entry covers the icon.
- **Run the gate before opening a PR.** `npm test` fails when the declared icon is missing, outside the package, not SVG/PNG/JPEG/WebP, over 256 KiB, inconsistent with its extension's magic bytes, or absent from `files`.
- **Check the packed artifact when packaging changes.** `npm pack --dry-run` must list the icon, and a scratch profile install must render it without a metadata diagnostic.
- **Do not raise the limit.** The 256 KiB ceiling belongs to DSH, not this package. Shrink or re-encode the image instead.
- **Do not edit the installed copy by hand.** Fix the package, reinstall it into the profile, and restart the profile.

## Why the regression happened

- **2026-10-26, `fbc1aae`:** the original 361,140-byte icon was replaced with a 59,835-byte palette PNG. DSH accepted the bundle.
- **2026-11-09, `e12d636` ("Fix portreview audit issues 16-27"):** audit issue #27 restored the upstream icon byte-for-byte to match `cursor/plugins` at `c742dd6`. That brought back the 361,140-byte file and produced the error in 0.15.43.
- **Fix:** restore the 59,835-byte image and gate `npm test` on the icon, so copying the upstream file back fails CI instead of failing at install time.

## Recovering an installed profile

A profile installed before the fix keeps the oversized icon in its own `node_modules`. Reinstall the bundle and restart the profile:

```bash
dsh plugin --profile <profile> add github:pstack-ports/dsh-pstack
dsh --profile <profile>
```

Then confirm the pstack row in **Settings → Plugins** shows the logo and no red metadata error.
