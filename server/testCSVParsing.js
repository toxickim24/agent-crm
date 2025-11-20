import fs from 'fs';

// Parse CSV line properly handling quoted values
const parseCSVLine = (line) => {
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
};

// Clean and format data values
const cleanValue = (value, fieldType) => {
  if (!value || value === '' || value === '-') return '';

  switch (fieldType) {
    case 'estimated_value':
      return value.replace(/[$,]/g, '').trim();

    case 'sale_date':
      if (value.includes('/')) {
        const parts = value.split('/');
        if (parts.length === 3) {
          const [month, day, year] = parts;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
      return value;

    case 'status':
      const statusMap = {
        'processed': 'new',
        'failed': 'new',
        'new prospect': 'new',
        'contacted': 'contacted',
        'qualified': 'qualified',
        'negotiating': 'negotiating',
        'closed': 'closed'
      };
      return statusMap[value.toLowerCase()] || 'new';

    default:
      return value;
  }
};

const content = fs.readFileSync('server/probate leads example.csv', 'utf-8');
const lines = content.split('\n').filter(line => line.trim());
const headers = parseCSVLine(lines[0]);

console.log('=== CSV PARSING TEST ===\n');
console.log('Total rows:', lines.length - 1);
console.log('Total columns:', headers.length);

// Test first 3 rows
for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
  const values = parseCSVLine(lines[i]);

  console.log(`\n=== ROW ${i} ===`);
  console.log('lead_id:', values[2]);
  console.log('property_address_full:', values[3]);
  console.log('property_address_city:', values[6]);
  console.log('property_address_state:', values[7]);
  console.log('property_address_zipcode:', values[8]);
  console.log('property_address_county:', values[9]);
  console.log('estimated_value (raw):', values[21]);
  console.log('estimated_value (cleaned):', cleanValue(values[21], 'estimated_value'));
  console.log('property_type:', values[40]);
  console.log('sale_date (raw):', values[101]);
  console.log('sale_date (cleaned):', cleanValue(values[101], 'sale_date'));
  console.log('owner_1_name:', values[27]);
  console.log('contact_1_name:', values[115] || '(empty - fallback to owner)');
  console.log('contact_1_phone1:', values[117]);
  console.log('contact_1_email1:', values[123]);
  console.log('status (raw):', values[0]);
  console.log('status (cleaned):', cleanValue(values[0], 'status'));
}

console.log('\n=== MAPPING TEST ===');
const columnMapping = {
  'lead_id': 'lead_id',
  'property_address_full': 'property_address_full',
  'property_address_city': 'property_address_city',
  'property_address_state': 'property_address_state',
  'property_address_zipcode': 'property_address_zipcode',
  'property_address_county': 'property_address_county',
  'estimated_value': 'estimated_value',
  'property_type': 'property_type',
  'sale_date': 'sale_date',
  'contact_1_name': 'contact_1_name',
  'contact_1_phone1': 'contact_1_phone1',
  'contact_1_email1': 'contact_1_email1',
  'status': 'STATUS'
};

const row1 = parseCSVLine(lines[1]);
const contact = {};

Object.keys(columnMapping).forEach(dbField => {
  const csvHeader = columnMapping[dbField];
  const csvIndex = headers.indexOf(csvHeader);
  if (csvIndex !== -1 && row1[csvIndex]) {
    contact[dbField] = cleanValue(row1[csvIndex], dbField);
  }
});

// Fallback for contact name
if (!contact.contact_1_name) {
  const ownerNameIndex = headers.indexOf('owner_1_name');
  if (ownerNameIndex !== -1 && row1[ownerNameIndex]) {
    contact.contact_1_name = row1[ownerNameIndex];
  }
}

console.log('\nMapped Contact Object:');
console.log(JSON.stringify(contact, null, 2));
