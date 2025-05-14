[nix]
channel = "stable-23_05"

[env]
DATABASE_PROVIDER = "neon"
FORCE_NEON_DB = "true"
DISABLE_REPLIT_DB = "true"
OVERRIDE_DB_PROVIDER = "neon"
NODE_ENV = "production"
PORT = "3000"

[[hints]]
regex = "Error: MODULE_NOT_FOUND"
message = "We couldn't find needed packages, attempting to install them automatically..."

[[hints]]
regex = "Error: Cannot find module"
message = "We couldn't find that module. Make sure you have installed the correct package. Running 'npm install' might help."

[[hints]]
regex = "Address already in use"
message = "Port is already in use. The service might be already running."

[[hints]]
regex = "Error: Command failed: .*migrate-direct.cjs"
message = "The database migration failed. Check your database schema for issues."

[deployment]
run = ["sh", "-c", "PORT=3000 NODE_ENV=production DATABASE_PROVIDER=neon FORCE_NEON_DB=true DISABLE_REPLIT_DB=true OVERRIDE_DB_PROVIDER=neon node start-with-neon.sh"]
deploymentTarget = "cloudrun"
ignorePorts = false

[[ports]]
localPort = 3000
externalPort = 80

[interpreter]
command = ["bash", "-c", "PORT=3000 NODE_ENV=production DATABASE_PROVIDER=neon FORCE_NEON_DB=true DISABLE_REPLIT_DB=true OVERRIDE_DB_PROVIDER=neon ./start-with-neon.sh"]

[unitTest]
language = "nodejs"

[auth]
pageEnabled = false
buttonEnabled = false

[gitHubImport]
requiredFiles = [".replit", "replit.nix"]

[languages]

[languages.javascript]
pattern = "**/{*.js,*.jsx,*.ts,*.tsx}"

[languages.javascript.languageServer]
start = "typescript-language-server --stdio"

[languages.typescript]
pattern = "**/{*.ts,*.tsx}"

[languages.typescript.languageServer]
start = "typescript-language-server --stdio"

[debugger]
support = true

[debugger.interactive]
transport = "localhost:0"
startCommand = ["dap-node"]

[debugger.interactive.initializeMessage]
command = "initialize"
type = "request"

[debugger.interactive.initializeMessage.arguments]
clientID = "replit"
clientName = "replit.com"
columnsStartAt1 = true
linesStartAt1 = true
locale = "en-us"
pathFormat = "path"
supportsInvalidatedEvent = true
supportsProgressReporting = true
supportsRunInTerminalRequest = true
supportsVariablePaging = true
supportsVariableType = true

[debugger.interactive.launchMessage]
command = "launch"
type = "request"

[debugger.interactive.launchMessage.arguments]
console = "externalTerminal"
cwd = "."
pauseForSourceMap = false
program = "./index.js"
request = "launch"
sourceMaps = true
stopOnEntry = false
type = "pwa-node"

[packager]
language = "nodejs"

[packager.features]
packageSearch = true
guessImports = true
enabledForHosting = true