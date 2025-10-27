# convert-libman

Converts `libman.json` to `package.json` with automatic `package-lock.json` generation.

**Arguments:** libman.json path (default: `/convert/libman.json`), output directory (default: `/convert`)

## Manual Usage

```bash
node convert-libman.js [libman.json path] [output directory]

# Example
node convert-libman.js ./libman.json ./output
```

## Docker CI Usage

```yaml
# GitHub Actions example
- name: Convert libman
  run: |
    docker run -v ${{ github.workspace }}:/convert ghcr.io/semgrep/convert-libman

# GitLab CI example
convert-libman:
  script:
    - docker run -v $PWD:/convert ghcr.io/semgrep/convert-libman
```

```bash
# Command line
docker run -v $(pwd):/convert ghcr.io/semgrep/convert-libman
```
