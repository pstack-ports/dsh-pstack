# DSH compatibility

DeepSeek Harness reads a bundle's display metadata from package files before it evaluates any plugin code. A value that breaks a limit is reported in **Settings → Plugins** as a **Package metadata error**, for example:

```text
Package metadata error: Plugin metadata for dsh-pstack: Error: /…/node_modules/dsh-pstack/package.json: icon exceeds 256 KiB
```

The skills still load, but the plugin row loses its icon and the profile reports a broken package. This file records the limits that produce that error, the rules that keep this repository inside them, and the history of the one time we crossed a limit.

## Metadata limits

| Surface | Limit | This bundle |
| --- | --- | --- |
| `package.json` `icon` | At most 262,144 bytes (256 KiB). SVG, PNG, JPEG, or WebP. A path relative to the package root that stays inside the package after resolving symlinks, and names a regular file. A manifest `icon` wins over an exported `./icon`. | [`assets/logo.webp`](./assets/logo.webp), 236,818 bytes, 512×512 WebP. See [Icon encoding](#icon-encoding). |
| Locale | `locale/en.json`; `meta.title` and `meta.description` must be non-empty strings. Other locale files use a language id as the filename. | Not exported. DSH falls back to `package.json` `name` and `description`. |
| Detail document | The file named by `meta.detail` is limited to `pluginManager.detailMaxBytes`, 1 MiB by default. | Not exported. DSH shows [README.md](./README.md). |
| Bundle patch | `dsh.bundle.patch` must name an existing file. The patch must insert a row whose `name` equals the package name. | `./cordis.patch.yml` inserts the `pstack` row. |
| Runtime | Node `^22.19.0 || >=24.0.0`; peers `@deepseek-ai/cordis@^4.0.1` and `@deepseek-ai/dsh-skill@^0.2.1-rc.2`. | DSH skips the whole bundle when its peers do not match the running runtime. See [README.md](./README.md#compatibility). |

DSH measures the raw file bytes, not decoded pixels. A 512×512 image can pass or fail depending only on how it is encoded. The host limit is `MAX_ICON_BYTES = 256 * 1024` in the package metadata reader; the same reader rejects absolute paths, URLs, files outside the package, unsupported extensions, and non-regular files.

## Rules for this repository

- **Never copy the upstream icon byte-for-byte.** `cursor/plugins` ships `assets/logo.png` at 361,140 bytes (353 KiB), which DSH rejects. Re-encode it. Lossless PNG and lossless WebP of those pixels are still over 262,144 bytes. The shipped file is [`assets/logo.webp`](./assets/logo.webp). Its pixel delta is in [Icon encoding](#icon-encoding).
- **Keep the icon in `files`.** `npm pack` filters by the `files` list; the `assets` directory entry covers the icon.
- **Run the gate before opening a PR.** `npm test` fails when the declared icon is missing, outside the package, not SVG/PNG/JPEG/WebP, over 256 KiB, inconsistent with its extension's magic bytes, or absent from `files`.
- **Check the packed artifact when packaging changes.** `npm pack --dry-run` must list the icon, and a scratch profile install must render it without a metadata diagnostic.
- **Do not raise the limit.** The 256 KiB ceiling belongs to DSH, not this package. Shrink or re-encode the image instead.
- **Do not edit the installed copy by hand.** Fix the package, reinstall it into the profile, and restart the profile.

## Icon encoding

The upstream artwork is the 361,140-byte file at `71980e0` (`assets/logo.png`, 512×512, 8-bit RGB, 30,424 colors). DSH's limit is 262,144 raw bytes. These lossless encodings keep every RGB pixel and still miss that limit.

| Encoder | Bytes |
| --- | --- |
| oxipng 9.1.5 `-o max --zopfli --zi 15` | 360,735 |
| zopflipng 1.0.3 `--iterations=15 --filters=0me` | 361,471, larger than the input, so the 361,140-byte file remains |
| cwebp 1.5.0 `-lossless -z 9 -metadata none` | 270,696 |
| cwebp 1.3.2 `-lossless -z 9 -metadata none`, and Pillow 10.2 lossless WebP | 275,910 |

Pull request review 5934203113 measured a Pillow lossless WebP of this artwork at 270,552 bytes. That figure and the 270,696-byte cwebp 1.5.0 file are both above 262,144. Decoded pixels for every lossless row in the table match the upstream file.

The shipped file is `assets/logo.webp`, 236,818 bytes, from libwebp 1.5.0. Regenerate it from the upstream bytes at `71980e0`:

```bash
git show 71980e071d3fe27e4db538c74a16c6a0c3f9f04b:assets/logo.png > /tmp/upstream-logo.png
cwebp -near_lossless 99 -z 9 -metadata none /tmp/upstream-logo.png -o assets/logo.webp
```

`-near_lossless` moves some pixels by a small integer, then compresses the result losslessly. For this image, levels 80 through 99 emit the same bytes. Level 100 is the 270,696-byte lossless file.

Compare RGB after decoding. An RGBA `ImageChops` bounding box stays empty when every alpha difference is 0, including when RGB differs. A changed pixel is one whose R, G, or B differs. Channel delta is the absolute difference in one channel. Channel-sum is those three differences added at one pixel. Alpha is counted on its own. `dwebp` from libwebp 1.5.0 and Pillow 10.2 decode this WebP to the same RGB pixels.

| Asset | Bytes | Pixels changed | Max channel delta | Max channel-sum | Alpha delta |
| --- | --- | --- | --- | --- | --- |
| Upstream 8-bit RGB | 361,140 | 0 / 262,144 | 0 | 0 | 0 |
| Shipped WebP | 236,818 | 102,105 / 262,144 | 1 | 3 | 0 |
| `fbc1aae` palette PNG | 59,835 | 252,331 / 262,144 | 29 | 62 | 0 |

The shipped WebP's absolute RGB channel differences sum to 176,315. Every changed pixel moves by 1 in one or more channels, and no channel moves by more than 1. The palette PNG is the previous 211-color stand-in. Its RGBA difference has no bounding box because the alpha difference is 0 everywhere, while the RGB difference covers the whole 512×512 image.

Lossy WebP at `-q 100` fits in 95,282 bytes and is a worse picture. 251,832 pixels change, and the max channel delta is 86.

## Why the regression happened

- **2026-10-26, `fbc1aae`:** the original 361,140-byte icon was replaced with a 59,835-byte palette PNG. DSH accepted the bundle. That file is not the same artwork. The delta is in the table above.
- **2026-11-09, `e12d636` ("Fix portreview audit issues 16-27"):** audit issue #27 restored the upstream icon byte-for-byte to match `cursor/plugins` at `c742dd6`. That brought back the 361,140-byte file and produced the error in 0.15.43.
- **Fix:** ship the 236,818-byte WebP and gate `npm test` on the icon, so copying the upstream file back fails CI instead of failing at install time. Do not put the `fbc1aae` palette PNG back.

## Recovering an installed profile

A profile installed before the fix keeps the oversized icon in its own `node_modules`. Reinstall the bundle and restart the profile:

```bash
dsh plugin --profile <profile> add github:pstack-ports/dsh-pstack
dsh --profile <profile>
```

Then confirm the pstack row in **Settings → Plugins** shows the logo and no red metadata error.
