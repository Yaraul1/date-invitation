const SHEET_NAME = 'Ответы';

function getResponsesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Дата ответа',
      'Формат',
      'Деталь',
      'Когда удобно',
      'Комментарий',
      'ID'
    ]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse({ ok: true, message: 'Сервис ответов работает' });
}

function doPost(event) {
  try {
    const data = JSON.parse(event.postData.contents || '{}');
    const sheet = getResponsesSheet();

    sheet.appendRow([
      new Date(),
      data.format || '',
      data.detail || '',
      data.when || '',
      data.note || '',
      data.id || ''
    ]);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}
