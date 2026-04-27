# Tex Phile

Tex Phile is a plain-text demo fixture for the main CLI. It represents an outside pre-op fax packet that has enough information to normalize into the deterministic rules engine without starting from Cadence API JSON.

Run it with:

```sh
pnpm run cli tex_phile
```

Or run the text file directly:

```sh
pnpm run cli patients/tex_phile/patient.txt
```

The direct text-file mode also writes a reusable fixture under `patients/<text-file-name>/patient.txt`, so a one-off packet can be promoted into a patient fixture.
