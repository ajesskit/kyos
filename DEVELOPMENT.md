# Developing kyos-cli

This doc is for contributors working on `kyos-cli` itself.

## Local CLI runs

From the repo root:

```powershell
node .\bin\kyos.js --init
node .\bin\kyos.js --update
```

## Catalog

Installable skills, agents, and MCP definitions live in `catalog/registry.json`.

To install an entry into the current repo:

```powershell
npx kyos-cli --add skill <name>
npx kyos-cli --add agent <name>
npx kyos-cli --add mcp <name>
```

## Claude plugin (`plugins/kyos/`)

After editing a catalog `spec`/`tech`/`tasks`/`implement`/`hire` skill, regenerate the plugin copy
(`npm test` fails until you do):

```powershell
npm run build:plugin
```

Test plugin changes privately before release:

```powershell
claude --plugin-dir .\plugins\kyos                       # Claude Code
tar -a -c -f $env:TEMP\kyos-plugin.zip -C plugins kyos   # chat/Cowork: Customize → Plugins → Add → Upload plugin
```

## Tests

```powershell
npm test
```

## Pack check

```powershell
npm run pack:check
```

## Publishing

```powershell
npm publish --access public --tag latest
```
