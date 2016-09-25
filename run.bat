@echo off

setlocal enableDelayedExpansion
for /f "tokens=1* delims==" %%A in (run.properties) do (
  set name=%%A
  set "name=!name: =!"
  for /f "tokens=*" %%C in ("%%B") do @set "!name!=%%C"
)

start "RedisServer" /D bin redis-server.exe --port %REDIS_PORT%

cd app
rem npm is a cmd file itself hence we have to invoke it by `call`
call npm install
node app.js