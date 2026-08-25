# Resume design review — LaTeX v1

This branch keeps the information architecture of `resume-ng-zh`: centered identity and contact block, single-column sections, right-aligned dates, and compact bullets. The changes are limited to typography, color, spacing, and quiet geometric page accents.

## Build

```bash
latexmk -lualatex resume-zh.tex
latexmk -lualatex resume-en.tex
```

Generated PDFs and review previews are intentionally ignored by Git. Rebuild
them locally from the LaTeX sources when reviewing this branch.
