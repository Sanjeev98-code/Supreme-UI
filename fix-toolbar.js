const fs = require('fs');
const path = require('path');

const files = ['employees.js', 'zones.js', 'branches.js', 'brands.js', 'reports.js', 'distribution.js'];

files.forEach(f => {
  const filePath = path.join(__dirname, 'src', 'pages', f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const regex = /<div class="table-toolbar">\s*<input type="text" class="search-input"([^>]+)>\s*<div style="display:flex;gap:0\.5rem;align-items:center">\s*<label([^>]+)>\s*<input type="checkbox"([^>]+)>\s*Show Purged\s*<\/label>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<\/div>\s*<\/div>/g;
  
  let newContent = content.replace(regex, (match, inputProps, labelProps, checkboxProps, spanText) => {
    return `<div class="table-toolbar" style="align-items:flex-start">
            <div>
              <input type="text" class="search-input"${inputProps}>
              <div style="font-size:12px;color:var(--text-muted);margin-top:0.4rem;padding-left:0.2rem">${spanText}</div>
            </div>
            <label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:0.4rem;cursor:pointer;margin-top:0.6rem">
              <input type="checkbox"${checkboxProps} /> Show Purged
            </label>
          </div>`;
  });

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log('Fixed ' + f);
  } else {
    console.log('No match found in ' + f);
  }
});
