# Final release evidence

This directory contains only the visual evidence changed by the publication pass.

- `inter-wordmark-lockups.png` renders the production light and dark horizontal lockups at their
  native SVG aspect ratio. The Concept A mark is unchanged; the public wordmark outlines are the
  approved Inter (SIL OFL 1.1) replacement for the former machine-dependent/Avenir-derived paths.

The capture was rendered in the pinned Playwright Chromium container from the actual public SVG
assets served by the production Nginx image. It does not use a raster brand substitute or a remote
font.
