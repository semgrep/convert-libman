# convert-libman

Converts `libman.json` to `package.json` with automatic `package-lock.json` generation.

## Manual Usage

```bash
node convert-libman.js [libman.json path] [output directory]

# Example
node convert-libman.js ./libman.json ./
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

## GitHub Actions Usage

To automatically update & check in any changes made to libman.json, use the below action

```yaml
name: Convert libman.json to package files
on:
  push:
    paths:
      - '**/libman.json'

permissions:
  contents: write  # needed to push commits

jobs:
  convert-libman:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0   # so we can push back to the same ref

      - name: Convert libman
        run: |
          docker run -v "${{ github.workspace }}:/convert" ghcr.io/semgrep/convert-libman

      - name: Commit updated package files (if any)
        run: |
          set -euo pipefail

          # make the workspace safe for git (sometimes needed in CI)
          git config --global --add safe.directory "$GITHUB_WORKSPACE"

          # author details for the commit
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          # stage only package files that changed/appeared
          CHANGED=$(git status --porcelain -- '**/package.json' '**/package-lock.json' | wc -l)
          if [ "$CHANGED" -gt 0 ]; then
            git add **/package.json **/package-lock.json
            git commit -m "chore(convert-libman): update package files after libman.json change"
            git push
            echo "Committed and pushed package file updates."
          else
            echo "No package file changes to commit."
          fi
```
