import fs from 'fs';

const content = fs.readFileSync('server/probate leads example.csv', 'utf-8');
const lines = content.split('\n');

// Parse CSV properly handling quoted values
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const headers = parseCSVLine(lines[0]);
const row1 = parseCSVLine(lines[1]);
const row2 = parseCSVLine(lines[2]);

console.log('=== TOTAL COLUMNS ===');
console.log('Total:', headers.length);

console.log('\n=== KEY COLUMN POSITIONS ===');
const keyColumns = [
  'STATUS',
  'lead_id',
  'property_address_full',
  'property_address_city',
  'property_address_state',
  'property_address_zipcode',
  'property_address_county',
  'estimated_value',
  'property_type',
  'sale_date',
  'owner_1_name',
  'contact_1_name',
  'contact_1_phone1',
  'contact_1_email1'
];

keyColumns.forEach(col => {
  const pos = headers.indexOf(col);
  if (pos !== -1) {
    console.log(`${pos.toString().padStart(3)}: ${col.padEnd(30)} = "${row1[pos]}"`);
  } else {
    console.log(`NOT FOUND: ${col}`);
  }
});

console.log('\n=== SECOND ROW FOR COMPARISON ===');
keyColumns.forEach(col => {
  const pos = headers.indexOf(col);
  if (pos !== -1 && row2[pos]) {
    console.log(`${col.padEnd(30)} = "${row2[pos]}"`);
  }
});
