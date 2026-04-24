const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const configPath = path.join(appData, 'whatsapp-report-manager', 'config.json');

if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const excelPath = config.dataPath;
  
  if (excelPath && fs.existsSync(excelPath)) {
    try {
      const wb = XLSX.readFile(excelPath);
      if (wb.SheetNames.includes('Employees')) {
        let rows = XLSX.utils.sheet_to_json(wb.Sheets['Employees'], { defval: '' });
        
        let newRows = rows.map(r => ({
          EmployeeName: r.EmployeeName || '',
          StaffCode: r.StaffCode || '',
          Role: r.Role || '',
          Brand: r.Brand || '',
          Mobile: r.Mobile || '',
          Email: r.Email || '',
          Status: r.Status || 'Active'
        }));
        
        const worksheet = XLSX.utils.json_to_sheet(newRows);
        wb.Sheets['Employees'] = worksheet;
        XLSX.writeFile(wb, excelPath);
        console.log('Success: Reordered columns for Employees sheet.');
      } else {
        console.log('Employees sheet not found.');
      }
    } catch (e) {
      console.log('Error modifying Excel file: ', e.message);
    }
  } else {
    console.log('Excel file not found at: ' + excelPath);
  }
} else {
  console.log('Config file not found.');
}
