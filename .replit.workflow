[languages.typescript]
pattern = "**/{*.ts,*.tsx}"
syntax = "typescript"

[languages.typescript.languageServer]
start = [ "typescript-language-server", "--stdio" ]

[nix]
channel = "stable-23_05"

[gitHubImport]
requiredFiles = [".replit", "replit.nix", ".config"]

[deployment]
run = ["sh", "-c", "NODE_ENV=production PORT=3000 DATABASE_PROVIDER=replit node start-unified.js"]
deploymentTarget = "cloudrun"
ignorePorts = false

[[ports]]
localPort = 3000
externalPort = 80

[[ports]]
localPort = 5432
externalPort = 3000
exposeLocalhost = true

[env]
DATABASE_PROVIDER = "replit"
NODE_ENV = "production"
PORT = "3000"

[packager]
language = "nodejs"
ignoredPaths = [".git", ".github", ".vscode", "node_modules"]

  [packager.features]
  packageSearch = true
  guessImports = true
  enabledForHosting = false

[languages]

[languages.javascript]
pattern = "**/{*.js,*.jsx,*.ts,*.tsx}"

  [languages.javascript.languageServer]
  start = ["typescript-language-server", "--stdio"]

[languages.css]
pattern = "**/{*.less,*.scss,*.css}"

  [languages.css.languageServer]
  start = [ "vscode-css-language-server", "--stdio" ]

[auth]
pageEnabled = false
buttonEnabled = false

[[runners]]
name = "Start with Replit DB"
fileType = "javascript"
command = "DATABASE_PROVIDER=replit npx tsx server/index.ts"

[[runners]]
name = "Migrate to Replit DB"
fileType = "javascript"
command = "node migrate-replit-db.mjs"

[[runners]]
name = "Start with Neon DB"
fileType = "javascript"
command = "DATABASE_PROVIDER=neon npx tsx server/index.ts"

[[runners]]
name = "Check Database Status"
fileType = "javascript"
command = "node db-status.js"