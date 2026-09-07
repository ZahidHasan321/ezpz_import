# EZPZ question import kit

Needs Node.js 20 or newer. Nothing to install.

1. Read GUIDE.md. It has every field, the null rules, the chapter paths, the
   institution names, and a prompt for an AI.
2. Write your JSON. Start from samples/good.json.
3. Check it:

       node check.cjs yourfile.json
       node check.cjs yourfile.json --assets figures/
       node check.cjs --hash figures/diagram.png

   Zero errors means the file is ready to send. Warnings are fine.
4. Send the JSON and the figures folder together.

samples/bad.json shows what the checker rejects.
