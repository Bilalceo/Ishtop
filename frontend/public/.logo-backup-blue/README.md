# Original blue logos (pre-emerald rebrand)

These are the original **blue** (`#3080F0`) IshTop logo assets, kept as a backup
before recoloring the brand to **emerald** (`#10B981`) to match the landing page.

To restore the blue logos, copy the files from this folder back into
`frontend/public/`:

```bash
cp frontend/public/.logo-backup-blue/*.png frontend/public/
```

Recolor method: HSV hue-shift of blue-range pixels to emerald, preserving
white marks, gradients and transparency.
