import * as XLSX from 'xlsx';

/**
 * Excel Export Utilities for Brevo Analytics
 * Provides functions to export data to Excel with formatting
 */

/**
 * Export data to Excel file
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = (data, filename = 'brevo_export', sheetName = 'Data') => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Set column widths
  const colWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(key.length, 15)
  }));
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fullFilename);
};

/**
 * Export multiple sheets to Excel
 * @param {Array} sheets - Array of {name, data} objects
 * @param {string} filename - Name of the file (without extension)
 */
export const exportMultipleSheets = (sheets, filename = 'brevo_report') => {
  if (!sheets || sheets.length === 0) {
    alert('No data to export');
    return;
  }

  const wb = XLSX.utils.book_new();

  sheets.forEach(({ name, data }) => {
    if (data && data.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data);

      // Set column widths
      const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, name);
    }
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}.xlsx`;

  // Save file
  XLSX.writeFile(wb, fullFilename);
};

/**
 * Export campaign data with formatting
 * @param {Array} campaigns - Campaign data
 */
export const exportCampaigns = (campaigns) => {
  const formattedData = campaigns.map(campaign => ({
    'Campaign Name': campaign.campaign_name || campaign.name,
    'Subject': campaign.subject || '',
    'Sent Date': campaign.sent_date ? new Date(campaign.sent_date).toLocaleDateString() : '',
    'Sent': campaign.stats_sent || 0,
    'Delivered': campaign.stats_delivered || 0,
    'Opens': campaign.stats_unique_opens || 0,
    'Clicks': campaign.stats_unique_clicks || 0,
    'Open Rate': campaign.open_rate ? `${campaign.open_rate}%` : '0%',
    'Click Rate': campaign.click_rate ? `${campaign.click_rate}%` : '0%',
    'Bounces': (campaign.stats_hard_bounces || 0) + (campaign.stats_soft_bounces || 0),
    'Unsubscribes': campaign.stats_unsubscribes || 0
  }));

  exportToExcel(formattedData, 'brevo_campaigns', 'Campaigns');
};

/**
 * Export contact data
 * @param {Array} contacts - Contact data
 */
export const exportContacts = (contacts) => {
  const formattedData = contacts.map(contact => ({
    'Email': contact.email,
    'Name': `${contact.attributes?.FIRSTNAME || ''} ${contact.attributes?.LASTNAME || ''}`.trim() || 'N/A',
    'Lists': Array.isArray(contact.list_ids) ? contact.list_ids.length : 0,
    'Blacklisted': contact.email_blacklisted ? 'Yes' : 'No',
    'Created': contact.created_at_brevo ? new Date(contact.created_at_brevo).toLocaleDateString() : '',
    'Modified': contact.modified_at_brevo ? new Date(contact.modified_at_brevo).toLocaleDateString() : '',
    'Score': contact.score || 0,
    'Tier': contact.tier || 'N/A'
  }));

  exportToExcel(formattedData, 'brevo_contacts', 'Contacts');
};

/**
 * Export list data
 * @param {Array} lists - List data
 */
export const exportLists = (lists) => {
  const formattedData = lists.map(list => ({
    'List Name': list.name,
    'Total Contacts': list.total_contacts || 0,
    'Total Blacklisted': list.total_blacklisted || 0,
    'Unique Subscribers': list.unique_subscribers || 0,
    'Folder': list.folder_name || 'Root',
    'Created': list.created_at_brevo ? new Date(list.created_at_brevo).toLocaleDateString() : ''
  }));

  exportToExcel(formattedData, 'brevo_lists', 'Lists');
};

/**
 * Export event log data
 * @param {Array} events - Event log data
 */
export const exportEvents = (events) => {
  const formattedData = events.map(event => ({
    'Email': event.email,
    'Campaign': event.campaign_name || 'N/A',
    'Event Type': event.opened_at && event.clicked_at ? 'Opened & Clicked' :
                  event.clicked_at ? 'Clicked' :
                  event.opened_at ? 'Opened' : 'Unknown',
    'Opened At': event.opened_at ? new Date(event.opened_at).toLocaleString() : '-',
    'Clicked At': event.clicked_at ? new Date(event.clicked_at).toLocaleString() : '-',
    'Received': event.created_at ? new Date(event.created_at).toLocaleString() : ''
  }));

  exportToExcel(formattedData, 'brevo_events', 'Events');
};

/**
 * Export comprehensive analytics report with multiple sheets
 * @param {Object} data - Object containing campaigns, contacts, lists, stats
 */
export const exportFullReport = (data) => {
  const sheets = [];

  // Overview sheet
  if (data.stats) {
    sheets.push({
      name: 'Overview',
      data: [{
        'Metric': 'Total Campaigns',
        'Value': data.stats.total_campaigns || 0
      }, {
        'Metric': 'Total Contacts',
        'Value': data.stats.total_contacts || 0
      }, {
        'Metric': 'Total Lists',
        'Value': data.stats.total_lists || 0
      }, {
        'Metric': 'Total Opens',
        'Value': data.stats.total_opens || 0
      }, {
        'Metric': 'Total Clicks',
        'Value': data.stats.total_clicks || 0
      }, {
        'Metric': 'Average Open Rate',
        'Value': data.stats.avg_open_rate ? `${data.stats.avg_open_rate}%` : '0%'
      }, {
        'Metric': 'Average Click Rate',
        'Value': data.stats.avg_click_rate ? `${data.stats.avg_click_rate}%` : '0%'
      }]
    });
  }

  // Campaigns sheet
  if (data.campaigns && data.campaigns.length > 0) {
    sheets.push({
      name: 'Campaigns',
      data: data.campaigns.map(campaign => ({
        'Campaign Name': campaign.campaign_name || campaign.name,
        'Subject': campaign.subject || '',
        'Sent Date': campaign.sent_date ? new Date(campaign.sent_date).toLocaleDateString() : '',
        'Sent': campaign.stats_sent || 0,
        'Delivered': campaign.stats_delivered || 0,
        'Opens': campaign.stats_unique_opens || 0,
        'Clicks': campaign.stats_unique_clicks || 0,
        'Open Rate': campaign.open_rate ? `${campaign.open_rate}%` : '0%',
        'Click Rate': campaign.click_rate ? `${campaign.click_rate}%` : '0%'
      }))
    });
  }

  // Contacts sheet
  if (data.contacts && data.contacts.length > 0) {
    sheets.push({
      name: 'Contacts',
      data: data.contacts.map(contact => ({
        'Email': contact.email,
        'Score': contact.score || 0,
        'Tier': contact.tier || 'N/A',
        'Lists': Array.isArray(contact.list_ids) ? contact.list_ids.length : 0,
        'Blacklisted': contact.email_blacklisted ? 'Yes' : 'No'
      }))
    });
  }

  // Lists sheet
  if (data.lists && data.lists.length > 0) {
    sheets.push({
      name: 'Lists',
      data: data.lists.map(list => ({
        'List Name': list.name,
        'Total Contacts': list.total_contacts || 0,
        'Blacklisted': list.total_blacklisted || 0,
        'Unique Subscribers': list.unique_subscribers || 0
      }))
    });
  }

  exportMultipleSheets(sheets, 'brevo_full_report');
};

export default {
  exportToExcel,
  exportMultipleSheets,
  exportCampaigns,
  exportContacts,
  exportLists,
  exportEvents,
  exportFullReport
};
