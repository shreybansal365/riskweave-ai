# Third-party notices

RiskWeave uses the following third-party asset in the application interface.

## Inter Variable

- Package: `@fontsource-variable/inter`
- Version: `5.2.8` (exactly pinned)
- Typeface: Inter
- Copyright: The Inter Project Authors
- License: SIL Open Font License 1.1 (`OFL-1.1`)
- Package source: <https://github.com/fontsource/font-files/tree/main/fonts/variable/inter>
- Typeface source: <https://github.com/rsms/inter>

The package's complete license text is distributed by the installed dependency at
`frontend/node_modules/@fontsource-variable/inter/LICENSE`. The application bundles only the Latin
variable-weight WOFF2 asset through Vite; no font is requested from a remote runtime service. The
public light and dark SVG lockups use deterministic vector outlines generated from this OFL-licensed
Inter asset; they do not embed or distribute a separate font file.

## Direct frontend runtime dependencies

| Package                      | Version | Upstream licence |
| ---------------------------- | ------- | ---------------- |
| `@fontsource-variable/inter` | 5.2.8   | SIL OFL 1.1      |
| `@tanstack/react-query`      | 5.101.2 | MIT              |
| `react`                      | 19.2.7  | MIT              |
| `react-dom`                  | 19.2.7  | MIT              |
| `react-router-dom`           | 7.18.1  | MIT              |
| `recharts`                   | 3.9.2   | MIT              |

## Direct backend runtime dependencies

| Package             | Version | Upstream licence |
| ------------------- | ------- | ---------------- |
| `alembic`           | 1.18.5  | MIT              |
| `argon2-cffi`       | 25.1.0  | MIT              |
| `fastapi`           | 0.139.0 | MIT              |
| `numpy`             | 2.5.1   | BSD-3-Clause AND 0BSD AND MIT AND Zlib AND CC0-1.0 |
| `psycopg[binary]`   | 3.3.4   | LGPL-3.0-only    |
| `pydantic`          | 2.13.4  | MIT              |
| `pydantic-settings` | 2.14.2  | MIT              |
| `PyJWT`             | 2.13.0  | MIT              |
| `scikit-learn`      | 1.9.0   | BSD-3-Clause     |
| `SQLAlchemy`        | 2.0.51  | MIT              |
| `uvicorn`           | 0.51.0  | BSD-3-Clause     |

The tables above cover direct runtime dependencies and use the upstream package licence metadata for
the exact pinned versions. Complete JavaScript and Python dependency graphs, exact versions, package
integrity hashes, and transitive package metadata are recorded in `frontend/package-lock.json`,
`backend/requirements.txt`, and `backend/requirements-dev.txt`. Upstream licence notices remain
governed by their respective packages and are not replaced by the RiskWeave Apache-2.0 licence.
