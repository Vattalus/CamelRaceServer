:loop
pause
copy NUL unified.js
for /R src %%f in (.\*) do type "%%f" >> unified.js
java -jar closureCompiler.jar --js unified.js --js_output_file cloudScript-constricted.txt
goto loop
